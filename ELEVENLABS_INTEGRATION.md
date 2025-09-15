# ElevenLabs Voice Agent Integration Guide

## Overview
Complete ElevenLabs Conversational AI integration for Dealer Logic pilot project, enabling 24/7 voice-based customer service for automotive dealerships.

## Architecture

### Components Created

1. **Agent Configuration Module** (`api/elevenlabs-agent.js`)
   - Manages ElevenLabs agent setup and configuration
   - Handles conversation initialization
   - Processes call analytics and sentiment analysis
   - Configures agent personality and workflows

2. **Webhook Endpoints** (`api/webhooks.js`)
   - `/tools/inventory` - Search vehicle inventory
   - `/tools/service` - Schedule service appointments
   - `/tools/trade` - Check trade-in values
   - `/tools/transfer` - Transfer to human agent
   - `/transcription` - Post-call transcription webhook
   - `/audio` - Post-call audio storage

3. **Conversation Handler** (`api/conversation-handler.js`)
   - CRM integration for customer data
   - Lead generation and scoring
   - Follow-up scheduling
   - Real-time conversation management

4. **Test Suite** (`scripts/test-voice-agent.js`)
   - Comprehensive testing for all components
   - Configuration validation
   - Webhook connectivity testing
   - Analytics verification

## Setup Instructions

### 1. Configure Environment Variables

Copy `.env.template` to `.env` and add:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_AGENT_ID=your_agent_id_here
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret
ELEVENLABS_VOICE_ID=rachel  # or your preferred voice

# Webhook Configuration
WEBHOOK_BASE_URL=https://your-domain.com  # or ngrok URL for testing

# CRM Configuration
CRM_API_ENDPOINT=your_crm_endpoint
CRM_API_KEY=your_crm_api_key
```

### 2. Get ElevenLabs Credentials

1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Navigate to Profile → API Keys
3. Create a new API key
4. Go to Conversational AI → Create Agent
5. Copy the Agent ID

### 3. Start the Webhook Server

```bash
# Install dependencies
npm install

# Start webhook server
npm run webhooks
```

The server will run on port 3000 by default.

### 4. Expose Webhooks (for local testing)

Use ngrok to expose local webhooks:

```bash
ngrok http 3000
```

Update `WEBHOOK_BASE_URL` in `.env` with the ngrok URL.

### 5. Initialize the Agent

```bash
# Run test suite to verify setup
npm run test:voice
```

## Key Features

### Voice Agent Capabilities

- **Inventory Search**: Natural language vehicle search
- **Service Scheduling**: Book appointments with availability checking
- **Trade-In Valuation**: Instant estimates based on vehicle details
- **Smart Transfers**: Context-aware routing to human agents
- **Multi-language Support**: English and Spanish voices configured

### CRM Integration

- Automatic lead creation and scoring
- Customer history tracking
- Follow-up task scheduling
- Conversation transcripts and analytics
- Sentiment analysis for quality monitoring

### Analytics & Monitoring

- Call duration tracking
- Tool usage statistics
- Customer sentiment analysis
- Follow-up detection
- Resolution status tracking

## Usage Examples

### Starting a Conversation

```javascript
const agent = new DealerVoiceAgent(config);
const conversation = await agent.startConversation({
  metadata: {
    customer_phone: '555-0123',
    customer_name: 'John Doe',
    context: 'inbound_sales_call'
  }
});
```

### Processing Post-Call Data

```javascript
const analytics = await agent.processCallAnalytics({
  call_id: 'CALL123',
  duration: 180,
  transcript: '...',
  tools_triggered: ['inventory_search'],
  resolution: true
});
```

## Testing

Run the comprehensive test suite:

```bash
npm run test:voice
```

Tests include:
- Agent configuration validation
- Webhook connectivity checks
- Conversation initialization
- Tool invocation simulation
- CRM integration testing
- Sentiment analysis verification

## Production Deployment

1. Set production environment variables
2. Configure SSL certificates for webhooks
3. Set up monitoring and alerting
4. Enable call recording compliance
5. Configure backup and disaster recovery

## API Endpoints

### Conversation Management
- `POST /api/initialize` - Initialize voice agent
- `POST /api/conversation/start` - Start new conversation
- `POST /api/conversation/complete` - Handle conversation completion
- `GET /api/conversation/:id/status` - Get conversation status

### Webhook Tools
- `POST /tools/inventory` - Vehicle inventory search
- `POST /tools/service` - Service appointment scheduling
- `POST /tools/trade` - Trade-in valuation
- `POST /tools/transfer` - Human agent transfer

## Security Considerations

- HMAC signature validation on all webhooks
- API key rotation schedule
- SSL/TLS encryption for all communications
- PCI compliance for payment discussions
- GDPR/CCPA compliance for data retention

## Troubleshooting

### Common Issues

1. **Webhook not receiving calls**
   - Check firewall settings
   - Verify ngrok is running (for local testing)
   - Confirm webhook URL in ElevenLabs dashboard

2. **Agent not responding**
   - Verify API key is valid
   - Check agent ID is correct
   - Ensure voice credits are available

3. **CRM integration failing**
   - Validate CRM API credentials
   - Check network connectivity
   - Review CRM API rate limits

## Support

For issues or questions:
- ElevenLabs Documentation: https://elevenlabs.io/docs
- Support: support@dealerlogic.com