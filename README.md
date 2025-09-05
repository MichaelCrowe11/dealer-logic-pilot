# Dealer Logic - Arizona Pilot

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/MichaelCrowe11/dealer-logic-pilot)
[![CI/CD Pipeline](https://github.com/MichaelCrowe11/dealer-logic-pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/MichaelCrowe11/dealer-logic-pilot/actions)

AI-powered voice agent system for automotive dealerships. This pilot deployment provides intelligent call handling for sales, service, parts, and after-hours support.

## 🚀 Quick Start with GitHub Codespaces

Click the button above to instantly launch a fully configured development environment in your browser. No local setup required!

## 💻 Local Development

### Quick Start

1. **Clone and Install**
```bash
git clone <repository-url>
cd dealer-logic-pilot
npm install
```

2. **Configure Environment**
```bash
cp .env.template .env
# Edit .env with your dealer-specific values
```

3. **Validate Configuration**
```bash
npm run validate
```

4. **Deploy**
```bash
npm run deploy
```

5. **Test**
```bash
npm run test
```

6. **Monitor**
```bash
npm run monitor
# Dashboard available at http://localhost:3001
```

## Project Structure

```
dealer-logic-pilot/
├── config/
│   ├── dealer-logic-config.json  # Main configuration
│   ├── agents.json               # Agent definitions
│   ├── tools.json                # Tool endpoints
│   └── templates.json            # SMS/Email templates
├── scripts/
│   ├── deploy.js                 # Deployment script
│   ├── validate.js               # Configuration validator
│   ├── test-calls.js             # Test call suite
│   └── monitor.js                # Real-time monitoring
├── reports/                      # Generated reports
├── .env.template                 # Environment template
└── package.json
```

## Configuration

### Required Environment Variables

- **Dealer Information**: Name, address, phone, website
- **Phone Numbers**: Main, sales, service, parts DIDs
- **SIP Configuration**: Provider, ingress/egress hosts
- **Voice IDs**: ElevenLabs voice IDs for EN/ES
- **CRM Integration**: Type, ADF email, API credentials

See `.env.template` for complete list.

## Agents

### Reception (`agent.reception`)
- First point of contact
- Intent identification
- Bilingual support (EN/ES)
- Warm transfers

### Sales (`agent.sales`)
- Lead qualification
- Inventory search
- Test drive scheduling
- ADF/XML lead creation

### Service (`agent.service`)
- Appointment scheduling
- Recall checking
- Transportation preferences
- SMS confirmations

### Parts (`agent.parts`)
- Part lookup by VIN/YMM
- Availability checking
- Quote creation
- Pickup/delivery options

### After Hours (`agent.after_hours`)
- Message capture
- Voicemail transcription
- Manager notifications
- Emergency routing

## Features

### Compliance
- Automatic recording disclosure
- SMS opt-in collection
- DNC list management
- Zero retention mode support

### Integrations
- CRM (VinSolutions, DealerSocket, etc.)
- Service Schedulers (Xtime, myKaarma)
- Payment processors
- SMS gateways

### Monitoring
- Real-time call metrics
- Agent performance tracking
- Intent distribution
- Error logging
- Web dashboard

## Testing

Run the interactive test suite:

```bash
npm run test
```

Test scenarios include:
- Sales lead capture
- Service scheduling
- Parts inquiries
- Spanish language support
- Status checks
- After-hours handling
- Warm transfers
- DNC requests

## Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Phone numbers provisioned
- [ ] SIP trunk configured
- [ ] CRM credentials obtained
- [ ] Voice IDs created

### Day-0
- [ ] Run validation: `npm run validate`
- [ ] Deploy configuration: `npm run deploy`
- [ ] Execute test calls: `npm run test`
- [ ] Verify CRM integration
- [ ] Test warm transfers

### Go-Live
- [ ] Start monitoring: `npm run monitor`
- [ ] Train BDC staff
- [ ] Configure after-hours routing
- [ ] Set up manager notifications
- [ ] Document escalation procedures

## KPIs

### Target Metrics (30 days)
- Answer rate: ≥98%
- Time to answer: <2 seconds
- Sales lead capture: +25-40%
- Service self-serve: ≥30%
- Hold time reduction: 80%

## Support

### Troubleshooting

**Missing environment variables:**
```bash
npm run validate
# Check failed items in report
```

**Test call failures:**
```bash
# Check reports/test-results-*.json
# Verify phone number routing
# Confirm agent availability
```

**Integration issues:**
```bash
# Check webhook connectivity
# Verify API credentials
# Review reports/deployment-*.json
```

### Rollback

If issues occur, revert DID routing at SIP provider level:
1. Access SIP provider portal
2. Route DIDs back to legacy IVR
3. Notify management team
4. Generate incident report

## Security

- No credit card processing by AI agents
- Secure payment links only
- Recording compliance per state law
- Zero retention mode available
- Encrypted webhook communications

## 🐳 Docker Development

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f dealer-logic

# Stop services
docker-compose down
```

## ☁️ GitHub Codespaces

This repository is optimized for GitHub Codespaces:

1. Click "Code" → "Codespaces" → "Create codespace"
2. Wait for environment setup (2-3 minutes)
3. Terminal will show when ready
4. Run `npm run validate` to check setup
5. Access dashboard at forwarded port 3001

### Codespace Features

- Pre-configured Node.js environment
- Mock API server for testing
- Automatic port forwarding
- VS Code extensions included
- Git hooks pre-configured
- Test data and scenarios ready

## License

Proprietary - Dealer Logic / ElevenLabs

## Contact

For support, escalation, or feedback:
- Technical Support: [support email]
- Account Manager: [AM contact]
- Emergency: [24/7 number]