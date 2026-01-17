# AWS EC2 Deployment Guide

Complete guide to deploy the Timetable Generator on AWS EC2 (t3.micro optimized).

## Prerequisites

- AWS Account with EC2 access
- Domain name (optional but recommended for SSL)
- SSH key pair for EC2 access
- Git repository URL of this project

---

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Configure:
   - **Name:** `timetable-app`
   - **AMI:** Ubuntu Server 22.04 LTS (64-bit x86)
   - **Instance type:** `t3.micro` (1 vCPU, 1GB RAM) - Free tier eligible
   - **Key pair:** Create new or select existing
   - **Network settings:**
     - Allow SSH traffic from your IP
     - Allow HTTP traffic from the internet
     - Allow HTTPS traffic from the internet
   - **Storage:** 20 GB gp3 (minimum recommended)

3. Click "Launch instance"

### 1.2 Configure Security Group

Ensure your security group has these inbound rules:

| Type  | Port | Source    | Description |
|-------|------|-----------|-------------|
| SSH   | 22   | Your IP   | SSH access  |
| HTTP  | 80   | 0.0.0.0/0 | Web traffic |
| HTTPS | 443  | 0.0.0.0/0 | SSL traffic |

### 1.3 Allocate Elastic IP (Recommended)

1. Go to EC2 → Elastic IPs → Allocate Elastic IP address
2. Associate it with your instance
3. Note down this IP - it won't change on instance restart

---

## Step 2: Initial Server Setup

### 2.1 Connect to EC2

```bash
# Replace with your key file and EC2 IP
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

### 2.2 Run Setup Script

```bash
# Clone the repository first
git clone https://github.com/your-repo/timetable.git
cd timetable

# Make setup script executable and run
chmod +x scripts/setup-ec2.sh
./scripts/setup-ec2.sh
```

**Important:** Log out and log back in after setup for Docker group to take effect:

```bash
exit
# SSH back in
ssh -i "your-key.pem" ubuntu@your-ec2-ip
cd timetable
```

### 2.3 Verify Docker Installation

```bash
docker --version
docker-compose --version
```

---

## Step 3: Configure Environment

### 3.1 Create Production Environment File

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

### 3.2 Configure Environment Variables

```bash
# Django Settings
DEBUG=False
SECRET_KEY=your-very-secure-secret-key-min-50-chars
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,your-ec2-ip

# Database (using Docker PostgreSQL)
DB_NAME=timetable
DB_USER=postgres
DB_PASSWORD=your-secure-database-password-here
DB_HOST=db
DB_PORT=5432

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,http://your-ec2-ip

# Frontend API URL
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1

# Redis
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

### 3.3 Generate a Secure Secret Key

```bash
# Generate a secure secret key
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## Step 4: Deploy Application

### 4.1 Run Deployment Script

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 4.2 Verify Deployment

```bash
# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# View logs if needed
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl http://localhost/api/v1/health/
```

### 4.3 Create Superuser

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

---

## Step 5: Setup SSL with Let's Encrypt

### 5.1 Point Domain to EC2

1. Go to your domain registrar (Route53, GoDaddy, Namecheap, etc.)
2. Create A record pointing to your EC2 Elastic IP:
   - `yourdomain.com` → `your-ec2-ip`
   - `www.yourdomain.com` → `your-ec2-ip`

### 5.2 Install Certbot

```bash
sudo apt install certbot -y
```

### 5.3 Stop Nginx Temporarily

```bash
docker-compose -f docker-compose.prod.yml stop nginx
```

### 5.4 Generate SSL Certificates

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

### 5.5 Copy Certificates

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Set permissions
sudo chown -R $USER:$USER nginx/ssl
chmod 644 nginx/ssl/*.pem
```

### 5.6 Enable SSL in Nginx Config

Edit `nginx/nginx.conf` and uncomment the SSL server block:

```bash
nano nginx/nginx.conf
```

Find and uncomment the HTTPS section (lines with `# SSL Configuration`).

### 5.7 Restart Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5.8 Setup Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
# Add this line:
0 0 1 * * certbot renew --pre-hook "docker-compose -f /home/ubuntu/timetable/docker-compose.prod.yml stop nginx" --post-hook "cp /etc/letsencrypt/live/yourdomain.com/*.pem /home/ubuntu/timetable/nginx/ssl/ && docker-compose -f /home/ubuntu/timetable/docker-compose.prod.yml start nginx"
```

---

## Step 6: Update .env.prod for HTTPS

After SSL is configured, update your environment:

```bash
nano .env.prod
```

Change:
```bash
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
```

Restart:
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

---

## Common Operations

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Update Application

```bash
# Pull latest code and redeploy
./scripts/deploy.sh
```

### Database Operations

```bash
# Run migrations manually
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Access Django shell
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell

# Access PostgreSQL
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d timetable
```

### Backup Database

```bash
# Backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres timetable > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres -d timetable
```

### Monitor Resources

```bash
# Check memory usage
free -h

# Check Docker stats
docker stats

# Check disk usage
df -h
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common issues:
# - Missing .env.prod file
# - Database not ready (wait and retry)
# - Port already in use
```

### Out of Memory

```bash
# Check memory
free -h

# If swap is not enabled, enable it:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Database Connection Failed

```bash
# Check if db container is healthy
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose -f docker-compose.prod.yml logs frontend

# Verify NEXT_PUBLIC_API_URL is correct in .env.prod
```

### 502 Bad Gateway

```bash
# Usually means backend is not ready
# Check backend health
curl http://localhost:8000/api/v1/health/

# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend
```

---

## Security Checklist

- [ ] Change default database password
- [ ] Generate secure Django SECRET_KEY
- [ ] Enable SSL/HTTPS
- [ ] Restrict SSH to your IP only
- [ ] Keep system updated (`sudo apt update && sudo apt upgrade`)
- [ ] Setup automated backups
- [ ] Enable CloudWatch monitoring (optional)

---

## Architecture

```
Internet
    │
    ▼
┌─────────┐
│  Nginx  │ ← Port 80/443
│(Reverse │
│ Proxy)  │
└────┬────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌─────────┐      ┌──────────┐
│ Backend │      │ Frontend │
│ (Django)│      │ (Next.js)│
│ :8000   │      │  :3000   │
└────┬────┘      └──────────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌─────────┐      ┌─────────┐
│PostgreSQL│      │  Redis  │
│  :5432  │      │  :6379  │
└─────────┘      └─────────┘
```

---

## Support

For issues, check:
1. Application logs: `docker-compose -f docker-compose.prod.yml logs`
2. System resources: `htop`, `free -h`, `df -h`
3. Docker status: `docker ps`, `docker stats`
