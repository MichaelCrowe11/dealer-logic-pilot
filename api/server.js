// Express Server for ElevenLabs Voice Agent Webhooks
// Handles real-time webhook calls from voice conversations

const express = require('express');
const bodyParser = require('body-parser');
const webhookRoutes = require('./webhooks');
const conversationRoutes = require('./conversation-handler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for audio data
app.use(bodyParser.urlencoded({ extended: true }));

// CORS configuration for ElevenLabs
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-elevenlabs-signature');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dealer-logic-voice-agent'
  });
});

// Mount routes
app.use('/', webhookRoutes); // Webhook endpoints
app.use('/api', conversationRoutes); // Conversation management

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
    ====================================
    🎙️  ElevenLabs Voice Agent Server
    ====================================

    Server running on port ${PORT}

    Endpoints:
    - Health: http://localhost:${PORT}/health
    - Webhooks: http://localhost:${PORT}/tools/*
    - Conversation: http://localhost:${PORT}/api/conversation/*

    Ready to handle voice agent webhooks!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  process.exit(0);
});

module.exports = app;