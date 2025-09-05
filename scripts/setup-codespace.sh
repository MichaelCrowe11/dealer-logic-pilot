#!/bin/bash

echo "🚀 Setting up Dealer Logic Codespace Environment"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p reports config/processed mocks

# Setup environment file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.template .env
    
    # Add Codespace-specific defaults
    echo "" >> .env
    echo "# Codespace Defaults" >> .env
    echo "MONITOR_PORT=3001" >> .env
    echo "WEBHOOK_PORT=3002" >> .env
    echo "LOG_LEVEL=debug" >> .env
    
    echo -e "${GREEN}✓ Environment file created${NC}"
else
    echo -e "${GREEN}✓ Environment file already exists${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create mock API data
echo -e "${YELLOW}Creating mock API endpoints...${NC}"
cat > mocks/dealer-api.json << 'EOF'
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "lastMigration": 28,
  "name": "Dealer Logic Mock API",
  "endpointPrefix": "",
  "latency": 0,
  "port": 3003,
  "hostname": "0.0.0.0",
  "routes": [
    {
      "uuid": "route1",
      "documentation": "Create Lead",
      "method": "post",
      "endpoint": "api/leads",
      "responses": [
        {
          "uuid": "resp1",
          "body": "{\"success\": true, \"leadId\": \"{{faker 'datatype.uuid'}}\", \"message\": \"Lead created successfully\"}",
          "latency": 100,
          "statusCode": 200,
          "label": "Success",
          "headers": [{"key": "Content-Type", "value": "application/json"}]
        }
      ]
    },
    {
      "uuid": "route2",
      "documentation": "Schedule Service",
      "method": "post",
      "endpoint": "api/service/schedule",
      "responses": [
        {
          "uuid": "resp2",
          "body": "{\"success\": true, \"appointmentId\": \"{{faker 'datatype.uuid'}}\", \"confirmationNumber\": \"SVC-{{faker 'datatype.number' min=1000 max=9999}}\"}",
          "latency": 150,
          "statusCode": 200,
          "label": "Success",
          "headers": [{"key": "Content-Type", "value": "application/json"}]
        }
      ]
    },
    {
      "uuid": "route3",
      "documentation": "Get Inventory",
      "method": "get",
      "endpoint": "api/inventory",
      "responses": [
        {
          "uuid": "resp3",
          "body": "{\"vehicles\": [{\"vin\": \"{{faker 'vehicle.vin'}}\", \"make\": \"Toyota\", \"model\": \"Camry\", \"year\": 2024, \"price\": 28500, \"stock\": \"{{faker 'datatype.number' min=1000 max=9999}}\"}]}",
          "latency": 200,
          "statusCode": 200,
          "label": "Success",
          "headers": [{"key": "Content-Type", "value": "application/json"}]
        }
      ]
    }
  ]
}
EOF
echo -e "${GREEN}✓ Mock API data created${NC}"

# Create sample test data
echo -e "${YELLOW}Creating test data...${NC}"
cat > config/test-data.json << 'EOF'
{
  "testCalls": [
    {
      "scenario": "Sales Lead",
      "customerName": "John Smith",
      "phone": "5551234567",
      "intent": "Looking for 2024 Toyota Camry"
    },
    {
      "scenario": "Service Appointment",
      "customerName": "Jane Doe",
      "phone": "5559876543",
      "vin": "1HGBH41JXMN109186",
      "concern": "Oil change and tire rotation"
    }
  ],
  "testWebhooks": [
    {
      "event": "call.completed",
      "payload": {
        "callId": "test-123",
        "duration": 180,
        "agent": "agent.sales",
        "intent": "SalesLead",
        "outcome": "lead_created"
      }
    }
  ]
}
EOF
echo -e "${GREEN}✓ Test data created${NC}"

# Setup Git hooks
echo -e "${YELLOW}Setting up Git hooks...${NC}"
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit validation..."
npm run validate
EOF
chmod +x .git/hooks/pre-commit
echo -e "${GREEN}✓ Git hooks configured${NC}"

# Create welcome message
cat > CODESPACE_WELCOME.md << 'EOF'
# 🎉 Welcome to Dealer Logic Codespace!

Your development environment is ready. Here's how to get started:

## Quick Commands

- **Validate Configuration:** `npm run validate`
- **Deploy System:** `npm run deploy`
- **Run Tests:** `npm run test`
- **Start Monitor:** `npm run monitor`

## Available Ports

- **3001:** Monitoring Dashboard (auto-opens)
- **3002:** Webhook Listener
- **3003:** Mock API Server

## Next Steps

1. Edit `.env` with your dealer configuration
2. Run `npm run validate` to check setup
3. Open the monitoring dashboard at port 3001
4. Start testing with `npm run test`

## Helpful Resources

- [README](README.md) - Full documentation
- [Test Data](config/test-data.json) - Sample test scenarios
- [Mock API](mocks/dealer-api.json) - Mock endpoints

Happy coding! 🚀
EOF

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Codespace Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env with your configuration"
echo "2. Run: npm run validate"
echo "3. Run: npm run monitor"
echo ""
echo "Dashboard will be available at: http://localhost:3001"