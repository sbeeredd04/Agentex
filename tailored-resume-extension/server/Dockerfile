# Use Ubuntu as base image for better TeX Live support
FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# Install TeX Live and required packages
RUN apt-get update && apt-get install -y \
    texlive-full \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    && rm -rf /var/lib/apt/lists/*

# Add TeX Live binaries to PATH
ENV PATH="/usr/local/texlive/2023/bin/x86_64-linux:$PATH"

# Verify installations
RUN node --version
RUN npm --version
RUN which pdflatex
RUN pdflatex --version

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create required directories
RUN mkdir -p /tmp/pdf

# Expose port (use PORT from render.com)
ENV PORT=10000
EXPOSE 10000

# Start the server
CMD ["node", "server.js"] 