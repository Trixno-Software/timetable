#!/bin/bash
set -e

# EC2 Ubuntu Setup Script for t3.micro
# Run this on a fresh Ubuntu 22.04 EC2 instance

echo "=== EC2 Setup Script for Timetable App ==="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER

# Install useful tools
echo "Installing additional tools..."
sudo apt install -y git htop curl wget nano

# Setup swap (important for t3.micro with 1GB RAM)
echo "Setting up 2GB swap space..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize for low memory
echo "Optimizing system for low memory..."
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Setup firewall
echo "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Show status
echo ""
echo "=== Setup Complete ==="
echo ""
echo "IMPORTANT: Log out and log back in for docker group to take effect"
echo ""
echo "Next steps:"
echo "1. Log out: exit"
echo "2. SSH back in"
echo "3. Clone your repo: git clone <your-repo-url>"
echo "4. cd into your project"
echo "5. Copy .env.prod.example to .env.prod and configure"
echo "6. Run: ./scripts/deploy.sh"
echo ""
echo "Memory status:"
free -h
echo ""
echo "Swap status:"
swapon --show
