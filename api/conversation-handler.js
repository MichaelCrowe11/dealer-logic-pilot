// Conversation Handler with CRM Integration
// Manages real-time voice conversations and CRM updates

const express = require('express');
const router = express.Router();
const DealerVoiceAgent = require('./elevenlabs-agent');

// Initialize agent with configuration
const agentConfig = {
  apiKey: process.env.ELEVENLABS_API_KEY,
  agentId: process.env.ELEVENLABS_AGENT_ID,
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'rachel',
  webhookUrl: process.env.WEBHOOK_BASE_URL || 'https://api.dealerlogic.com'
};

const voiceAgent = new DealerVoiceAgent(agentConfig);

// CRM Integration class
class CRMIntegration {
  constructor() {
    this.crmEndpoint = process.env.CRM_API_ENDPOINT;
    this.crmApiKey = process.env.CRM_API_KEY;
  }

  // Create or update customer record
  async upsertCustomer(customerData) {
    const customer = {
      phone: customerData.phone,
      name: customerData.name,
      email: customerData.email,
      last_contact: new Date(),
      preferences: customerData.preferences || {},
      vehicle_interest: customerData.vehicle_interest || [],
      communication_history: []
    };

    // Check if customer exists
    const existing = await this.findCustomerByPhone(customer.phone);

    if (existing) {
      return await this.updateCustomer(existing.id, customer);
    } else {
      return await this.createCustomer(customer);
    }
  }

  async findCustomerByPhone(phone) {
    // Mock implementation - replace with actual CRM API call
    try {
      // Would make API call to CRM
      return null; // Return existing customer or null
    } catch (error) {
      console.error('CRM lookup error:', error);
      return null;
    }
  }

  async createCustomer(customerData) {
    // Mock implementation
    console.log('Creating new CRM customer:', customerData.phone);
    return {
      id: 'CUST' + Date.now(),
      ...customerData,
      created_at: new Date()
    };
  }

  async updateCustomer(customerId, updates) {
    // Mock implementation
    console.log('Updating CRM customer:', customerId);
    return {
      id: customerId,
      ...updates,
      updated_at: new Date()
    };
  }

  // Log conversation in CRM
  async logConversation(conversationData) {
    const activity = {
      type: 'voice_call',
      timestamp: new Date(),
      duration: conversationData.duration,
      summary: conversationData.summary,
      sentiment: conversationData.sentiment,
      outcome: conversationData.outcome,
      follow_up_required: conversationData.follow_up_required,
      agent_type: 'ai_voice',
      recording_url: conversationData.recording_url
    };

    // Add to customer's activity history
    if (conversationData.customer_id) {
      await this.addActivityToCustomer(conversationData.customer_id, activity);
    }

    return activity;
  }

  async addActivityToCustomer(customerId, activity) {
    // Mock implementation
    console.log('Adding activity to customer:', customerId);
    return true;
  }

  // Create lead from conversation
  async createLead(leadData) {
    const lead = {
      source: 'voice_ai',
      status: 'new',
      score: this.calculateLeadScore(leadData),
      contact_info: {
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email
      },
      interests: leadData.interests,
      budget: leadData.budget,
      timeline: leadData.timeline,
      assigned_to: this.assignLeadToAgent(leadData),
      created_at: new Date()
    };

    // Create in CRM
    console.log('Creating lead in CRM:', lead);
    return {
      id: 'LEAD' + Date.now(),
      ...lead
    };
  }

  calculateLeadScore(leadData) {
    let score = 50; // Base score

    // Adjust based on factors
    if (leadData.timeline === 'immediate') score += 30;
    if (leadData.timeline === 'this_month') score += 20;
    if (leadData.budget && leadData.budget > 30000) score += 15;
    if (leadData.trade_in) score += 10;
    if (leadData.financing_interest) score += 10;

    return Math.min(score, 100);
  }

  assignLeadToAgent(leadData) {
    // Round-robin or rule-based assignment
    const salesAgents = ['agent1', 'agent2', 'agent3'];
    const randomIndex = Math.floor(Math.random() * salesAgents.length);
    return salesAgents[randomIndex];
  }

  // Schedule follow-up
  async scheduleFollowUp(followUpData) {
    const task = {
      type: 'follow_up_call',
      customer_id: followUpData.customer_id,
      scheduled_for: followUpData.scheduled_date,
      priority: followUpData.priority || 'normal',
      notes: followUpData.notes,
      assigned_to: followUpData.assigned_to,
      created_at: new Date()
    };

    console.log('Scheduling follow-up:', task);
    return {
      id: 'TASK' + Date.now(),
      ...task
    };
  }
}

const crmIntegration = new CRMIntegration();

// Initialize voice agent on startup
router.post('/initialize', async (req, res) => {
  try {
    const agent = await voiceAgent.setupAgent();
    res.json({
      success: true,
      message: 'Voice agent initialized successfully',
      agent_id: agent.agent_id,
      status: 'ready'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start a new conversation
router.post('/conversation/start', async (req, res) => {
  try {
    const { customer_phone, customer_name, context } = req.body;

    // Look up customer in CRM
    let customer = await crmIntegration.findCustomerByPhone(customer_phone);

    // Start conversation with context
    const conversation = await voiceAgent.startConversation({
      metadata: {
        customer_id: customer?.id,
        customer_name: customer_name || customer?.name,
        customer_phone,
        context,
        existing_customer: !!customer
      }
    });

    res.json({
      success: true,
      conversation_id: conversation.conversation_id,
      session_url: conversation.session_url,
      customer_id: customer?.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Handle conversation completion
router.post('/conversation/complete', async (req, res) => {
  try {
    const { conversation_id, call_data } = req.body;

    // Process call analytics
    const analytics = await voiceAgent.processCallAnalytics(call_data);

    // Extract customer information
    const customerInfo = extractCustomerInfo(call_data);

    // Update or create customer in CRM
    const customer = await crmIntegration.upsertCustomer(customerInfo);

    // Log conversation in CRM
    const conversation = await crmIntegration.logConversation({
      customer_id: customer.id,
      conversation_id,
      duration: analytics.duration,
      summary: generateConversationSummary(call_data),
      sentiment: analytics.customer_sentiment,
      outcome: determineOutcome(call_data),
      follow_up_required: analytics.follow_up_required,
      recording_url: call_data.recording_url
    });

    // Create lead if applicable
    if (shouldCreateLead(call_data)) {
      const leadData = extractLeadData(call_data);
      const lead = await crmIntegration.createLead({
        ...leadData,
        customer_id: customer.id
      });

      // Schedule follow-up if needed
      if (analytics.follow_up_required) {
        await crmIntegration.scheduleFollowUp({
          customer_id: customer.id,
          lead_id: lead.id,
          scheduled_date: calculateFollowUpDate(call_data),
          priority: lead.score > 70 ? 'high' : 'normal',
          notes: `Follow up on ${leadData.interests.join(', ')}`,
          assigned_to: lead.assigned_to
        });
      }
    }

    res.json({
      success: true,
      customer_id: customer.id,
      analytics,
      crm_updated: true
    });
  } catch (error) {
    console.error('Conversation completion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get conversation status
router.get('/conversation/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    // Would fetch from ElevenLabs API
    const status = {
      conversation_id: id,
      status: 'active',
      duration: 120,
      tools_triggered: ['inventory_search', 'schedule_service']
    };

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions

function extractCustomerInfo(callData) {
  // Extract customer details from call transcript and metadata
  return {
    phone: callData.customer_phone,
    name: callData.customer_name || extractNameFromTranscript(callData.transcript),
    email: extractEmailFromTranscript(callData.transcript),
    preferences: {
      communication_channel: 'voice',
      best_time_to_call: 'morning'
    },
    vehicle_interest: extractVehicleInterest(callData)
  };
}

function extractNameFromTranscript(transcript) {
  // Simple pattern matching - would use NLP in production
  const namePattern = /my name is ([A-Za-z]+ [A-Za-z]+)/i;
  const match = transcript?.match(namePattern);
  return match ? match[1] : null;
}

function extractEmailFromTranscript(transcript) {
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
  const match = transcript?.match(emailPattern);
  return match ? match[0] : null;
}

function extractVehicleInterest(callData) {
  const interests = [];

  if (callData.tools_triggered?.includes('inventory_search')) {
    // Extract from tool parameters
    const searchParams = callData.tool_parameters?.inventory_search;
    if (searchParams) {
      interests.push(`${searchParams.year || ''} ${searchParams.make || ''} ${searchParams.model || ''}`.trim());
    }
  }

  return interests;
}

function generateConversationSummary(callData) {
  const tools = callData.tools_triggered || [];
  const actions = [];

  if (tools.includes('inventory_search')) actions.push('searched inventory');
  if (tools.includes('schedule_service')) actions.push('scheduled service');
  if (tools.includes('check_trade_value')) actions.push('inquired about trade-in');
  if (tools.includes('transfer_to_human')) actions.push('transferred to agent');

  return `Customer ${actions.join(', ')}. Call duration: ${callData.duration} seconds.`;
}

function determineOutcome(callData) {
  if (callData.tools_triggered?.includes('schedule_service')) return 'appointment_scheduled';
  if (callData.tools_triggered?.includes('transfer_to_human')) return 'transferred_to_agent';
  if (callData.resolution) return 'resolved';
  return 'information_provided';
}

function shouldCreateLead(callData) {
  // Create lead if customer showed buying interest
  const leadIndicators = [
    'inventory_search',
    'check_trade_value',
    'financing'
  ];

  return callData.tools_triggered?.some(tool => leadIndicators.includes(tool));
}

function extractLeadData(callData) {
  return {
    name: callData.customer_name,
    phone: callData.customer_phone,
    email: extractEmailFromTranscript(callData.transcript),
    interests: extractVehicleInterest(callData),
    budget: extractBudgetFromTranscript(callData.transcript),
    timeline: extractTimelineFromTranscript(callData.transcript),
    trade_in: callData.tools_triggered?.includes('check_trade_value'),
    financing_interest: callData.transcript?.toLowerCase().includes('financ')
  };
}

function extractBudgetFromTranscript(transcript) {
  // Extract price mentions
  const pricePattern = /\$?(\d{1,3},?\d{3})/;
  const match = transcript?.match(pricePattern);
  return match ? parseInt(match[1].replace(',', '')) : null;
}

function extractTimelineFromTranscript(transcript) {
  const lowerTranscript = transcript?.toLowerCase() || '';

  if (lowerTranscript.includes('today') || lowerTranscript.includes('now')) return 'immediate';
  if (lowerTranscript.includes('this week')) return 'this_week';
  if (lowerTranscript.includes('this month')) return 'this_month';
  if (lowerTranscript.includes('next month')) return 'next_month';

  return 'exploring';
}

function calculateFollowUpDate(callData) {
  const timeline = extractTimelineFromTranscript(callData.transcript);
  const followUpDate = new Date();

  switch(timeline) {
    case 'immediate':
      followUpDate.setDate(followUpDate.getDate() + 1);
      break;
    case 'this_week':
      followUpDate.setDate(followUpDate.getDate() + 3);
      break;
    case 'this_month':
      followUpDate.setDate(followUpDate.getDate() + 7);
      break;
    default:
      followUpDate.setDate(followUpDate.getDate() + 14);
  }

  return followUpDate;
}

module.exports = router;