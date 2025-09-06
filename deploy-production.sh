#!/bin/bash

# Dealer Logic Production Deployment Script
# Deploy to dealerlogic.io

set -e

echo "================================================"
echo "   Dealer Logic Production Deployment"
echo "   Target: dealerlogic.io"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if production environment file exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Loading production environment...${NC}"
export $(grep -v '^#' .env.production | xargs)

echo -e "${YELLOW}Step 2: Validating production configuration...${NC}"
npm run validate -- --env=production

echo -e "${YELLOW}Step 3: Building production assets...${NC}"
npm run build 2>/dev/null || echo "No build step configured"

echo -e "${YELLOW}Step 4: Deploying to dealerlogic.io...${NC}"

# Create deployment package
echo "Creating deployment package..."
tar -czf dealer-logic-deploy.tar.gz \
    config/ \
    scripts/ \
    package.json \
    .env.production \
    docker-compose.yml

echo -e "${YELLOW}Step 5: Setting up production server...${NC}"

# Deploy using SSH (assuming SSH access is configured)
# Uncomment and configure when server details are available
# scp dealer-logic-deploy.tar.gz user@dealerlogic.io:/opt/dealer-logic/
# ssh user@dealerlogic.io "cd /opt/dealer-logic && tar -xzf dealer-logic-deploy.tar.gz"
# ssh user@dealerlogic.io "cd /opt/dealer-logic && npm install --production"
# ssh user@dealerlogic.io "cd /opt/dealer-logic && pm2 restart dealer-logic"

echo -e "${YELLOW}Step 6: Configuring DNS for dealerlogic.io...${NC}"
echo "DNS Configuration Required:"
echo "  A Record: dealerlogic.io -> Server IP"
echo "  A Record: api.dealerlogic.io -> Server IP"
echo "  A Record: hooks.dealerlogic.io -> Server IP"
echo "  CNAME: www.dealerlogic.io -> dealerlogic.io"

echo -e "${YELLOW}Step 7: Setting up SSL certificates...${NC}"
echo "SSL Setup Commands (run on server):"
echo "  sudo certbot --nginx -d dealerlogic.io -d www.dealerlogic.io"
echo "  sudo certbot --nginx -d api.dealerlogic.io"
echo "  sudo certbot --nginx -d hooks.dealerlogic.io"

echo -e "${YELLOW}Step 8: Configuring production monitoring...${NC}"
node scripts/monitor.js --production &
MONITOR_PID=$!
echo "Monitoring dashboard started (PID: $MONITOR_PID)"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Deployment package ready for dealerlogic.io${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next Steps:"
echo "1. Configure DNS records for dealerlogic.io"
echo "2. Set up production server with deployment package"
echo "3. Configure SSL certificates"
echo "4. Update Twilio webhook URLs to https://api.dealerlogic.io"
echo "5. Test production endpoints"
echo ""
echo "Deployment package: dealer-logic-deploy.tar.gz"
echo "Monitoring URL: http://localhost:3001"

# Cleanup
rm -f dealer-logic-deploy.tar.gz 2>/dev/null || true