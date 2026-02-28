# Deployment Guide

This guide covers various deployment scenarios for Agentex Resume Editor, from local development to production environments.

## 🏠 Local Development Setup

### Prerequisites

#### System Requirements
- **Operating System**: Windows 10+, macOS 10.14+, or Ubuntu 18.04+
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Chrome Browser**: Latest version
- **TeX Live**: For LaTeX compilation
- **LibreOffice**: For DOCX to PDF conversion

#### Installation Commands

**Ubuntu/Debian:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install TeX Live
sudo apt-get install -y texlive texlive-latex-extra texlive-fonts-recommended

# Install LibreOffice
sudo apt-get install -y libreoffice

# Install PM2
sudo npm install -g pm2
```

**macOS:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install MacTeX
brew install --cask mactex

# Install LibreOffice
brew install --cask libreoffice

# Install PM2
npm install -g pm2
```

**Windows:**
```powershell
# Install Node.js from https://nodejs.org/
# Install MiKTeX from https://miktex.org/
# Install LibreOffice from https://www.libreoffice.org/

# Install PM2
npm install -g pm2
```

### Quick Start

1. **Clone Repository:**
   ```bash
   git clone https://github.com/sbeeredd04/Agentex.git
   cd Agentex/tailored-resume-extension
   ```

2. **Install Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Load Extension:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `tailored-resume-extension` folder

## 🖥️ Production Server Deployment

### Using PM2 (Recommended)

#### Automated Setup
```bash
cd tailored-resume-extension/server
chmod +x setup.sh
./setup.sh
```

#### Manual Setup
```bash
# Install dependencies
npm install --production

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: "latex-server",
    script: "server.js",
    watch: true,
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    log_file: "logs/combined.log",
    time: true
  }]
}
EOL

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

#### PM2 Management Commands
```bash
# View status
pm2 status

# View logs
pm2 logs latex-server

# Restart service
pm2 restart latex-server

# Stop service
pm2 stop latex-server

# Monitor performance
pm2 monit

# Reload service (zero downtime)
pm2 reload latex-server
```

### Environment Configuration

#### Production Environment Variables
```bash
# .env file
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
MAX_FILE_SIZE=10485760
TEMP_DIR=/tmp
PDF_DIR=/tmp/pdf
```

#### System Service Configuration
```bash
# Create systemd service (Ubuntu/CentOS)
sudo tee /etc/systemd/system/agentex.service > /dev/null <<EOL
[Unit]
Description=Agentex Resume Editor Server
After=network.target

[Service]
Type=forking
User=agentex
WorkingDirectory=/opt/agentex/server
ExecStart=/usr/local/bin/pm2 start ecosystem.config.js
ExecReload=/usr/local/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/local/bin/pm2 stop ecosystem.config.js
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Enable and start service
sudo systemctl enable agentex
sudo systemctl start agentex
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
# tailored-resume-extension/server/Dockerfile
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create temp directories
RUN mkdir -p /tmp/pdf && chmod 777 /tmp/pdf

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["node", "server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  agentex-server:
    build: 
      context: ./tailored-resume-extension/server
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
      - /tmp:/tmp
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - agentex-server
    restart: unless-stopped
```

### Build and Run

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f agentex-server

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## ☁️ Cloud Deployment

### AWS Deployment

#### Using EC2

1. **Launch EC2 Instance:**
   ```bash
   # Amazon Linux 2
   sudo yum update -y
   sudo yum install -y nodejs npm
   
   # Install TeX Live
   sudo yum install -y texlive texlive-latex
   
   # Clone and setup
   git clone https://github.com/sbeeredd04/Agentex.git
   cd Agentex/tailored-resume-extension/server
   npm install --production
   
   # Install PM2
   sudo npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

2. **Security Groups:**
   ```
   Type: Custom TCP
   Port: 3000
   Source: My IP (for development) or 0.0.0.0/0 (for production with proper security)
   ```

#### Using ECS (Elastic Container Service)

```json
{
  "family": "agentex-server",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "agentex-server",
      "image": "your-account.dkr.ecr.region.amazonaws.com/agentex:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/agentex-server",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Platform

#### Using Compute Engine

```bash
# Create VM instance
gcloud compute instances create agentex-server \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=e2-medium \
  --zone=us-central1-a

# SSH into instance
gcloud compute ssh agentex-server --zone=us-central1-a

# Setup application (same as Ubuntu instructions above)
```

#### Using Cloud Run

```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: agentex-server
spec:
  template:
    spec:
      containers:
      - image: gcr.io/your-project/agentex:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
```

### Microsoft Azure

#### Using App Service

```bash
# Create resource group
az group create --name agentex-rg --location "East US"

# Create App Service plan
az appservice plan create --name agentex-plan --resource-group agentex-rg --sku B1 --is-linux

# Create web app
az webapp create --resource-group agentex-rg --plan agentex-plan --name agentex-server --runtime "NODE|18-lts"

# Configure deployment
az webapp deployment source config --name agentex-server --resource-group agentex-rg --repo-url https://github.com/sbeeredd04/Agentex --branch main --manual-integration
```

## 🌐 Reverse Proxy Configuration

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/agentex
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for large file processing
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### Apache Configuration

```apache
# /etc/apache2/sites-available/agentex.conf
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/fullchain.pem
    SSLCertificateKeyFile /etc/ssl/private/privkey.pem
    
    # Proxy Configuration
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Security Headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</VirtualHost>
```

## 📊 Monitoring and Logging

### PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# View real-time monitoring
pm2 monit

# Custom monitoring dashboard
pm2 web
```

### Log Management

```bash
# Log rotation with logrotate
sudo tee /etc/logrotate.d/agentex > /dev/null <<EOL
/opt/agentex/server/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 agentex agentex
    postrotate
        pm2 reload latex-server
    endscript
}
EOL
```

### Health Checks

```javascript
// Add health check endpoint
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now()
  };
  
  try {
    res.send(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    res.status(503).send();
  }
});
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in configuration
export PORT=3001
```

#### Permission Issues
```bash
# Fix temp directory permissions
sudo mkdir -p /tmp/pdf
sudo chmod 777 /tmp/pdf

# Fix log directory permissions
sudo chown -R $USER:$USER logs/
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor memory usage
pm2 monit
```

### Performance Optimization

#### Node.js Optimization
```javascript
// server.js optimizations
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start server
  app.listen(PORT);
}
```

#### Caching
```javascript
// Add response caching
const cache = require('memory-cache');

app.use('/api', (req, res, next) => {
  const key = req.originalUrl;
  const cached = cache.get(key);
  
  if (cached) {
    return res.send(cached);
  }
  
  res.sendResponse = res.send;
  res.send = (body) => {
    cache.put(key, body, 300000); // 5 minutes
    res.sendResponse(body);
  };
  
  next();
});
```

## 📋 Deployment Checklist

### Pre-deployment
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] SSL certificates obtained (for production)
- [ ] Firewall rules configured
- [ ] Backup strategy in place

### Deployment
- [ ] Application deployed successfully
- [ ] Health checks passing
- [ ] Logs are being generated
- [ ] Monitoring configured
- [ ] Error handling tested

### Post-deployment
- [ ] Performance tested under load
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Team notified of deployment
- [ ] Rollback plan prepared

---

This deployment guide covers various scenarios from local development to enterprise cloud deployments. Choose the approach that best fits your infrastructure and requirements.