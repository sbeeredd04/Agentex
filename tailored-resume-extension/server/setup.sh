#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting server setup..."

# Update package list
echo "📦 Updating package list..."
sudo apt-get update

# Install Node.js and npm if not installed
echo "🟢 Installing Node.js and npm..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install TeX Live and required packages
echo "📚 Installing TeX Live and required packages..."
sudo apt-get install -y \
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended

# Install PM2 for process management
echo "⚙️ Installing PM2 process manager..."
sudo npm install -g pm2

# Create necessary directories
echo "📁 Creating required directories..."
sudo mkdir -p /tmp/pdf
sudo chmod 777 /tmp/pdf

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 ecosystem config..."
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

# Start the server with PM2
echo "🚀 Starting the server..."
pm2 start ecosystem.config.js

# Save PM2 process list to start on reboot
echo "💾 Setting up PM2 startup script..."
pm2 save
pm2 startup | tail -n 1

echo "✅ Setup complete!"
echo "
Server Status:
- Check logs: pm2 logs latex-server
- Monitor: pm2 monit
- Restart server: pm2 restart latex-server
- Stop server: pm2 stop latex-server

The server should now be running on port 3000!
" 