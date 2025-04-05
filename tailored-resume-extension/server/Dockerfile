# Use Ubuntu as base image for better TeX Live support
FROM ubuntu:22.04

# Prevent tzdata questions during install
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js and npm
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install TeX Live and required packages
RUN apt-get update && \
    apt-get install -y \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN node --version && \
    npm --version && \
    pdflatex --version

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
CMD ["npm", "start"] 