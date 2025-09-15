const http = require('http');
const crypto = require('crypto');
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

const PORT = process.env.WEBHOOK_PORT || 3002;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'webhook_secret_abcdef';

// Webhook server for Dealer Logic
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Signature');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Health check endpoint
    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'healthy', 
            service: 'dealer-logic-webhooks',
            environment: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    // Post-call webhook
    if (url.pathname === '/postcall' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            // Verify webhook signature
            const signature = req.headers['x-webhook-signature'];
            const expectedSignature = crypto
                .createHmac('sha256', WEBHOOK_SECRET)
                .update(body)
                .digest('hex');
            
            if (signature && signature !== expectedSignature) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid signature' }));
                return;
            }
            
            const callData = JSON.parse(body);
            console.log('Post-call webhook received:', {
                callId: callData.callId,
                duration: callData.duration,
                status: callData.status,
                agent: callData.agent
            });
            
            // Process the call data (save to database, send notifications, etc.)
            processCallData(callData);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true,
                message: 'Webhook processed successfully'
            }));
        });
        return;
    }
    
    // Lead webhook
    if (url.pathname === '/lead' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const leadData = JSON.parse(body);
            console.log('Lead webhook received:', leadData);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true,
                message: 'Lead webhook processed'
            }));
        });
        return;
    }
    
    // Service webhook
    if (url.pathname === '/service' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const serviceData = JSON.parse(body);
            console.log('Service webhook received:', serviceData);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true,
                message: 'Service webhook processed'
            }));
        });
        return;
    }
    
    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Webhook endpoint not found' }));
});

function processCallData(callData) {
    // Store call metrics
    const metrics = {
        timestamp: new Date().toISOString(),
        callId: callData.callId,
        duration: callData.duration,
        agent: callData.agent,
        status: callData.status,
        intent: callData.intent,
        leadCaptured: callData.leadCaptured || false,
        appointmentScheduled: callData.appointmentScheduled || false
    };
    
    // In production, save to database
    console.log('Call metrics processed:', metrics);
    
    // Send notifications if needed
    if (callData.requiresFollowUp) {
        console.log('Follow-up required for call:', callData.callId);
    }
}

server.listen(PORT, () => {
    console.log(`
    ====================================
    Dealer Logic Webhook Server
    ====================================
    Environment: ${process.env.NODE_ENV}
    Port: ${PORT}
    URL: ${process.env.NODE_ENV === 'production' ? 'https://hooks.dealerlogic.io' : `http://localhost:${PORT}`}
    
    Available webhooks:
    - POST /postcall
    - POST /lead
    - POST /service
    - GET  /health
    ====================================
    `);
});