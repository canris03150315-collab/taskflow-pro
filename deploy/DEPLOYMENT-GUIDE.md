# TaskFlow Pro - Multi-Company Deployment Guide

## Architecture Overview

```
                    Cloudflare (SSL + Proxy)
                           |
        +------------------+------------------+
        |                  |                  |
   central.wuk-on.com  alpha.wuk-on.com  bravo/charlie.wuk-on.com
        |                  |                  |
   [DO Droplet]       [DO Droplet]       [DO Droplet]
   INSTANCE_MODE=     INSTANCE_MODE=     INSTANCE_MODE=
     central           subsidiary          subsidiary
```

- **Domain**: wuk-on.com (managed on Cloudflare)
- **4 Droplets**: $6/month each (1GB RAM, Ubuntu 24.04, Singapore region)
- **SSL**: Handled by Cloudflare Proxy (orange cloud) -- no certs on Droplets
- **Each Droplet**: Single Docker container running nginx + Node.js backend

---

## Step 1: Create DigitalOcean Droplets

Create 4 Droplets with these settings:

| Name | Subdomain | Spec | Region |
|------|-----------|------|--------|
| taskflow-central | central.wuk-on.com | $6/month (1GB RAM) | Singapore (sgp1) |
| taskflow-alpha | alpha.wuk-on.com | $6/month (1GB RAM) | Singapore (sgp1) |
| taskflow-bravo | bravo.wuk-on.com | $6/month (1GB RAM) | Singapore (sgp1) |
| taskflow-charlie | charlie.wuk-on.com | $6/month (1GB RAM) | Singapore (sgp1) |

**Image**: Ubuntu 24.04 LTS
**Authentication**: SSH key (add your public key)

Note the IP address of each Droplet after creation.

---

## Step 2: Configure Cloudflare DNS

In Cloudflare dashboard for `wuk-on.com`, create A records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | central | `<central-droplet-IP>` | Proxied (orange cloud) |
| A | alpha | `<alpha-droplet-IP>` | Proxied (orange cloud) |
| A | bravo | `<bravo-droplet-IP>` | Proxied (orange cloud) |
| A | charlie | `<charlie-droplet-IP>` | Proxied (orange cloud) |

**Cloudflare SSL/TLS settings**:
- SSL mode: **Full** (not Full Strict, since we use HTTP on the Droplet)
- Minimum TLS: 1.2
- Always Use HTTPS: ON

---

## Step 3: Setup Each Droplet

SSH into each Droplet and run the setup script:

```bash
# From your local machine, copy the setup script
scp deploy/setup-droplet.sh root@central.wuk-on.com:/tmp/
ssh root@central.wuk-on.com "bash /tmp/setup-droplet.sh"
```

The script will:
1. Install Docker and Docker Compose
2. Create `/opt/taskflow` directory
3. Generate a `docker-compose.yml`
4. Prompt you to configure `.env`

Repeat for each Droplet (alpha, bravo, charlie).

---

## Step 4: Configure Environment on Each Droplet

If you skipped the interactive setup, manually create `.env`:

### Central Hub (central.wuk-on.com)

```bash
ssh root@central.wuk-on.com
cat > /opt/taskflow/.env << 'EOF'
NODE_ENV=production
JWT_SECRET=<generate-with: openssl rand -hex 32>
GEMINI_API_KEY=<your-gemini-api-key>
INSTANCE_MODE=central
EOF
chmod 600 /opt/taskflow/.env
```

### Subsidiaries (alpha, bravo, charlie)

```bash
ssh root@alpha.wuk-on.com
cat > /opt/taskflow/.env << 'EOF'
NODE_ENV=production
JWT_SECRET=<generate-with: openssl rand -hex 32>
GEMINI_API_KEY=<your-gemini-api-key>
INSTANCE_MODE=subsidiary
SERVICE_TOKEN=<unique-token-for-this-subsidiary>
EOF
chmod 600 /opt/taskflow/.env
```

**Important**: Each Droplet MUST have a unique `JWT_SECRET`. Generate with:
```bash
openssl rand -hex 32
```

---

## Step 5: Deploy

### Option A: Automated deploy from local machine

```bash
# Make deploy script executable
chmod +x deploy/deploy.sh

# Deploy to each instance
./deploy/deploy.sh central
./deploy/deploy.sh alpha
./deploy/deploy.sh bravo
./deploy/deploy.sh charlie
```

The script builds the Docker image locally, transfers it to the Droplet, and starts the container.

### Option B: Manual deploy

```bash
# 1. Build image locally
docker build -t taskflow-pro:latest .

# 2. Save and transfer
docker save taskflow-pro:latest | gzip > taskflow-pro.tar.gz
scp taskflow-pro.tar.gz root@central.wuk-on.com:/opt/taskflow/

# 3. On the Droplet
ssh root@central.wuk-on.com
cd /opt/taskflow
docker load < taskflow-pro.tar.gz
docker compose up -d
rm taskflow-pro.tar.gz
```

---

## Step 6: Register Subsidiaries in Central Hub

1. Open `https://central.wuk-on.com` in your browser
2. Log in as admin
3. Navigate to the subsidiary management section
4. Register each subsidiary:
   - **Alpha**: URL = `https://alpha.wuk-on.com`, Token = `<alpha's SERVICE_TOKEN>`
   - **Bravo**: URL = `https://bravo.wuk-on.com`, Token = `<bravo's SERVICE_TOKEN>`
   - **Charlie**: URL = `https://charlie.wuk-on.com`, Token = `<charlie's SERVICE_TOKEN>`

---

## Step 7: Verify Everything Works

### Check container status on each Droplet

```bash
ssh root@central.wuk-on.com "cd /opt/taskflow && docker compose ps"
ssh root@alpha.wuk-on.com "cd /opt/taskflow && docker compose ps"
```

### Check health endpoints

```bash
curl https://central.wuk-on.com/api/health
curl https://alpha.wuk-on.com/api/health
curl https://bravo.wuk-on.com/api/health
curl https://charlie.wuk-on.com/api/health
```

### Check logs

```bash
ssh root@central.wuk-on.com "cd /opt/taskflow && docker compose logs --tail=50"
```

---

## Ongoing Operations

### View logs
```bash
ssh root@alpha.wuk-on.com "cd /opt/taskflow && docker compose logs -f"
```

### Restart a service
```bash
ssh root@alpha.wuk-on.com "cd /opt/taskflow && docker compose restart"
```

### Update deployment
```bash
./deploy/deploy.sh alpha   # Rebuilds and redeploys
```

### Backup database
```bash
# On the Droplet
ssh root@alpha.wuk-on.com
docker compose exec taskflow sh -c "cp /app/backend/data/taskflow.db /app/backend/data/backups/taskflow-\$(date +%Y%m%d).db"

# Download backup to local
scp root@alpha.wuk-on.com:/opt/taskflow/data/taskflow.db ./backups/alpha-backup.db
```

Note: The database volume is persisted in the `taskflow_data` Docker volume. Even if the container is removed and recreated, data is preserved.

### Access the Docker volume data directly
```bash
docker volume inspect taskflow_data
# Shows the mount point, typically /var/lib/docker/volumes/taskflow_taskflow_data/_data
```

---

## Cost Summary

| Item | Monthly Cost |
|------|-------------|
| 4x DigitalOcean Droplets ($6 each) | $24 |
| Cloudflare (Free plan) | $0 |
| Domain (wuk-on.com) | ~$1/month (annual) |
| **Total** | **~$25/month** |

---

## Troubleshooting

### Container won't start
```bash
cd /opt/taskflow
docker compose logs
```

### 502 Bad Gateway
The backend may not have started yet. Wait 10-15 seconds and retry. Check logs for errors.

### Cannot connect via HTTPS
- Verify Cloudflare DNS A record points to correct IP
- Verify Cloudflare proxy is enabled (orange cloud)
- Verify SSL mode is set to "Full"
- Verify port 80 is open on the Droplet (`ufw status`)

### Database issues
```bash
# Access the container
docker compose exec taskflow sh

# Check database
ls -la /app/backend/data/
```
