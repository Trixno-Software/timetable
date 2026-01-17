#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Let's Encrypt SSL Setup Script ===${NC}"
echo ""

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Domain name is required${NC}"
    echo "Usage: ./scripts/setup-ssl.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1
PROJECT_DIR=$(pwd)

echo -e "${YELLOW}Setting up SSL for: ${DOMAIN}${NC}"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}This script needs sudo privileges for certbot${NC}"
fi

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing certbot...${NC}"
    sudo apt update
    sudo apt install -y certbot
fi

# Stop nginx to free port 80
echo -e "${YELLOW}Stopping nginx container...${NC}"
docker-compose -f docker-compose.prod.yml stop nginx || true

# Request certificate
echo -e "${YELLOW}Requesting SSL certificate...${NC}"
sudo certbot certonly --standalone \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    --non-interactive \
    --agree-tos \
    --email admin@${DOMAIN} \
    || {
        echo -e "${RED}Certbot failed. Make sure:${NC}"
        echo "  1. Domain DNS is pointing to this server"
        echo "  2. Port 80 is open and not in use"
        echo "  3. You have a valid email address"
        exit 1
    }

# Create SSL directory
echo -e "${YELLOW}Setting up SSL certificates...${NC}"
mkdir -p nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem nginx/ssl/

# Set permissions
sudo chown -R $USER:$USER nginx/ssl
chmod 644 nginx/ssl/*.pem

# Update nginx configuration for SSL
echo -e "${YELLOW}Enabling SSL in nginx configuration...${NC}"

# Backup original config
cp nginx/nginx.conf nginx/nginx.conf.backup

# Create SSL-enabled nginx config
cat > nginx/nginx.conf << 'NGINX_CONFIG'
events {
    worker_connections 512;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

    # Upstream servers
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # HTTP - Redirect to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        client_max_body_size 10M;

        # Health check
        location /health {
            return 200 'healthy';
            add_header Content-Type text/plain;
        }

        # API requests
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
        }

        # Django admin
        location /admin/ {
            limit_req zone=api burst=10 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /var/www/static/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Frontend
        location / {
            limit_req zone=general burst=50 nodelay;
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
NGINX_CONFIG

# Restart all services
echo -e "${YELLOW}Restarting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Test HTTPS
echo -e "${YELLOW}Testing HTTPS...${NC}"
if curl -sSf https://${DOMAIN}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ HTTPS is working!${NC}"
else
    echo -e "${YELLOW}HTTPS test inconclusive. Please verify manually.${NC}"
fi

# Setup auto-renewal cron job
echo -e "${YELLOW}Setting up SSL auto-renewal...${NC}"
CRON_CMD="0 0 1 * * certbot renew --pre-hook 'docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml stop nginx' --post-hook 'cp /etc/letsencrypt/live/${DOMAIN}/*.pem ${PROJECT_DIR}/nginx/ssl/ && docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml start nginx'"

# Check if cron job already exists
(sudo crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | sudo crontab -

echo ""
echo -e "${GREEN}=== SSL Setup Complete ===${NC}"
echo ""
echo "Your site is now available at:"
echo "  - https://${DOMAIN}"
echo "  - https://www.${DOMAIN}"
echo ""
echo "SSL certificates will auto-renew monthly."
echo ""
echo -e "${YELLOW}Don't forget to update .env.prod:${NC}"
echo "  CORS_ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}"
echo "  NEXT_PUBLIC_API_URL=https://${DOMAIN}/api/v1"
echo ""
echo "Then restart: docker-compose -f docker-compose.prod.yml restart"
