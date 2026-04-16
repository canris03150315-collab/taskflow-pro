#!/bin/bash
# ============================================================
# TaskFlow Pro - Droplet Setup Script
# Run on a fresh DigitalOcean Ubuntu 24.04 Droplet
# Usage: curl -sSL <url> | bash  OR  bash setup-droplet.sh
# ============================================================
set -e

echo "============================================"
echo "  TaskFlow Pro - Droplet Setup"
echo "============================================"
echo ""

# --- 1. Install Docker ---
if ! command -v docker &> /dev/null; then
    echo "[1/4] Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "  Docker installed successfully."
else
    echo "[1/4] Docker already installed. Skipping."
fi

# --- 2. Create application directory ---
echo "[2/4] Setting up /opt/taskflow..."
mkdir -p /opt/taskflow
cd /opt/taskflow

# --- 3. Create docker-compose file ---
echo "[3/4] Creating docker-compose.yml..."
cat > /opt/taskflow/docker-compose.yml << 'COMPOSE_EOF'
version: "3.8"

services:
  taskflow:
    image: taskflow-pro:latest
    ports:
      - "80:80"
    env_file:
      - .env
    volumes:
      - taskflow_data:/app/backend/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/api/health", "||", "exit", "1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

volumes:
  taskflow_data:
COMPOSE_EOF

# --- 4. Configure environment ---
echo "[4/4] Configuring environment..."

if [ -f /opt/taskflow/.env ]; then
    echo "  .env file already exists. Keeping existing configuration."
    echo "  Edit with: nano /opt/taskflow/.env"
else
    echo ""
    echo "  Select instance mode:"
    echo "    1) central  - Central hub (central.wuk-on.com)"
    echo "    2) subsidiary - Subsidiary instance"
    echo ""
    read -p "  Enter choice [1/2]: " MODE_CHOICE

    if [ "$MODE_CHOICE" = "1" ]; then
        INSTANCE_MODE="central"
    else
        INSTANCE_MODE="subsidiary"
        read -p "  Enter SERVICE_TOKEN for this subsidiary: " SERVICE_TOKEN_INPUT
    fi

    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -hex 32)

    read -p "  Enter GEMINI_API_KEY (or press Enter to skip): " GEMINI_KEY_INPUT

    cat > /opt/taskflow/.env << ENV_EOF
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
GEMINI_API_KEY=${GEMINI_KEY_INPUT:-CHANGE_ME}
INSTANCE_MODE=${INSTANCE_MODE}
SERVICE_TOKEN=${SERVICE_TOKEN_INPUT:-}
ENV_EOF

    chmod 600 /opt/taskflow/.env
    echo "  .env created at /opt/taskflow/.env"
fi

# --- Configure firewall ---
echo ""
echo "Configuring firewall..."
ufw allow 22/tcp   > /dev/null 2>&1 || true
ufw allow 80/tcp   > /dev/null 2>&1 || true
ufw --force enable  > /dev/null 2>&1 || true
echo "  Firewall configured (SSH + HTTP)."

# --- Done ---
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "  Directory:  /opt/taskflow"
echo "  Config:     /opt/taskflow/.env"
echo "  Compose:    /opt/taskflow/docker-compose.yml"
echo ""
echo "  Next steps:"
echo "    1. Transfer the Docker image (taskflow-pro.tar.gz)"
echo "    2. Load it:  docker load < taskflow-pro.tar.gz"
echo "    3. Start:    cd /opt/taskflow && docker compose up -d"
echo "    4. Check:    docker compose ps"
echo ""
echo "  Or use deploy.sh from your local machine for automated deployment."
echo ""
