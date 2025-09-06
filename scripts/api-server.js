const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Simple API server for Dealer Logic
const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
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
            service: 'dealer-logic-api',
            environment: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    // Lead creation endpoint
    if (url.pathname === '/leads/create' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const lead = JSON.parse(body);
            console.log('New lead created:', lead);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                leadId: `DL-${Date.now()}`,
                message: 'Lead created successfully'
            }));
        });
        return;
    }
    
    // Service scheduling endpoint
    if (url.pathname === '/service/schedule' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const appointment = JSON.parse(body);
            console.log('Service appointment scheduled:', appointment);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                appointmentId: `SA-${Date.now()}`,
                message: 'Appointment scheduled successfully'
            }));
        });
        return;
    }
    
    // Inventory search endpoint
    if (url.pathname === '/inventory' || url.pathname === '/inventory/search') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true,
            vehicles: [
                { vin: '1HGCM82633A123456', year: 2024, make: 'Honda', model: 'Accord', price: 32000 },
                { vin: '5YJ3E1EA1KF123456', year: 2024, make: 'Toyota', model: 'Camry', price: 28000 }
            ],
            totalCount: 2
        }));
        return;
    }
    
    // SMS sending endpoint
    if (url.pathname === '/sms/send' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const sms = JSON.parse(body);
            console.log('SMS sent:', sms);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                messageId: `SMS-${Date.now()}`,
                message: 'SMS sent successfully'
            }));
        });
        return;
    }
    
    // Transfer endpoint
    if (url.pathname === '/calls/transfer' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const transfer = JSON.parse(body);
            console.log('Call transfer initiated:', transfer);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                transferId: `TR-${Date.now()}`,
                message: 'Transfer initiated'
            }));
        });
        return;
    }
    
    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
    console.log(`
    ====================================
    Dealer Logic API Server
    ====================================
    Environment: ${process.env.NODE_ENV}
    Port: ${PORT}
    URL: ${IS_PRODUCTION ? 'https://api.dealerlogic.io' : `http://localhost:${PORT}`}
    
    Available endpoints:
    - GET  /health
    - POST /leads/create
    - POST /service/schedule
    - GET  /inventory
    - POST /sms/send
    - POST /calls/transfer
    ====================================
    `);
});