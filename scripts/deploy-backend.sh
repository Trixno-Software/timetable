#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Backend-Only Deployment Script ===${NC}"
echo -e "${YELLOW}Frontend should be deployed on AWS Amplify${NC}"
echo ""

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo -e "${RED}Error: .env.prod file not found!${NC}"
    echo "Copy .env.prod.example to .env.prod and configure it first."
    exit 1
fi

# Load environment variables
export $(cat .env.prod | grep -v '^#' | xargs)

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Docker is installed
if ! command_exists docker; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Clean up to save space
echo -e "${YELLOW}Cleaning up old Docker resources...${NC}"
docker system prune -f

echo -e "${YELLOW}Pulling latest code...${NC}"
git pull origin main || true

echo -e "${YELLOW}Building backend Docker image...${NC}"
docker-compose -f docker-compose.backend.yml build --no-cache backend

echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f docker-compose.backend.yml down

echo -e "${YELLOW}Starting services...${NC}"
docker-compose -f docker-compose.backend.yml up -d

echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 15

echo -e "${YELLOW}Checking service status...${NC}"
docker-compose -f docker-compose.backend.yml ps

# Test health endpoint
echo ""
echo -e "${YELLOW}Testing API health...${NC}"
if curl -s http://localhost/api/v1/health/ | grep -q "healthy"; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${YELLOW}API health check pending - may need more time to start${NC}"
fi

echo ""
echo -e "${GREEN}=== Backend Deployment Complete ===${NC}"
echo ""
echo "API running at:"
echo "  - API: http://your-ec2-ip/api/v1/"
echo "  - Admin: http://your-ec2-ip/admin/"
echo "  - Docs: http://your-ec2-ip/api/docs/"
echo "  - Health: http://your-ec2-ip/health"
echo ""
echo "To view logs: docker-compose -f docker-compose.backend.yml logs -f"
echo "To stop: docker-compose -f docker-compose.backend.yml down"
echo ""
echo -e "${YELLOW}Next: Deploy frontend to AWS Amplify${NC}"
echo "Set NEXT_PUBLIC_API_URL=https://your-ec2-domain/api/v1 in Amplify"
