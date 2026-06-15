/**
 * ai-assistant.service.ts
 * 
 * Simple rule-based AI assistant for handling common Q&A.
 * Escalates to human agents when confidence is low or user requests it.
 */

import prisma from '../config/database';

interface FAQEntry {
  keywords: string[];
  answer: string;
  category: string;
}

const FAQ_DATABASE: FAQEntry[] = [
  {
    keywords: ['register', 'sign up', 'create account', 'how do i register'],
    answer: `To register on GroomLink:\n\n` +
      `📱 **For Customers:**\n` +
      `1. Download the GroomLink app from the App Store or Google Play\n` +
      `2. Open the app and tap "Sign Up"\n` +
      `3. Enter your email or phone number\n` +
      `4. Verify with the OTP code we send you\n` +
      `5. Complete your profile\n\n` +
      `💈 **For Salons/Partners:**\n` +
      `1. Download the GroomLink Partners app\n` +
      `2. Register with your business email\n` +
      `3. Complete your salon profile and services\n` +
      `4. Wait for verification approval\n\n` +
      `Need help with a specific step?`,
    category: 'Registration'
  },
  {
    keywords: ['book', 'booking', 'appointment', 'schedule', 'how to book'],
    answer: `Booking an appointment is easy!\n\n` +
      `1️⃣ Open the GroomLink app\n` +
      `2️⃣ Browse salons on the map or search\n` +
      `3️⃣ Select a salon and choose your service\n` +
      `4️⃣ Pick an available time slot\n` +
      `5️⃣ Confirm your booking\n` +
      `6️⃣ Pay securely through the app\n\n` +
      `💡 **Tip:** You can book up to 7 days in advance!\n\n` +
      `Would you like to know about cancellations or rescheduling?`,
    category: 'Booking'
  },
  {
    keywords: ['payment', 'pay', 'payment method', 'how to pay', 'mobile money'],
    answer: `We accept multiple payment methods:\n\n` +
      `💳 **Mobile Money:** MTN, Vodafone, AirtelTigo\n` +
      `💳 **Credit/Debit Cards:** Visa, Mastercard\n` +
      `💳 **Bank Transfer**\n\n` +
      `**How payment works:**\n` +
      `• Payment is held securely until service is completed\n` +
      `• Both you and the salon must confirm completion\n` +
      `• Funds are released to the salon after confirmation\n` +
      `• 48-hour auto-release if no issues reported\n\n` +
      `Your money is protected! 🔒`,
    category: 'Payments'
  },
  {
    keywords: ['cancel', 'cancellation', 'refund', 'how to cancel'],
    answer: `**Cancellation Policy:**\n\n` +
      `⏰ **Free Cancellation:** Up to 24 hours before your appointment\n` +
      `⚠️ **Late Cancellation:** Within 24 hours may incur a fee\n` +
      `💰 **Refunds:**\n` +
      `• Full refund if cancelled 24+ hours before\n` +
      `• Partial refund for late cancellations\n` +
      `• Full refund if salon cancels\n\n` +
      `**To cancel:**\n` +
      `1. Go to your Bookings\n` +
      `2. Select the appointment\n` +
      `3. Tap "Cancel Booking"\n\n` +
      `Need to cancel a specific booking?`,
    category: 'Cancellations'
  },
  {
    keywords: ['reschedule', 'change appointment', 'modify booking'],
    answer: `**To reschedule your appointment:**\n\n` +
      `1️⃣ Go to Bookings in the app\n` +
      `2️⃣ Select the appointment you want to change\n` +
      `3️⃣ Tap "Reschedule"\n` +
      `4️⃣ Choose a new available time slot\n` +
      `5️⃣ Confirm the change\n\n` +
      `⚠️ **Note:** Rescheduling is subject to availability and must be done at least 2 hours before your appointment.\n\n` +
      `Is there a specific appointment you'd like to reschedule?`,
    category: 'Rescheduling'
  },
  {
    keywords: ['location', 'area', 'city', 'available in', 'which cities'],
    answer: `🌍 **GroomLink is currently available in:**\n\n` +
      `• Accra (Greater Accra Region)\n` +
      `• Kumasi (Ashanti Region)\n` +
      `• Tamale (Northern Region)\n` +
      `• Takoradi (Western Region)\n` +
      `• Cape Coast (Central Region)\n\n` +
      `We're expanding rapidly! Check the app to see salons in your area.\n\n` +
      `📍 **Want us in your city?** Let us know and we'll prioritize expansion there!`,
    category: 'Locations'
  },
  {
    keywords: ['salon', 'register salon', 'partner', 'add my salon', 'join as salon'],
    answer: `**Join GroomLink as a Salon Partner:**\n\n` +
      `1️⃣ Download the GroomLink Partners app\n` +
      `2️⃣ Tap "Register Your Salon"\n` +
      `3️⃣ Provide:\n` +
      `   • Business name & location\n` +
      `   • Services offered\n` +
      `   • Operating hours\n` +
      `   • Photos of your salon\n` +
      `4️⃣ Submit for review\n` +
      `5️⃣ Get approved within 24-48 hours\n\n` +
      `**Benefits:**\n` +
      `✅ Reach more customers\n` +
      `✅ Automated booking management\n` +
      `✅ Secure payments\n` +
      `✅ Business analytics\n\n` +
      `Ready to grow your business? 🚀`,
    category: 'Partners'
  },
  {
    keywords: ['safety', 'secure', 'trust', 'verified', 'is it safe'],
    answer: `**Your Safety is Our Priority:**\n\n` +
      `🔒 **Security Features:**\n` +
      `• All salons are verified before listing\n` +
      `• Secure payment escrow system\n` +
      `• Real-time GPS tracking\n` +
      `• Verified customer reviews\n` +
      `• 24/7 customer support\n\n` +
      `🛡️ **Protection:**\n` +
      `• Your payment is held securely until service completion\n` +
      `• Both parties must confirm service delivery\n` +
      `• Dispute resolution support\n` +
      `• Insurance coverage for premium salons\n\n` +
      `Have a specific safety concern?`,
    category: 'Safety'
  },
  {
    keywords: ['contact', 'support', 'help', 'reach you', 'customer service'],
    answer: `**We're Here to Help!**\n\n` +
      `📞 **Live Chat:** Tap the chat icon (you're using it now!)\n` +
      `📧 **Email:** support@groomlinkgh.com\n` +
      `📱 **In-App:** Settings > Help & Support\n\n` +
      `**Support Hours:**\n` +
      `• Monday - Friday: 8AM - 8PM GMT\n` +
      `• Saturday: 9AM - 6PM GMT\n` +
      `• Sunday: 10AM - 4PM GMT\n\n` +
      `⚡ Average response time: Under 5 minutes during business hours\n\n` +
      `How else can I assist you?`,
    category: 'Support'
  },
  {
    keywords: ['delete account', 'remove account', 'close account'],
    answer: `**To delete your account:**\n\n` +
      `1️⃣ Open the app\n` +
      `2️⃣ Go to Settings\n` +
      `3️⃣ Scroll to "Delete Account"\n` +
      `4️⃣ Confirm deletion\n\n` +
      `⚠️ **Important:**\n` +
      `• This action is permanent\n` +
      `• All booking history will be lost\n` +
      `• Pending appointments will be cancelled\n` +
      `• Refunds will be processed automatically\n\n` +
      `**Alternative:** You can simply uninstall the app if you just want a break.\n\n` +
      `Would you like me to connect you with support to process account deletion?`,
    category: 'Account'
  },
  {
    keywords: ['commission', 'fee', 'how much', 'pricing', 'cost'],
    answer: `**GroomLink Pricing:**\n\n` +
      `💰 **For Customers:**\n` +
      `• Free to use the app\n` +
      `• No hidden fees\n` +
      `• You pay only for services booked\n\n` +
      `💼 **For Salon Partners:**\n` +
      `• Commission-based model\n` +
      `• We take a small percentage per booking\n` +
      `• No upfront costs\n` +
      `• Free to list your salon\n\n` +
      `**Commission rates vary by location and salon tier.**\n\n` +
      `Salon partners can view exact rates in the Partners app under Settings > Pricing.\n\n` +
      `Is there a specific pricing question I can help with?`,
    category: 'Pricing'
  }
];

/**
 * Analyze user message and find matching FAQ
 */
export function analyzeMessage(message: string): { 
  shouldAnswer: boolean; 
  answer?: string; 
  confidence: 'high' | 'medium' | 'low';
  category?: string;
  needsEscalation: boolean;
} {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for escalation triggers
  const escalationTriggers = [
    'human', 'agent', 'real person', 'talk to someone', 'speak to', 
    'representative', 'escalate', 'complaint', 'angry', 'unhappy',
    'terrible', 'horrible', 'worst', 'scam', 'fraud', 'legal', 'lawyer',
    'sue', 'report', 'manager', 'supervisor'
  ];
  
  const hasEscalationTrigger = escalationTriggers.some(trigger => 
    lowerMessage.includes(trigger)
  );
  
  if (hasEscalationTrigger) {
    return {
      shouldAnswer: false,
      confidence: 'high',
      needsEscalation: true
    };
  }
  
  // Check for simple greetings
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
  const isGreeting = greetings.some(g => lowerMessage === g || lowerMessage.startsWith(g + ' '));
  
  if (isGreeting) {
    return {
      shouldAnswer: true,
      answer: `Hello! 👋 I'm GroomLink's virtual assistant. I can help you with:\n\n` +
        `• 📝 Account registration\n` +
        `• 📅 Booking appointments\n` +
        `• 💳 Payment questions\n` +
        `• 🔄 Cancellations & rescheduling\n` +
        `• 📍 Service locations\n` +
        `• 💈 Partner salon registration\n` +
        `• 🔒 Safety & security\n\n` +
        `What would you like to know?`,
      confidence: 'high',
      category: 'Greeting',
      needsEscalation: false
    };
  }
  
  // Check for thanks
  const thanks = ['thank', 'thanks', 'appreciate', 'helpful'];
  const isThanks = thanks.some(t => lowerMessage.includes(t));
  
  if (isThanks) {
    return {
      shouldAnswer: true,
      answer: `You're welcome! 😊 Is there anything else I can help you with?`,
      confidence: 'high',
      category: 'Gratitude',
      needsEscalation: false
    };
  }
  
  // Search FAQ database
  let bestMatch: FAQEntry | null = null;
  let bestScore = 0;
  
  for (const faq of FAQ_DATABASE) {
    let score = 0;
    
    for (const keyword of faq.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        // Longer keyword matches are more significant
        score += keyword.split(' ').length;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }
  
  // Determine confidence based on match quality
  if (bestScore >= 2) {
    return {
      shouldAnswer: true,
      answer: bestMatch!.answer,
      confidence: 'high',
      category: bestMatch!.category,
      needsEscalation: false
    };
  } else if (bestScore === 1) {
    return {
      shouldAnswer: true,
      answer: bestMatch!.answer,
      confidence: 'medium',
      category: bestMatch!.category,
      needsEscalation: false
    };
  }
  
  // No good match - needs human agent
  return {
    shouldAnswer: false,
    confidence: 'low',
    needsEscalation: true
  };
}

/**
 * Get the AI welcome/greeting message shown when a user starts a new chat.
 */
export function getWelcomeMessage(): string {
  return `Hello! 👋 I'm GroomLink's virtual assistant. I can help you with:\n\n` +
    `• 📝 Account registration\n` +
    `• 📅 Booking appointments\n` +
    `• 💳 Payment questions\n` +
    `• 🔄 Cancellations & rescheduling\n` +
    `• 📍 Service locations\n` +
    `• 💈 Partner salon registration\n` +
    `• 🔒 Safety & security\n\n` +
    `What would you like to know?`;
}

/**
 * Get escalation message when AI can't help
 */
export function getEscalationMessage(): string {
  return `I understand you need specialized assistance. Let me connect you with one of our support agents who can help you better. 🤝\n\n` +
    `An agent will be with you shortly. Average wait time: 2-3 minutes.`;
}

/**
 * Find an available support agent and assign them to the ticket.
 * Returns the agent's display name if found, or null if no agent is available.
 */
export async function findAndAssignAgent(ticketId: string): Promise<string | null> {
  // Find available support agents (SUPPORT, ADMIN, SUPER_ADMIN with ACTIVE status)
  const availableAgent = await prisma.user.findFirst({
    where: {
      role: { in: ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'] },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: {
      // Prefer agents who were least recently assigned (simple round-robin proxy)
      updatedAt: 'asc',
    },
  });

  if (!availableAgent) {
    return null;
  }

  // Assign the ticket to the found agent
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      assignedToId: availableAgent.id,
      status: 'OPEN',
    },
  });

  const displayName = [availableAgent.firstName, availableAgent.lastName]
    .filter(Boolean)
    .join(' ') || 'Support Agent';

  return displayName;
}

/**
 * Get the escalation message with the assigned agent's name.
 */
export function getAgentAssignedMessage(agentName: string): string {
  return `I'm connecting you with **${agentName}** from our support team. 🤝\n\n` +
    `They'll be with you shortly. Average wait time: 2-3 minutes.\n\n` +
    `In the meantime, feel free to leave any additional details about your issue.`;
}

/**
 * Get the message when no agents are available.
 */
export function getNoAgentAvailableMessage(): string {
  return `I understand you need specialized assistance. Unfortunately, no support agents are available right now. 😔\n\n` +
    `Your message has been queued and an agent will get back to you as soon as possible.\n\n` +
    `You can also reach us at support@groomlinkgh.com for urgent matters.`;
}
