#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Timetable Deployment Script ===${NC}"

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

echo -e "${YELLOW}Pulling latest code...${NC}"
git pull origin main || true

echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down

echo -e "${YELLOW}Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

echo -e "${YELLOW}Checking service status...${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Services running at:"
echo "  - Frontend: http://localhost"
echo "  - Backend API: http://localhost/api/v1/"
echo "  - Admin: http://localhost/admin/"
echo ""
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop: docker-compose -f docker-compose.prod.yml down"
