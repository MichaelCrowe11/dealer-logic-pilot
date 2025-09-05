#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

class DealerLogicMonitor {
    constructor() {
        this.metrics = {
            calls: {
                total: 0,
                answered: 0,
                abandoned: 0,
                transferred: 0
            },
            agents: {},
            intents: {},
            errors: [],
            performance: {
                avgResponseTime: 0,
                avgCallDuration: 0
            }
        };
        
        this.startTime = Date.now();
        this.port = process.env.MONITOR_PORT || 3001;
    }

    startMonitoring() {
        console.log('📊 Dealer Logic Real-Time Monitor');
        console.log('=================================\n');
        console.log(`Dashboard: http://localhost:${this.port}`);
        console.log('Press Ctrl+C to stop monitoring\n');

        // Start webhook listener
        this.startWebhookListener();
        
        // Start dashboard server
        this.startDashboardServer();
        
        // Start console updates
        this.startConsoleUpdates();
    }

    startWebhookListener() {
        const webhookPort = process.env.WEBHOOK_PORT || 3002;
        
        const server = http.createServer((req, res) => {
            if (req.method === 'POST' && req.url === '/webhook/call') {
                let body = '';
                
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        this.processCallData(data);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'received' }));
                    } catch (error) {
                        console.error('Webhook error:', error);
                        res.writeHead(400);
                        res.end('Invalid data');
                    }
                });
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        server.listen(webhookPort, () => {
            console.log(`Webhook listener on port ${webhookPort}`);
        });
    }

    processCallData(data) {
        // Update metrics
        this.metrics.calls.total++;
        
        if (data.status === 'answered') {
            this.metrics.calls.answered++;
        } else if (data.status === 'abandoned') {
            this.metrics.calls.abandoned++;
        }
        
        if (data.transferred) {
            this.metrics.calls.transferred++;
        }
        
        // Track agent performance
        if (data.agent_id) {
            if (!this.metrics.agents[data.agent_id]) {
                this.metrics.agents[data.agent_id] = {
                    calls: 0,
                    avgDuration: 0
                };
            }
            this.metrics.agents[data.agent_id].calls++;
        }
        
        // Track intents
        if (data.intent) {
            if (!this.metrics.intents[data.intent]) {
                this.metrics.intents[data.intent] = 0;
            }
            this.metrics.intents[data.intent]++;
        }
        
        // Log errors
        if (data.error) {
            this.metrics.errors.push({
                timestamp: new Date().toISOString(),
                error: data.error,
                agent: data.agent_id
            });
        }
    }

    startDashboardServer() {
        const server = http.createServer((req, res) => {
            if (req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(this.generateDashboardHTML());
            } else if (req.url === '/api/metrics') {
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(this.metrics));
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        server.listen(this.port);
    }

    generateDashboardHTML() {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Dealer Logic Monitor</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 36px;
            font-weight: bold;
            color: #333;
        }
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .success { color: #4CAF50; }
        .warning { color: #FF9800; }
        .error { color: #F44336; }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
    </style>
    <script>
        async function updateMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const metrics = await response.json();
                
                // Update call metrics
                document.getElementById('total-calls').textContent = metrics.calls.total;
                document.getElementById('answered-calls').textContent = metrics.calls.answered;
                document.getElementById('abandoned-calls').textContent = metrics.calls.abandoned;
                document.getElementById('transferred-calls').textContent = metrics.calls.transferred;
                
                // Calculate rates
                const answerRate = metrics.calls.total > 0 
                    ? ((metrics.calls.answered / metrics.calls.total) * 100).toFixed(1) 
                    : 0;
                document.getElementById('answer-rate').textContent = answerRate + '%';
                
                // Update agent table
                const agentTableBody = document.getElementById('agent-table-body');
                agentTableBody.innerHTML = '';
                
                Object.entries(metrics.agents).forEach(([agentId, data]) => {
                    const row = agentTableBody.insertRow();
                    row.insertCell(0).textContent = agentId;
                    row.insertCell(1).textContent = data.calls;
                    row.insertCell(2).textContent = data.avgDuration + 's';
                });
                
                // Update intent distribution
                const intentTableBody = document.getElementById('intent-table-body');
                intentTableBody.innerHTML = '';
                
                Object.entries(metrics.intents).forEach(([intent, count]) => {
                    const row = intentTableBody.insertRow();
                    row.insertCell(0).textContent = intent;
                    row.insertCell(1).textContent = count;
                    const percentage = ((count / metrics.calls.total) * 100).toFixed(1);
                    row.insertCell(2).textContent = percentage + '%';
                });
                
            } catch (error) {
                console.error('Failed to update metrics:', error);
            }
        }
        
        // Update every 5 seconds
        setInterval(updateMetrics, 5000);
        updateMetrics();
    </script>
</head>
<body>
    <div class="header">
        <h1>🚀 Dealer Logic Real-Time Monitor</h1>
        <p>Arizona Pilot - ${process.env.DEALER_NAME || 'Dealer Name'}</p>
    </div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value" id="total-calls">0</div>
            <div class="metric-label">Total Calls</div>
        </div>
        <div class="metric-card">
            <div class="metric-value success" id="answered-calls">0</div>
            <div class="metric-label">Answered</div>
        </div>
        <div class="metric-card">
            <div class="metric-value error" id="abandoned-calls">0</div>
            <div class="metric-label">Abandoned</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="transferred-calls">0</div>
            <div class="metric-label">Transferred</div>
        </div>
        <div class="metric-card">
            <div class="metric-value success" id="answer-rate">0%</div>
            <div class="metric-label">Answer Rate</div>
        </div>
    </div>
    
    <div class="chart-container">
        <h3>Agent Performance</h3>
        <table>
            <thead>
                <tr>
                    <th>Agent</th>
                    <th>Calls Handled</th>
                    <th>Avg Duration</th>
                </tr>
            </thead>
            <tbody id="agent-table-body">
            </tbody>
        </table>
    </div>
    
    <div class="chart-container">
        <h3>Intent Distribution</h3>
        <table>
            <thead>
                <tr>
                    <th>Intent</th>
                    <th>Count</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody id="intent-table-body">
            </tbody>
        </table>
    </div>
</body>
</html>`;
    }

    startConsoleUpdates() {
        setInterval(() => {
            console.clear();
            console.log('📊 Dealer Logic Real-Time Monitor');
            console.log('=================================\n');
            console.log(`Dashboard: http://localhost:${this.port}`);
            console.log(`Uptime: ${this.formatUptime()}\n`);
            
            console.log('📞 Call Metrics:');
            console.log(`  Total:       ${this.metrics.calls.total}`);
            console.log(`  Answered:    ${this.metrics.calls.answered}`);
            console.log(`  Abandoned:   ${this.metrics.calls.abandoned}`);
            console.log(`  Transferred: ${this.metrics.calls.transferred}`);
            
            const answerRate = this.metrics.calls.total > 0 
                ? ((this.metrics.calls.answered / this.metrics.calls.total) * 100).toFixed(1) 
                : 0;
            console.log(`  Answer Rate: ${answerRate}%`);
            
            if (Object.keys(this.metrics.agents).length > 0) {
                console.log('\n👥 Top Agents:');
                const topAgents = Object.entries(this.metrics.agents)
                    .sort((a, b) => b[1].calls - a[1].calls)
                    .slice(0, 5);
                
                topAgents.forEach(([agentId, data]) => {
                    console.log(`  ${agentId}: ${data.calls} calls`);
                });
            }
            
            if (Object.keys(this.metrics.intents).length > 0) {
                console.log('\n🎯 Top Intents:');
                const topIntents = Object.entries(this.metrics.intents)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                
                topIntents.forEach(([intent, count]) => {
                    console.log(`  ${intent}: ${count}`);
                });
            }
            
            if (this.metrics.errors.length > 0) {
                console.log(`\n⚠️  Errors: ${this.metrics.errors.length}`);
                const recentError = this.metrics.errors[this.metrics.errors.length - 1];
                console.log(`  Latest: ${recentError.error} (${recentError.agent})`);
            }
            
            console.log('\n\nPress Ctrl+C to stop monitoring');
        }, 10000); // Update every 10 seconds
    }

    formatUptime() {
        const seconds = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours}h ${minutes}m ${secs}s`;
    }
}

// Start monitoring
if (require.main === module) {
    const monitor = new DealerLogicMonitor();
    monitor.startMonitoring();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\nStopping monitor...');
        
        // Save final metrics
        const reportPath = path.join(__dirname, '..', 'reports', `monitor-${Date.now()}.json`);
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(monitor.metrics, null, 2));
        
        console.log(`Metrics saved to: ${reportPath}`);
        process.exit(0);
    });
}