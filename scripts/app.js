const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const snoowrap = require('snoowrap');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dealer-logic-secret-key-2024';

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'dealer-logic-session-secret',
    resave: false,
    saveUninitialized: true
}));

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    // Create dealers table
    db.run(`CREATE TABLE dealers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        dealership TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create agents table
    db.run(`CREATE TABLE agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dealer_id INTEGER,
        name TEXT,
        type TEXT,
        status TEXT,
        calls_handled INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create calls table
    db.run(`CREATE TABLE calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dealer_id INTEGER,
        agent_id INTEGER,
        duration INTEGER,
        outcome TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert demo dealer
    const hashedPassword = bcrypt.hashSync('demo123', 10);
    db.run(`INSERT INTO dealers (name, email, password, dealership, phone) 
            VALUES ('Demo User', 'demo@dealerlogic.io', ?, 'Demo Dealership', '480-555-1234')`, [hashedPassword]);

    // Insert demo agents
    db.run(`INSERT INTO agents (dealer_id, name, type, status, calls_handled) 
            VALUES (1, 'Reception Agent', 'reception', 'active', 487)`);
    db.run(`INSERT INTO agents (dealer_id, name, type, status, calls_handled) 
            VALUES (1, 'Sales Agent', 'sales', 'active', 234)`);
    db.run(`INSERT INTO agents (dealer_id, name, type, status, calls_handled) 
            VALUES (1, 'Service Agent', 'service', 'active', 156)`);
});

// Initialize data source clients
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// Reddit client (requires credentials)
let reddit = null;
if (process.env.REDDIT_CLIENT_ID) {
    reddit = new snoowrap({
        userAgent: 'DealerLogic/1.0.0',
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        refreshToken: process.env.REDDIT_REFRESH_TOKEN
    });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'dealer-logic-app',
        timestamp: new Date().toISOString()
    });
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM dealers WHERE email = ?', [email], (err, dealer) => {
        if (err || !dealer) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        if (!bcrypt.compareSync(password, dealer.password)) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: dealer.id, email: dealer.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            dealer: {
                id: dealer.id,
                name: dealer.name,
                dealership: dealer.dealership
            }
        });
    });
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password, dealership, phone } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
        'INSERT INTO dealers (name, email, password, dealership, phone) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, dealership, phone],
        function(err) {
            if (err) {
                return res.json({ success: false, message: 'Email already exists' });
            }

            const token = jwt.sign(
                { id: this.lastID, email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
                dealer: { id: this.lastID, name, dealership }
            });
        }
    );
});

// Agent management
app.get('/api/agents', authenticateToken, (req, res) => {
    db.all('SELECT * FROM agents WHERE dealer_id = ?', [req.user.id], (err, agents) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(agents);
    });
});

app.post('/api/agents', authenticateToken, (req, res) => {
    const { name, type } = req.body;
    
    db.run(
        'INSERT INTO agents (dealer_id, name, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, name, type, 'active'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create agent' });
            }
            res.json({ success: true, agentId: this.lastID });
        }
    );
});

// Data source integrations
app.get('/api/data/github', async (req, res) => {
    try {
        // Fetch automotive-related repositories
        const { data } = await octokit.search.repos({
            q: 'automotive dealership management',
            sort: 'stars',
            per_page: 10
        });

        res.json({
            source: 'GitHub',
            repositories: data.items.map(repo => ({
                name: repo.name,
                description: repo.description,
                stars: repo.stargazers_count,
                url: repo.html_url
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch GitHub data' });
    }
});

app.get('/api/data/reddit', async (req, res) => {
    if (!reddit) {
        return res.json({ 
            source: 'Reddit',
            message: 'Reddit integration not configured',
            sample: [
                { title: 'Best CRM for dealerships?', subreddit: 'askcarsales', score: 45 },
                { title: 'AI in automotive sales', subreddit: 'technology', score: 128 }
            ]
        });
    }

    try {
        const posts = await reddit.getSubreddit('askcarsales').getHot({ limit: 10 });
        res.json({
            source: 'Reddit',
            posts: posts.map(post => ({
                title: post.title,
                subreddit: post.subreddit_name_prefixed,
                score: post.score,
                url: post.url
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Reddit data' });
    }
});

// ConvAI CLI integration
app.post('/api/convai/command', authenticateToken, async (req, res) => {
    const { command } = req.body;
    
    // Simulate ConvAI CLI commands
    const responses = {
        'list': {
            output: `Active Agents:
1. dealer-logic-reception (active) - 487 calls today
2. dealer-logic-sales (active) - 234 calls today
3. dealer-logic-service (active) - 156 calls today
4. dealer-logic-parts (active) - 89 calls today
5. dealer-logic-after-hours (active) - 45 calls today`,
            agents: 9
        },
        'deploy': {
            output: 'Deploying new agent "dealer-logic-custom"...\nAgent deployed successfully!',
            success: true
        },
        'monitor': {
            output: 'Starting real-time monitoring...\nConnected to ElevenLabs ConvAI stream',
            streaming: true
        },
        'test': {
            output: 'Initiating test call to +1-480-555-1234...\nCall connected. Agent responding.',
            callId: 'TEST-' + Date.now()
        }
    };

    const response = responses[command] || { output: 'Unknown command', error: true };
    res.json(response);
});

// Analytics endpoints
app.get('/api/analytics/overview', authenticateToken, (req, res) => {
    res.json({
        totalCalls: 1247,
        leadsGenerated: 342,
        appointments: 89,
        conversionRate: 27.4,
        agentPerformance: [
            { agent: 'Reception', calls: 487 },
            { agent: 'Sales', calls: 234 },
            { agent: 'Service', calls: 156 },
            { agent: 'Parts', calls: 89 },
            { agent: 'After Hours', calls: 45 }
        ],
        weeklyTrend: [165, 189, 156, 178, 201, 145, 187]
    });
});

app.post('/api/sync', authenticateToken, (req, res) => {
    // Simulate data sync
    setTimeout(() => {
        res.json({ success: true, synced: new Date().toISOString() });
    }, 1000);
});

// Middleware for authentication
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`
    ================================================
    Dealer Logic Platform
    ================================================
    🚀 Server running on port ${PORT}
    🌐 Access at http://localhost:${PORT}
    📊 Dashboard at http://localhost:${PORT}/dashboard
    
    Features:
    ✅ Modern UI with Tailwind CSS
    ✅ Dealer authentication system
    ✅ Real-time dashboard
    ✅ GitHub/Reddit data integration
    ✅ ConvAI CLI integration ready
    ✅ SQLite database initialized
    
    Default login:
    Email: demo@dealerlogic.io
    Password: demo123
    ================================================
    `);
});

module.exports = app;