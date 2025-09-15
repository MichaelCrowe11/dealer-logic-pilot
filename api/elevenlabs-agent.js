// ElevenLabs Conversational AI Agent Configuration
// Dealer Logic Voice Assistant for Customer Service

const axios = require('axios');

class DealerVoiceAgent {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.agentId = config.agentId;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.webhookUrl = config.webhookUrl;

    // Agent personality and capabilities
    this.agentConfig = {
      name: 'Dealer Logic Assistant',
      voice_id: config.voiceId || 'rachel', // Professional female voice
      language: 'en-US',
      temperature: 0.7,

      // System prompt for the agent
      system_prompt: `You are a professional automotive dealership assistant for Dealer Logic Arizona.

      ## Your Role
      - Greet customers warmly and professionally
      - Help with vehicle inventory inquiries
      - Schedule service appointments
      - Provide trade-in estimates
      - Connect customers with the right department

      ## Available Information
      - Current inventory: Access via inventory_search tool
      - Service availability: Check via service_calendar tool
      - Pricing information: Available for all vehicles
      - Financing options: Can provide general information

      ## Guidelines
      - Always be helpful and courteous
      - If unsure, offer to connect with a human specialist
      - Collect customer contact info for follow-up
      - Mention current promotions when relevant

      ## Tools Available
      - inventory_search: Search available vehicles
      - schedule_service: Book service appointments
      - check_trade_value: Estimate trade-in values
      - transfer_to_human: Connect to sales/service team`,

      // Agent workflows
      workflows: {
        greeting: {
          trigger: 'conversation_start',
          response: 'Thank you for calling Dealer Logic Arizona! How may I assist you today?'
        },

        inventory_inquiry: {
          trigger: ['looking for', 'do you have', 'availability', 'in stock'],
          action: 'inventory_search'
        },

        service_booking: {
          trigger: ['service', 'appointment', 'maintenance', 'repair'],
          action: 'schedule_service'
        },

        trade_in: {
          trigger: ['trade', 'sell my car', 'value of my'],
          action: 'check_trade_value'
        }
      },

      // Knowledge base integration
      knowledge_base: {
        source: 'dealer_inventory_db',
        update_frequency: 'realtime',
        categories: [
          'vehicles',
          'services',
          'financing',
          'promotions',
          'dealership_info'
        ]
      }
    };
  }

  // Create or update the agent configuration
  async setupAgent() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/conversational-ai/agents`,
        {
          name: this.agentConfig.name,
          system_prompt: this.agentConfig.system_prompt,
          voice_settings: {
            voice_id: this.agentConfig.voice_id,
            stability: 0.8,
            similarity_boost: 0.75
          },
          tools: this.getToolsConfiguration(),
          webhooks: {
            post_call_transcription: `${this.webhookUrl}/transcription`,
            post_call_audio: `${this.webhookUrl}/audio`
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error setting up agent:', error.response?.data || error.message);
      throw error;
    }
  }

  // Configure agent tools (webhooks for external actions)
  getToolsConfiguration() {
    return [
      {
        name: 'inventory_search',
        description: 'Search available vehicle inventory',
        type: 'webhook',
        webhook_url: `${this.webhookUrl}/tools/inventory`,
        parameters: {
          make: { type: 'string', description: 'Vehicle manufacturer' },
          model: { type: 'string', description: 'Vehicle model' },
          year: { type: 'number', description: 'Model year' },
          price_max: { type: 'number', description: 'Maximum price' },
          type: { type: 'string', description: 'Vehicle type (SUV, Sedan, Truck, etc.)' }
        }
      },
      {
        name: 'schedule_service',
        description: 'Schedule a service appointment',
        type: 'webhook',
        webhook_url: `${this.webhookUrl}/tools/service`,
        parameters: {
          service_type: { type: 'string', description: 'Type of service needed' },
          preferred_date: { type: 'string', description: 'Preferred appointment date' },
          vehicle_info: { type: 'string', description: 'Vehicle year, make, and model' },
          customer_name: { type: 'string', description: 'Customer name' },
          phone: { type: 'string', description: 'Contact phone number' }
        }
      },
      {
        name: 'check_trade_value',
        description: 'Estimate trade-in value for a vehicle',
        type: 'webhook',
        webhook_url: `${this.webhookUrl}/tools/trade`,
        parameters: {
          year: { type: 'number', description: 'Vehicle year' },
          make: { type: 'string', description: 'Vehicle manufacturer' },
          model: { type: 'string', description: 'Vehicle model' },
          mileage: { type: 'number', description: 'Current mileage' },
          condition: { type: 'string', description: 'Vehicle condition (excellent, good, fair)' }
        }
      },
      {
        name: 'transfer_to_human',
        description: 'Transfer call to human representative',
        type: 'webhook',
        webhook_url: `${this.webhookUrl}/tools/transfer`,
        parameters: {
          department: { type: 'string', description: 'Department to transfer to' },
          reason: { type: 'string', description: 'Reason for transfer' },
          customer_info: { type: 'object', description: 'Customer information collected' }
        }
      }
    ];
  }

  // Start a conversation session
  async startConversation(sessionConfig = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/conversational-ai/conversations`,
        {
          agent_id: this.agentId,
          ...sessionConfig
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error starting conversation:', error.response?.data || error.message);
      throw error;
    }
  }

  // Handle post-call analytics
  async processCallAnalytics(callData) {
    const analytics = {
      call_id: callData.call_id,
      duration: callData.duration,
      customer_sentiment: this.analyzeSentiment(callData.transcript),
      intent_detected: callData.intent,
      tools_used: callData.tools_triggered,
      resolution_status: callData.resolution,
      follow_up_required: this.determineFollowUp(callData)
    };

    return analytics;
  }

  // Sentiment analysis helper
  analyzeSentiment(transcript) {
    // Simple sentiment keywords analysis
    const positiveWords = ['great', 'excellent', 'perfect', 'wonderful', 'amazing', 'helpful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointed', 'frustrated'];

    let score = 0;
    const words = transcript.toLowerCase().split(' ');

    words.forEach(word => {
      if (positiveWords.includes(word)) score++;
      if (negativeWords.includes(word)) score--;
    });

    if (score > 2) return 'positive';
    if (score < -2) return 'negative';
    return 'neutral';
  }

  // Determine if follow-up is needed
  determineFollowUp(callData) {
    const followUpTriggers = [
      'call me back',
      'follow up',
      'get back to me',
      'need to think',
      'discuss with',
      'send me information'
    ];

    const transcript = callData.transcript?.toLowerCase() || '';
    return followUpTriggers.some(trigger => transcript.includes(trigger));
  }
}

module.exports = DealerVoiceAgent;