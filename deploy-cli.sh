#!/bin/bash

# Automated CLI deployment script for dealerlogic.io
set -e

echo "================================================"
echo "   Dealer Logic CLI Deployment"
echo "   Deploying to: dealerlogic.io"
echo "================================================"

# Check for required tools
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Installing..."
        return 1
    else
        echo "✅ $1 is installed"
        return 0
    fi
}

echo ""
echo "Checking required tools..."
check_tool docker || curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
check_tool git
check_tool node || curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs

# Option 1: Deploy with Docker locally
deploy_docker() {
    echo "Starting Docker deployment..."
    docker-compose -f docker-compose.production.yml up -d
    echo "✅ Services started locally"
    echo "Access at: http://localhost:8080"
}

# Option 2: Deploy to Vercel
deploy_vercel() {
    echo "Deploying to Vercel..."
    npx vercel --prod --yes
    echo "✅ Deployed to Vercel"
}

# Option 3: Deploy to Netlify
deploy_netlify() {
    echo "Deploying to Netlify..."
    npx netlify deploy --prod --dir=.
    echo "✅ Deployed to Netlify"
}

# Option 4: Deploy to Railway
deploy_railway() {
    echo "Deploying to Railway..."
    npx @railway/cli@latest login
    npx @railway/cli@latest up
    echo "✅ Deployed to Railway"
}

# Option 5: Deploy to Render
deploy_render() {
    echo "Creating Render blueprint..."
    cat > render.yaml << 'EOF'
services:
  - type: web
    name: dealer-logic
    env: node
    region: oregon
    plan: free
    buildCommand: npm install
    startCommand: node scripts/server.js
    envVars:
      - key: NODE_ENV
        value: production
    domains:
      - dealerlogic.io
EOF
    echo "✅ Render blueprint created. Push to GitHub and connect to Render.com"
}

# Start local services for testing
echo ""
echo "Starting local services for testing..."
cd dealer-logic-pilot
npm install

# Start the main server
node scripts/server.js &
SERVER_PID=$!

sleep 5

# Test endpoints
echo ""
echo "Testing local endpoints..."
curl -s http://localhost:8080/health | grep -q "healthy" && echo "✅ Main server: OK" || echo "❌ Main server: Failed"
curl -s http://localhost:3001/health | grep -q "healthy" && echo "✅ API server: OK" || echo "❌ API server: Failed"
curl -s http://localhost:3002/health | grep -q "healthy" && echo "✅ Webhook server: OK" || echo "❌ Webhook server: Failed"

echo ""
echo "================================================"
echo "   Deployment Options Available"
echo "================================================"
echo ""
echo "1. Docker (Local) - Run 'docker-compose -f docker-compose.production.yml up -d'"
echo "2. Vercel - Run 'npx vercel --prod'"
echo "3. Netlify - Run 'npx netlify deploy --prod'"
echo "4. Railway - Run 'railway up'"
echo "5. Render - Push to GitHub and import at render.com"
echo "6. Fly.io - Run 'fly deploy'"
echo ""
echo "Local services running on:"
echo "  Main: http://localhost:8080"
echo "  API: http://localhost:3001"
echo "  Webhooks: http://localhost:3002"
echo "  Monitor: http://localhost:3003"
echo ""
echo "Press Ctrl+C to stop local services"

# Keep running
wait $SERVER_PID