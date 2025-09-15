const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// Main server orchestrator for production
require('dotenv').config({ path: '.env' });

const PORT = process.env.PORT || 8080;

// Start all services
console.log('Starting Dealer Logic services...');

// Start API server
const apiServer = spawn('node', [path.join(__dirname, 'api-server.js')], {
    env: { ...process.env, PORT: 3001 },
    stdio: 'inherit'
});

// Start webhook server
const webhookServer = spawn('node', [path.join(__dirname, 'webhook-server.js')], {
    env: { ...process.env, PORT: 3002 },
    stdio: 'inherit'
});

// Start monitoring server
const monitorServer = spawn('node', [path.join(__dirname, 'monitor.js'), '--production'], {
    env: { ...process.env, PORT: 3003 },
    stdio: 'inherit'
});

// Import the main app
const mainApp = require('./app');

// Main health check server
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'dealer-logic-main',
            environment: 'production',
            timestamp: new Date().toISOString(),
            services: {
                api: 'running on port 3001',
                webhooks: 'running on port 3002',
                monitoring: 'running on port 3003'
            }
        }));
    } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dealer Logic</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                           color: white; display: flex; justify-content: center; align-items: center;
                           height: 100vh; margin: 0; }
                    .container { text-align: center; }
                    h1 { font-size: 3em; margin-bottom: 0.5em; }
                    p { font-size: 1.2em; opacity: 0.9; }
                    .status { background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px;
                             margin-top: 30px; }
                    .badge { display: inline-block; padding: 5px 15px; background: #10b981;
                            border-radius: 20px; margin: 5px; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚗 Dealer Logic</h1>
                    <p>AI-Powered Voice Agents for Automotive Dealerships</p>
                    <div class="status">
                        <h2>System Status</h2>
                        <div class="badge">✅ Operational</div>
                        <div class="badge">📞 9 Agents Active</div>
                        <div class="badge">🌐 dealerlogic.io</div>
                    </div>
                </div>
            </body>
            </html>
        `);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`
    ================================================
    Dealer Logic Production Server
    ================================================
    Main Server: http://localhost:${PORT}
    API Server: http://localhost:3001
    Webhook Server: http://localhost:3002
    Monitor Server: http://localhost:3003
    
    Environment: production
    Domain: dealerlogic.io
    ================================================
    `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down services...');
    apiServer.kill();
    webhookServer.kill();
    monitorServer.kill();
    server.close();
    process.exit(0);
});