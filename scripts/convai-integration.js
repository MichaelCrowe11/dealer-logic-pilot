#!/usr/bin/env node

const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ConvAI CLI Integration for ElevenLabs
class ConvAIIntegration {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY || '';
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        this.agents = [];
        this.activeConnections = new Map();
    }

    // Initialize ConvAI CLI
    async initialize() {
        console.log('🎙️ Initializing ElevenLabs ConvAI CLI Integration...');
        
        // Check if convai CLI is installed
        const isInstalled = await this.checkCLI();
        if (!isInstalled) {
            console.log('📦 Installing ConvAI CLI...');
            await this.installCLI();
        }

        // Authenticate with ElevenLabs
        if (this.apiKey) {
            await this.authenticate();
        }

        // Load agent configurations
        this.loadAgentConfigs();
        
        console.log('✅ ConvAI Integration ready');
        return true;
    }

    // Check if ConvAI CLI is installed
    checkCLI() {
        return new Promise((resolve) => {
            const convai = spawn('convai', ['--version'], { shell: true });
            convai.on('error', () => resolve(false));
            convai.on('exit', (code) => resolve(code === 0));
        });
    }

    // Install ConvAI CLI
    installCLI() {
        return new Promise((resolve, reject) => {
            console.log('Installing ElevenLabs ConvAI CLI...');
            const install = spawn('npm', ['install', '-g', '@elevenlabs/convai-cli'], { shell: true });
            
            install.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            install.on('exit', (code) => {
                if (code === 0) {
                    console.log('✅ ConvAI CLI installed successfully');
                    resolve();
                } else {
                    reject(new Error('Failed to install ConvAI CLI'));
                }
            });
        });
    }

    // Authenticate with ElevenLabs
    async authenticate() {
        try {
            const response = await axios.get(`${this.baseUrl}/user`, {
                headers: { 'xi-api-key': this.apiKey }
            });
            console.log(`✅ Authenticated as: ${response.data.xi_api_key_label}`);
            return true;
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            return false;
        }
    }

    // Load agent configurations
    loadAgentConfigs() {
        const configPath = path.join(__dirname, '../config/agents.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.agents = config.agents || [];
            console.log(`📋 Loaded ${this.agents.length} agent configurations`);
        }
    }

    // Deploy an agent via CLI
    deployAgent(agentConfig) {
        return new Promise((resolve, reject) => {
            const agentJson = JSON.stringify(agentConfig);
            const convai = spawn('convai', ['agent', 'deploy', '--config', '-'], { shell: true });
            
            convai.stdin.write(agentJson);
            convai.stdin.end();

            let output = '';
            convai.stdout.on('data', (data) => {
                output += data.toString();
            });

            convai.on('exit', (code) => {
                if (code === 0) {
                    const agentId = this.parseAgentId(output);
                    console.log(`✅ Agent deployed: ${agentId}`);
                    resolve({ success: true, agentId, output });
                } else {
                    reject(new Error('Failed to deploy agent'));
                }
            });
        });
    }

    // List all agents
    listAgents() {
        return new Promise((resolve) => {
            const convai = spawn('convai', ['agent', 'list'], { shell: true });
            
            let output = '';
            convai.stdout.on('data', (data) => {
                output += data.toString();
            });

            convai.on('exit', () => {
                const agents = this.parseAgentList(output);
                resolve(agents);
            });
        });
    }

    // Start monitoring calls
    startMonitoring(agentId) {
        return new Promise((resolve) => {
            const monitor = spawn('convai', ['monitor', '--agent', agentId, '--realtime'], { shell: true });
            
            this.activeConnections.set(agentId, monitor);

            monitor.stdout.on('data', (data) => {
                const event = this.parseMonitorEvent(data.toString());
                if (event) {
                    this.handleMonitorEvent(agentId, event);
                }
            });

            monitor.on('exit', () => {
                this.activeConnections.delete(agentId);
            });

            resolve({ success: true, message: `Monitoring started for agent ${agentId}` });
        });
    }

    // Stop monitoring
    stopMonitoring(agentId) {
        const monitor = this.activeConnections.get(agentId);
        if (monitor) {
            monitor.kill();
            this.activeConnections.delete(agentId);
            return { success: true, message: `Monitoring stopped for agent ${agentId}` };
        }
        return { success: false, message: 'No active monitoring for this agent' };
    }

    // Test call to agent
    makeTestCall(agentId, phoneNumber) {
        return new Promise((resolve) => {
            const convai = spawn('convai', ['test', '--agent', agentId, '--phone', phoneNumber], { shell: true });
            
            let output = '';
            convai.stdout.on('data', (data) => {
                output += data.toString();
            });

            convai.on('exit', (code) => {
                if (code === 0) {
                    const callId = this.parseCallId(output);
                    resolve({ success: true, callId, output });
                } else {
                    resolve({ success: false, error: 'Test call failed' });
                }
            });
        });
    }

    // Parse agent ID from deployment output
    parseAgentId(output) {
        const match = output.match(/Agent ID: ([a-zA-Z0-9-]+)/);
        return match ? match[1] : 'unknown';
    }

    // Parse agent list from CLI output
    parseAgentList(output) {
        const lines = output.split('\n');
        const agents = [];
        
        lines.forEach(line => {
            if (line.includes('agent.')) {
                const parts = line.split(/\s+/);
                agents.push({
                    id: parts[0],
                    name: parts[1],
                    status: parts[2],
                    calls: parseInt(parts[3]) || 0
                });
            }
        });
        
        return agents;
    }

    // Parse monitoring events
    parseMonitorEvent(data) {
        try {
            // ConvAI outputs JSON events
            return JSON.parse(data);
        } catch {
            // Parse text format
            if (data.includes('CALL_START')) {
                return { type: 'call_start', timestamp: new Date() };
            } else if (data.includes('CALL_END')) {
                return { type: 'call_end', timestamp: new Date() };
            }
        }
        return null;
    }

    // Handle monitoring events
    handleMonitorEvent(agentId, event) {
        console.log(`📊 [${agentId}] Event:`, event);
        
        // Send to dashboard via WebSocket
        if (this.websocket) {
            this.websocket.send(JSON.stringify({
                type: 'monitor_event',
                agentId,
                event
            }));
        }

        // Store in database
        this.storeEvent(agentId, event);
    }

    // Store event in database
    storeEvent(agentId, event) {
        // This would connect to your database
        const eventLog = {
            agentId,
            type: event.type,
            timestamp: event.timestamp || new Date(),
            data: event
        };
        
        // For now, just log it
        console.log('📝 Storing event:', eventLog);
    }

    // CLI command execution
    async executeCommand(command, args = []) {
        return new Promise((resolve, reject) => {
            const convai = spawn('convai', [command, ...args], { shell: true });
            
            let output = '';
            let error = '';
            
            convai.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            convai.stderr.on('data', (data) => {
                error += data.toString();
            });

            convai.on('exit', (code) => {
                if (code === 0) {
                    resolve({ success: true, output });
                } else {
                    reject({ success: false, error: error || 'Command failed' });
                }
            });
        });
    }
}

// Export for use in other modules
module.exports = ConvAIIntegration;

// Run if called directly
if (require.main === module) {
    const integration = new ConvAIIntegration();
    
    // CLI interface
    const args = process.argv.slice(2);
    const command = args[0];

    const commands = {
        'init': () => integration.initialize(),
        'list': async () => {
            const agents = await integration.listAgents();
            console.log('Active Agents:', agents);
        },
        'deploy': async () => {
            const config = {
                name: args[1] || 'dealer-logic-agent',
                voice: 'EXAVITQu4vr4xnSDxMaL',
                firstMessage: 'Thank you for calling. How may I assist you today?'
            };
            const result = await integration.deployAgent(config);
            console.log('Deployment result:', result);
        },
        'monitor': async () => {
            const agentId = args[1] || 'agent.reception';
            const result = await integration.startMonitoring(agentId);
            console.log('Monitoring:', result);
        },
        'test': async () => {
            const agentId = args[1] || 'agent.reception';
            const phone = args[2] || '+14805551234';
            const result = await integration.makeTestCall(agentId, phone);
            console.log('Test call:', result);
        }
    };

    if (commands[command]) {
        commands[command]().catch(console.error);
    } else {
        console.log(`
ConvAI CLI Integration for Dealer Logic

Usage:
  node convai-integration.js <command> [options]

Commands:
  init              Initialize ConvAI integration
  list              List all active agents
  deploy [name]     Deploy a new agent
  monitor [agent]   Start monitoring an agent
  test [agent] [phone]  Make a test call

Examples:
  node convai-integration.js init
  node convai-integration.js list
  node convai-integration.js deploy dealer-sales
  node convai-integration.js monitor agent.reception
  node convai-integration.js test agent.sales +14805551234
        `);
    }
}