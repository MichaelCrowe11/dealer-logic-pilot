// Webhook Endpoints for ElevenLabs Agent Tools
// Handles real-time actions during voice conversations

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Verify webhook signature for security
function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
}

// Middleware to verify ElevenLabs webhooks
const verifyElevenLabs = (req, res, next) => {
  const signature = req.headers['x-elevenlabs-signature'];
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (secret && signature) {
    if (!verifyWebhookSignature(req.body, signature, secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }
  next();
};

// Tool: Inventory Search
router.post('/tools/inventory', verifyElevenLabs, async (req, res) => {
  try {
    const { make, model, year, price_max, type } = req.body.parameters;

    // Mock inventory search - replace with actual database query
    const inventory = await searchInventory({ make, model, year, price_max, type });

    // Format response for voice agent
    if (inventory.length === 0) {
      return res.json({
        success: true,
        message: "I couldn't find any vehicles matching your criteria, but I can help you explore other options or place a custom order.",
        data: []
      });
    }

    const topMatches = inventory.slice(0, 3);
    const responseMessage = `I found ${inventory.length} vehicles matching your search. Here are the top options: ${
      topMatches.map(v =>
        `A ${v.year} ${v.make} ${v.model} for $${v.price.toLocaleString()}, with ${v.mileage.toLocaleString()} miles`
      ).join('; ')
    }. Would you like more details on any of these?`;

    res.json({
      success: true,
      message: responseMessage,
      data: topMatches
    });
  } catch (error) {
    console.error('Inventory search error:', error);
    res.json({
      success: false,
      message: "I'm having trouble searching our inventory right now. Let me connect you with someone who can help.",
      transfer_to_human: true
    });
  }
});

// Tool: Schedule Service Appointment
router.post('/tools/service', verifyElevenLabs, async (req, res) => {
  try {
    const { service_type, preferred_date, vehicle_info, customer_name, phone } = req.body.parameters;

    // Check service availability
    const availability = await checkServiceAvailability(preferred_date, service_type);

    if (!availability.available) {
      const alternativeDates = await getAlternativeServiceDates(preferred_date, service_type);
      return res.json({
        success: true,
        message: `I don't have availability on ${preferred_date}, but I can offer you ${alternativeDates.join(' or ')}. Which would work better for you?`,
        data: { alternative_dates: alternativeDates }
      });
    }

    // Book the appointment
    const appointment = await createServiceAppointment({
      service_type,
      date: preferred_date,
      vehicle: vehicle_info,
      customer: { name: customer_name, phone },
      time_slot: availability.next_available_slot
    });

    res.json({
      success: true,
      message: `Perfect! I've scheduled your ${service_type} appointment for ${preferred_date} at ${appointment.time}. You'll receive a confirmation text at ${phone}. Is there anything else I can help you with?`,
      data: appointment
    });
  } catch (error) {
    console.error('Service scheduling error:', error);
    res.json({
      success: false,
      message: "I'm having trouble accessing our service calendar. Let me transfer you to our service department.",
      transfer_to_human: true,
      department: 'service'
    });
  }
});

// Tool: Check Trade-In Value
router.post('/tools/trade', verifyElevenLabs, async (req, res) => {
  try {
    const { year, make, model, mileage, condition } = req.body.parameters;

    // Get trade-in valuation
    const valuation = await getTradeInValue({ year, make, model, mileage, condition });

    const rangeMessage = `Based on a ${year} ${make} ${model} with ${mileage.toLocaleString()} miles in ${condition} condition,
    I can offer you an estimated trade-in value between $${valuation.min.toLocaleString()} and $${valuation.max.toLocaleString()}.
    The final value depends on our in-person inspection. Would you like to schedule an appraisal appointment?`;

    res.json({
      success: true,
      message: rangeMessage,
      data: {
        min_value: valuation.min,
        max_value: valuation.max,
        average_value: valuation.average,
        factors: valuation.factors
      }
    });
  } catch (error) {
    console.error('Trade-in valuation error:', error);
    res.json({
      success: false,
      message: "I need a bit more information to provide an accurate trade-in value. Let me connect you with our appraisal team.",
      transfer_to_human: true,
      department: 'appraisal'
    });
  }
});

// Tool: Transfer to Human
router.post('/tools/transfer', verifyElevenLabs, async (req, res) => {
  try {
    const { department, reason, customer_info } = req.body.parameters;

    // Log transfer request and queue for human agent
    const transferRequest = await queueForHumanAgent({
      department,
      reason,
      customer_info,
      timestamp: new Date(),
      conversation_id: req.body.conversation_id
    });

    const departmentPhone = {
      sales: '555-0101',
      service: '555-0102',
      finance: '555-0103',
      appraisal: '555-0104',
      general: '555-0100'
    };

    res.json({
      success: true,
      message: `I'll transfer you to our ${department} team right away. If we get disconnected, you can reach them directly at ${departmentPhone[department] || departmentPhone.general}. Please hold while I connect you.`,
      action: 'transfer',
      transfer_number: departmentPhone[department] || departmentPhone.general,
      data: transferRequest
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.json({
      success: true,
      message: "I'll get someone to help you right away. Please hold.",
      action: 'transfer',
      transfer_number: '555-0100'
    });
  }
});

// Post-call webhook: Transcription
router.post('/transcription', verifyElevenLabs, async (req, res) => {
  try {
    const { call_id, transcript, duration, metadata } = req.body;

    // Store transcription for analytics and CRM
    await storeCallTranscript({
      call_id,
      transcript,
      duration,
      metadata,
      timestamp: new Date()
    });

    // Extract key information for CRM
    const leadInfo = extractLeadInformation(transcript, metadata);
    if (leadInfo.has_contact_info) {
      await createCRMLead(leadInfo);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Transcription webhook error:', error);
    res.status(200).json({ received: true, error: error.message });
  }
});

// Post-call webhook: Audio
router.post('/audio', verifyElevenLabs, async (req, res) => {
  try {
    const { call_id, audio_base64, duration, metadata } = req.body;

    // Store audio for quality assurance
    await storeCallAudio({
      call_id,
      audio_base64,
      duration,
      metadata,
      timestamp: new Date()
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Audio webhook error:', error);
    res.status(200).json({ received: true, error: error.message });
  }
});

// Helper functions (implement with actual database/CRM connections)

async function searchInventory(criteria) {
  // Mock implementation - replace with actual database query
  return [
    {
      year: 2024,
      make: 'Toyota',
      model: 'RAV4',
      price: 35000,
      mileage: 100,
      vin: 'ABC123',
      color: 'Blue',
      features: ['AWD', 'Leather', 'Sunroof']
    },
    {
      year: 2023,
      make: 'Honda',
      model: 'CR-V',
      price: 32000,
      mileage: 5000,
      vin: 'XYZ789',
      color: 'Silver',
      features: ['AWD', 'Navigation', 'Heated Seats']
    }
  ];
}

async function checkServiceAvailability(date, serviceType) {
  // Mock implementation
  return {
    available: true,
    next_available_slot: '10:00 AM'
  };
}

async function getAlternativeServiceDates(preferredDate, serviceType) {
  // Mock implementation
  const tomorrow = new Date(preferredDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(preferredDate);
  dayAfter.setDate(dayAfter.getDate() + 2);

  return [
    tomorrow.toLocaleDateString(),
    dayAfter.toLocaleDateString()
  ];
}

async function createServiceAppointment(details) {
  // Mock implementation
  return {
    appointment_id: 'APT' + Date.now(),
    ...details,
    time: details.time_slot,
    confirmation_sent: true
  };
}

async function getTradeInValue(vehicle) {
  // Mock implementation - would integrate with valuation APIs
  const baseValue = 20000;
  const yearFactor = (2024 - vehicle.year) * 1500;
  const mileageFactor = (vehicle.mileage - 12000) * 0.1;
  const conditionMultiplier = {
    excellent: 1.1,
    good: 1.0,
    fair: 0.85
  };

  const estimatedValue = (baseValue - yearFactor - mileageFactor) * conditionMultiplier[vehicle.condition];

  return {
    min: Math.round(estimatedValue * 0.9),
    max: Math.round(estimatedValue * 1.1),
    average: Math.round(estimatedValue),
    factors: ['year', 'mileage', 'condition', 'market_demand']
  };
}

async function queueForHumanAgent(request) {
  // Mock implementation - would integrate with call center system
  return {
    queue_id: 'Q' + Date.now(),
    estimated_wait: '30 seconds',
    position: 1,
    ...request
  };
}

async function storeCallTranscript(data) {
  // Store in database
  console.log('Storing transcript:', data.call_id);
  return true;
}

async function storeCallAudio(data) {
  // Store audio file
  console.log('Storing audio:', data.call_id);
  return true;
}

function extractLeadInformation(transcript, metadata) {
  // Extract contact information and intent from transcript
  const phoneRegex = /\d{3}[-.]?\d{3}[-.]?\d{4}/g;
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;

  return {
    has_contact_info: true,
    phone: (transcript.match(phoneRegex) || [])[0],
    email: (transcript.match(emailRegex) || [])[0],
    intent: metadata.intent || 'general_inquiry',
    transcript_excerpt: transcript.substring(0, 500)
  };
}

async function createCRMLead(leadInfo) {
  // Create lead in CRM system
  console.log('Creating CRM lead:', leadInfo);
  return true;
}

module.exports = router;