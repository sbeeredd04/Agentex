# LaTeX Compiler API

A Node.js API for compiling LaTeX documents to PDF.

## Features

- Compile LaTeX documents to PDF
- Handles special characters in LaTeX
- Provides detailed error messages
- Health check endpoint for monitoring

## Deployment to Render

This application is configured for deployment on Render using Docker.

### Prerequisites

- A Render account
- Git repository with this code

### Deployment Steps

1. Create a new Web Service on Render
2. Connect your Git repository
3. Select "Docker" as the runtime
4. Set the following environment variables:
   - `PORT`: 10000 (or your preferred port)
   - `NODE_ENV`: production

### Configuration

The application is configured using the `render.yaml` file, which defines:

- Service type: Web
- Runtime: Docker
- Dockerfile path: ./Dockerfile
- Environment variables
- Health check path: /health

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

- `POST /compile`: Compile LaTeX to PDF
  - Request body: `{ "latex": "LaTeX content" }`
  - Response: PDF file or error message

- `GET /health`: Health check endpoint
  - Response: `{ "status": "ok" }`

## Docker

The application is containerized using Docker with the following features:

- Ubuntu 22.04 base image
- Node.js 18.x
- TeX Live packages for LaTeX compilation
- Optimized for Render deployment 