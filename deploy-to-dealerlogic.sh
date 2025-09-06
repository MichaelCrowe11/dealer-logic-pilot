#!/bin/bash

# Complete deployment script for dealerlogic.io
# This script packages and prepares everything for server deployment

set -e

echo "=============================================="
echo "   Dealer Logic Production Deployment"
echo "   Target: dealerlogic.io"
echo "=============================================="

# Create deployment directory
DEPLOY_DIR="dealer-logic-deployment-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DEPLOY_DIR

echo "📦 Creating deployment package..."

# Copy necessary files
cp -r config $DEPLOY_DIR/
cp -r scripts $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp docker-compose.production.yml $DEPLOY_DIR/docker-compose.yml
cp .env.production $DEPLOY_DIR/.env
cp dns-config.md $DEPLOY_DIR/

# Create setup script for the server
cat > $DEPLOY_DIR/setup.sh << 'EOF'
#!/bin/bash

echo "Setting up Dealer Logic on server..."

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker and Docker Compose if not present
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx
sudo apt-get install -y nginx

# Install certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /opt/dealer-logic
sudo chown $USER:$USER /opt/dealer-logic

# Copy files to application directory
cp -r * /opt/dealer-logic/
cd /opt/dealer-logic

# Install dependencies
npm install --production

# Start services with Docker Compose
docker-compose up -d

# Setup nginx configuration
sudo tee /etc/nginx/sites-available/dealerlogic.io << 'NGINX'
server {
    listen 80;
    server_name dealerlogic.io www.dealerlogic.io api.dealerlogic.io hooks.dealerlogic.io;
    return 301 https://$server_name$request_uri;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/dealerlogic.io /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Obtain SSL certificates
sudo certbot --nginx -d dealerlogic.io -d www.dealerlogic.io -d api.dealerlogic.io -d hooks.dealerlogic.io --non-interactive --agree-tos --email alerts@dealerlogic.io

echo "✅ Setup complete!"
echo "Services running:"
docker-compose ps
EOF

chmod +x $DEPLOY_DIR/setup.sh

# Create monitoring script
cat > $DEPLOY_DIR/monitor.sh << 'EOF'
#!/bin/bash
cd /opt/dealer-logic
docker-compose logs -f
EOF

chmod +x $DEPLOY_DIR/monitor.sh

# Create health check script
cat > $DEPLOY_DIR/health-check.sh << 'EOF'
#!/bin/bash
echo "Checking service health..."
curl -s http://localhost:3001/health | jq .
curl -s http://localhost:3002/health | jq .
curl -s http://localhost:3003/health | jq .
EOF

chmod +x $DEPLOY_DIR/health-check.sh

# Package everything
tar -czf ${DEPLOY_DIR}.tar.gz $DEPLOY_DIR/

echo ""
echo "=============================================="
echo "✅ Deployment package created successfully!"
echo "=============================================="
echo ""
echo "Package: ${DEPLOY_DIR}.tar.gz"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Transfer package to server:"
echo "   scp ${DEPLOY_DIR}.tar.gz user@dealerlogic.io:/home/user/"
echo ""
echo "2. SSH into server:"
echo "   ssh user@dealerlogic.io"
echo ""
echo "3. Extract and run setup:"
echo "   tar -xzf ${DEPLOY_DIR}.tar.gz"
echo "   cd ${DEPLOY_DIR}"
echo "   sudo ./setup.sh"
echo ""
echo "4. Verify deployment:"
echo "   ./health-check.sh"
echo ""
echo "5. Monitor services:"
echo "   ./monitor.sh"
echo ""
echo "=============================================="

# Clean up
rm -rf $DEPLOY_DIR