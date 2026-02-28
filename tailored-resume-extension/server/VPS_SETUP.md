# Agentex Server — VPS Deployment Guide

Step-by-step guide to deploy the Agentex LaTeX compilation server on any VPS (Ubuntu/Debian).

---

## Prerequisites

| Requirement | Minimum |
|-------------|---------|
| VPS | 1 vCPU, 1GB RAM, 10GB disk |
| OS | Ubuntu 22.04+ / Debian 12+ |
| Docker | 24.0+ |
| Domain | Optional (for HTTPS) |

---

## Quick Start (Docker)

### 1. SSH into your VPS

```bash
ssh root@YOUR_VPS_IP
```

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

### 3. Clone and configure

```bash
git clone https://github.com/sbeeredd04/Agentex.git
cd Agentex/tailored-resume-extension/server

# Create your .env from template
cp .env.example .env
nano .env
```

### 4. Configure .env

```env
NODE_ENV=production
PORT=3000

# IMPORTANT: Add your Chrome extension ID
ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID,https://your-domain.com

# Rate limiting (adjust for your traffic)
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=30
```

> **Finding your extension ID**: Load the extension in Chrome → go to `chrome://extensions/` → copy the ID shown under your extension.

### 5. Build and start

```bash
docker compose up -d --build
```

### 6. Verify

```bash
# Health check
curl http://localhost:3000/health

# Test compilation
curl -X POST http://localhost:3000/compile \
  -H "Content-Type: application/json" \
  -d '{"latex":"\\documentclass{article}\\begin{document}Hello World\\end{document}"}'
```

---

## HTTPS Setup (with domain)

Chrome Extensions require `https://` when talking to external APIs. We configure Nginx as a reverse proxy and use Certbot for a free Let's Encrypt SSL certificate.

### 1. Install Nginx + Certbot

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. Create Nginx config

Create a simple Nginx configuration so Certbot can verify your domain:
```bash
sudo nano /etc/nginx/sites-available/agentex
```

Paste this block (replace `api.agentex.yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name api.agentex.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. Enable the site

```bash
# Link the config to enable it
sudo ln -s /etc/nginx/sites-available/agentex /etc/nginx/sites-enabled/

# Remove the default nginx page
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx and restart
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Get SSL certificate

Run certbot to fetch the certificate and automatically wrap your Nginx file:
```bash
sudo certbot --nginx -d api.agentex.yourdomain.com
```

### 5. Update extension config

In `tailored-resume-extension/config.js`, update the `SERVER_URL` getter:
```javascript
get SERVER_URL() {
  return IS_DEV ? 'http://localhost:3000' : 'https://api.agentex.yourdomain.com';
},
```

---

## Auto-Deploy via GitHub Actions

To automatically deploy changes from the `main` branch to your VPS, a `.github/workflows/deploy.yml` file is provided. You just need to configure the server to allow GitHub to SSH into it.

### 1. Generate SSH Key on VPS

Ensure you are logged in as `root`:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/github_actions # Note: Copy the entire output
```

### 2. Add GitHub Repository Secrets

Go to your GitHub repository **Settings > Secrets and variables > Actions**:
*   `VPS_HOST`: Your VPS IP address (e.g. `5.78...`)
*   `VPS_USER`: `root`
*   `VPS_SSH_KEY`: The entire private key you copied above (including the `BEGIN` and `END` lines).

---

## Without Docker (bare metal)

If you prefer not to use Docker:

### 1. Install Node.js + TeX Live

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# TeX Live (for pdflatex)
sudo apt install -y texlive-latex-base texlive-latex-recommended \
  texlive-latex-extra texlive-fonts-recommended texlive-fonts-extra

# Verify
node --version
pdflatex --version
```

### 2. Setup

```bash
cd Agentex/tailored-resume-extension/server
cp .env.example .env
nano .env
npm ci --production
```

### 3. Run with PM2

```bash
npm install -g pm2

pm2 start server.js --name agentex
pm2 save
pm2 startup
```

---

## Monitoring

### Docker logs

```bash
docker compose logs -f
```

### Health endpoint

```bash
# Returns: { status, version, uptime, pdflatex, environment }
curl https://api.yourdomain.com/health
```

### Status endpoint

```bash
# Returns: { uptime, memory, version }
curl https://api.yourdomain.com/status
```

---

## Updating

```bash
cd Agentex/tailored-resume-extension/server
git pull origin main
docker compose up -d --build
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `pdflatex not found` | Docker rebuilds include texlive. For bare metal: `sudo apt install texlive-latex-base` |
| `CORS error` | Add your extension ID to `ALLOWED_ORIGINS` in `.env` |
| `Rate limited` | Increase `RATE_LIMIT_MAX` in `.env` |
| `Container OOM` | Increase Docker memory limit in `docker-compose.yml` |
| `PDF compilation slow` | First compile is slow (font cache). Subsequent ones are faster |
| `Port 3000 in use` | Change `PORT` in `.env` and `docker-compose.yml` |

---

## File Structure

```
server/
├── server.js           # Production server
├── package.json        # Dependencies
├── .env.example        # Config template
├── .env                # Your config (git-ignored)
├── Dockerfile          # Docker build
├── docker-compose.yml  # Docker orchestration
├── nginx.conf          # Reverse proxy config
├── .dockerignore       # Docker build exclusions
└── VPS_SETUP.md        # This file
```
