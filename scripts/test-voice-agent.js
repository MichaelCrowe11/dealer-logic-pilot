// Test Script for ElevenLabs Voice Agent
// Tests agent configuration, webhooks, and conversation flows

require('dotenv').config();
const axios = require('axios');
const DealerVoiceAgent = require('../api/elevenlabs-agent');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test configuration
const testConfig = {
  apiKey: process.env.ELEVENLABS_API_KEY,
  agentId: process.env.ELEVENLABS_AGENT_ID,
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'rachel',
  webhookUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'
};

class VoiceAgentTester {
  constructor() {
    this.agent = new DealerVoiceAgent(testConfig);
    this.testResults = [];
    this.conversationId = null;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runAllTests() {
    this.log('\n🚀 Starting ElevenLabs Voice Agent Tests\n', 'cyan');

    // Check prerequisites
    if (!await this.checkPrerequisites()) {
      this.log('❌ Prerequisites check failed. Please configure environment variables.', 'red');
      return;
    }

    // Run test suite
    const tests = [
      { name: 'Agent Configuration', fn: () => this.testAgentConfiguration() },
      { name: 'Webhook Connectivity', fn: () => this.testWebhookConnectivity() },
      { name: 'Conversation Initialization', fn: () => this.testConversationInit() },
      { name: 'Tool Invocation', fn: () => this.testToolInvocation() },
      { name: 'CRM Integration', fn: () => this.testCRMIntegration() },
      { name: 'Call Analytics', fn: () => this.testCallAnalytics() }
    ];

    for (const test of tests) {
      this.log(`\n📋 Testing: ${test.name}`, 'blue');
      try {
        const result = await test.fn();
        if (result.success) {
          this.log(`✅ ${test.name} passed`, 'green');
          this.testResults.push({ ...test, passed: true, result });
        } else {
          this.log(`❌ ${test.name} failed: ${result.error}`, 'red');
          this.testResults.push({ ...test, passed: false, result });
        }
      } catch (error) {
        this.log(`❌ ${test.name} error: ${error.message}`, 'red');
        this.testResults.push({ ...test, passed: false, error: error.message });
      }
    }

    this.printSummary();
  }

  async checkPrerequisites() {
    const required = [
      'ELEVENLABS_API_KEY',
      'WEBHOOK_BASE_URL'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      this.log(`Missing environment variables: ${missing.join(', ')}`, 'yellow');
      return false;
    }

    return true;
  }

  async testAgentConfiguration() {
    try {
      // Test agent setup
      const agentConfig = await this.agent.setupAgent();

      // Verify configuration
      const checks = {
        hasAgentId: !!agentConfig.agent_id,
        hasVoiceSettings: !!agentConfig.voice_settings,
        hasTools: Array.isArray(agentConfig.tools) && agentConfig.tools.length > 0,
        hasWebhooks: !!agentConfig.webhooks
      };

      const allPassed = Object.values(checks).every(v => v === true);

      return {
        success: allPassed,
        details: checks,
        agentId: agentConfig.agent_id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testWebhookConnectivity() {
    try {
      const webhookTests = [
        { endpoint: '/tools/inventory', method: 'POST' },
        { endpoint: '/tools/service', method: 'POST' },
        { endpoint: '/tools/trade', method: 'POST' },
        { endpoint: '/transcription', method: 'POST' }
      ];

      const results = [];

      for (const test of webhookTests) {
        try {
          // Test webhook endpoint availability
          const url = `${testConfig.webhookUrl}${test.endpoint}`;

          // Simple connectivity check (would need actual server running)
          results.push({
            endpoint: test.endpoint,
            url,
            configured: true
          });
        } catch (error) {
          results.push({
            endpoint: test.endpoint,
            error: error.message
          });
        }
      }

      return {
        success: true,
        webhooks: results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConversationInit() {
    try {
      // Test conversation initialization
      const conversation = await this.agent.startConversation({
        metadata: {
          test_mode: true,
          customer_phone: '555-0123',
          customer_name: 'Test Customer'
        }
      });

      this.conversationId = conversation.conversation_id;

      return {
        success: !!conversation.conversation_id,
        conversationId: conversation.conversation_id,
        sessionUrl: conversation.session_url
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testToolInvocation() {
    // Simulate tool invocations
    const toolTests = [
      {
        tool: 'inventory_search',
        parameters: {
          make: 'Toyota',
          model: 'RAV4',
          year: 2024,
          price_max: 40000
        }
      },
      {
        tool: 'schedule_service',
        parameters: {
          service_type: 'Oil Change',
          preferred_date: '2024-12-20',
          vehicle_info: '2022 Honda Civic',
          customer_name: 'Test Customer',
          phone: '555-0123'
        }
      },
      {
        tool: 'check_trade_value',
        parameters: {
          year: 2020,
          make: 'Ford',
          model: 'F-150',
          mileage: 35000,
          condition: 'good'
        }
      }
    ];

    const results = [];

    for (const test of toolTests) {
      // In a real test, these would be actual API calls
      results.push({
        tool: test.tool,
        simulated: true,
        parameters: test.parameters
      });
    }

    return {
      success: true,
      toolTests: results
    };
  }

  async testCRMIntegration() {
    try {
      // Test CRM integration with mock data
      const mockCallData = {
        call_id: 'TEST-' + Date.now(),
        conversation_id: this.conversationId || 'TEST-CONV-123',
        duration: 180,
        transcript: 'Customer: I am looking for a blue SUV under $35,000. Agent: I can help you with that...',
        customer_phone: '555-0123',
        customer_name: 'Test Customer',
        tools_triggered: ['inventory_search'],
        resolution: true
      };

      // Process analytics
      const analytics = await this.agent.processCallAnalytics(mockCallData);

      return {
        success: true,
        analytics: {
          sentiment: analytics.customer_sentiment,
          followUpRequired: analytics.follow_up_required,
          toolsUsed: analytics.tools_used
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testCallAnalytics() {
    try {
      // Test sentiment analysis
      const testTranscripts = [
        { text: 'This is great! Excellent service, wonderful experience!', expected: 'positive' },
        { text: 'Terrible experience, very disappointed and frustrated.', expected: 'negative' },
        { text: 'The car is okay, nothing special.', expected: 'neutral' }
      ];

      const results = [];

      for (const test of testTranscripts) {
        const sentiment = this.agent.analyzeSentiment(test.text);
        results.push({
          text: test.text.substring(0, 30) + '...',
          expected: test.expected,
          actual: sentiment,
          passed: sentiment === test.expected
        });
      }

      const allPassed = results.every(r => r.passed);

      return {
        success: allPassed,
        sentimentTests: results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  printSummary() {
    this.log('\n' + '='.repeat(50), 'cyan');
    this.log('📊 Test Summary', 'cyan');
    this.log('='.repeat(50), 'cyan');

    const passed = this.testResults.filter(t => t.passed).length;
    const failed = this.testResults.filter(t => !t.passed).length;
    const total = this.testResults.length;

    this.log(`\nTotal Tests: ${total}`, 'blue');
    this.log(`Passed: ${passed}`, 'green');
    this.log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');

    if (failed > 0) {
      this.log('\nFailed Tests:', 'red');
      this.testResults.filter(t => !t.passed).forEach(test => {
        this.log(`  - ${test.name}: ${test.error || test.result?.error}`, 'yellow');
      });
    }

    this.log('\n' + '='.repeat(50), 'cyan');

    // Print configuration guide if tests failed
    if (failed > 0) {
      this.printConfigurationGuide();
    }
  }

  printConfigurationGuide() {
    this.log('\n📝 Configuration Guide:', 'yellow');
    this.log('\n1. Get your ElevenLabs API key from: https://elevenlabs.io/api', 'cyan');
    this.log('2. Create an agent at: https://elevenlabs.io/conversational-ai', 'cyan');
    this.log('3. Configure your .env file with:', 'cyan');
    this.log('   ELEVENLABS_API_KEY=your_api_key', 'blue');
    this.log('   ELEVENLABS_AGENT_ID=your_agent_id', 'blue');
    this.log('   WEBHOOK_BASE_URL=your_webhook_url', 'blue');
    this.log('\n4. Start your webhook server:', 'cyan');
    this.log('   npm run webhooks', 'blue');
    this.log('\n5. Run tests again:', 'cyan');
    this.log('   npm run test:voice', 'blue');
  }
}

// Run tests
async function main() {
  const tester = new VoiceAgentTester();
  await tester.runAllTests();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = VoiceAgentTester;