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

### 1. Install Nginx + Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. Copy Nginx config

```bash
sudo cp nginx.conf /etc/nginx/sites-available/agentex

# Replace YOUR_DOMAIN with your actual domain
sudo sed -i 's/YOUR_DOMAIN/api.yourdomain.com/g' /etc/nginx/sites-available/agentex

sudo ln -s /etc/nginx/sites-available/agentex /etc/nginx/sites-enabled/
sudo nginx -t
```

### 3. Get SSL certificate

```bash
sudo certbot --nginx -d api.yourdomain.com
```

### 4. Restart Nginx

```bash
sudo systemctl restart nginx
```

### 5. Update extension config

In `config.js`, update `SERVER_URL`:
```javascript
SERVER_URL: 'https://api.yourdomain.com'
```

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
