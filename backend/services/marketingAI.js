/**
 * AI Marketing Generator Service
 * Uses Groq API to generate marketing content
 */

const Groq = require('groq-sdk');
const config = require('../config/env');

const groq = config.groqApiKey ? new Groq({ apiKey: config.groqApiKey }) : null;

/**
 * Generate marketing content based on type and context
 * @param {string} type - Type of marketing content (instagram, sms, offer, festival, combo)
 * @param {Object} context - Context for generation (sales data, weather, etc.)
 * @returns {Promise<Object>} - Generated content
 */
async function generateMarketingContent(type, context = {}) {
  try {
    if (!groq) {
      console.warn('⚠️  Groq API key not configured, using mock content');
      return getMockContent(type);
    }

    const prompt = buildPrompt(type, context);
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a creative marketing expert for "Food7", a premium restaurant with a red and black theme. Generate engaging, professional marketing content that drives customer engagement and sales.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',  // Current free Groq model (updated from 3.1)
      temperature: 0.8,
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content;
    
    return {
      title: generateTitle(type, context),
      content: content.trim(),
      type,
      context,
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('❌ Marketing generation error:', error.message);
    return getMockContent(type);
  }
}

/**
 * Build prompt based on marketing type and context
 */
function buildPrompt(type, context) {
  // context can be a plain string (from the UI) or an object (from auto-enrichment)
  const userContext = typeof context === 'string' && context.trim()
    ? context.trim()
    : (typeof context === 'object' && context.topItems
        ? context.topItems.join(', ')
        : '');

  const persona = `You are a world-class restaurant copywriter who writes content that makes people's mouths water and compels them to visit immediately. Your writing is vivid, sensory, emotionally resonant, and creates genuine urgency. You describe food in a way that triggers cravings. Never write generic filler — every word must earn its place.`;

  const restaurant = `Food7 is a premium restaurant known for bold flavors, impeccable quality, and an unforgettable dining experience.`;

  const contextLine = userContext ? `\nFocus specifically on: ${userContext}` : '';

  const prompts = {
    instagram: `${persona}

${restaurant}${contextLine}

Write an Instagram post caption that:
- Opens with a sensory hook (smell, taste, texture) that stops the scroll
- Describes the food so vividly the reader can almost taste it
- Creates FOMO — makes them feel they're missing out RIGHT NOW
- Ends with a compelling call to action to visit or order today
- Uses 3–5 perfectly chosen emojis (not excessive)
- Includes 5–8 targeted hashtags at the end
- Is under 150 words
- Tone: exciting, premium, irresistible

Output ONLY the caption text, nothing else.`,

    sms: `${persona}

${restaurant}${contextLine}

Write an SMS marketing message that:
- Is under 160 characters TOTAL (this is critical)
- Mentions the specific dish/offer from the context
- Creates immediate urgency (today only / tonight / limited)
- Has a clear action (Visit us / Call now / Show this msg)
- Reads like it's from a friend who knows great food

Output ONLY the SMS text, nothing else.`,

    whatsapp: `${persona}

${restaurant}${restaurant}${contextLine}

Write a WhatsApp broadcast message that:
- Feels personal and warm, like a message from the restaurant owner
- Paints a vivid picture of the dish/offer
- Uses emojis naturally (not excessively)
- Creates a sense of exclusivity — "just for our loyal customers"
- Ends with a clear, friendly call to action
- Is 3–5 short paragraphs

Output ONLY the WhatsApp message text, nothing else.`,

    offer: `${persona}

${restaurant}${contextLine}

Write a special offer promotion that:
- Leads with the irresistible deal (discount, combo, free item)
- Immediately follows with WHY this dish is worth it (taste, quality, experience)
- Uses scarcity and time pressure authentically
- Makes the reader feel they'd be foolish to miss this
- Is punchy and energetic, 80–120 words

Output ONLY the offer text, nothing else.`,

    festival: `${persona}

${restaurant}${contextLine}

Write a festive promotion message that:
- Captures the emotion and warmth of the celebration
- Ties the festival spirit to the joy of sharing great food
- Highlights a special festive dish or menu
- Invites families and friends to celebrate together at Food7
- Is warm, celebratory, and memorable — 80–120 words

Output ONLY the message text, nothing else.`,

    combo: `${persona}

${restaurant}${contextLine}

Write a combo meal promotion that:
- Highlights the incredible value in a mouth-watering way
- Describes each item in the combo with sensory detail
- Makes sharing the meal sound like an experience, not just a transaction
- Targets groups, families, or couples
- Is enthusiastic and specific — 80–120 words

Output ONLY the promotion text, nothing else.`,
  };

  return prompts[type] || prompts.instagram;
}

/**
 * Generate title for marketing content
 */
function generateTitle(type, context) {
  const titles = {
    instagram: '📸 Instagram Post',
    sms: '📱 SMS Campaign',
    whatsapp: '💬 WhatsApp Broadcast',
    offer: '🎁 Special Offer',
    festival: '🎉 Festival Promotion',
    combo: '🍽️ Combo Deal',
  };

  return titles[type] || 'Marketing Campaign';
}

/**
 * Mock content for when API is not available
 */
function getMockContent(type) {
  const mockContents = {
    instagram: {
      title: '📸 Instagram Post',
      content: `🍽️ Craving something extraordinary? Food7 brings you the finest dining experience! 

✨ Today's Special: Butter Chicken & Garlic Naan
🔥 Premium quality, unforgettable taste
🎨 Served in our signature red & black ambiance

Visit us today or order online! 
📍 Food7 Restaurant
📞 Call now for reservations

#Food7 #PremiumDining #FoodLovers #BestFood #RestaurantLife #FoodieHeaven`,
      type: 'instagram',
    },
    sms: {
      title: '📱 SMS Campaign',
      content: '🔥 Food7 Special! Get 20% OFF on orders above ₹500 today. Use code: FOOD20. Order now! 📞',
      type: 'sms',
    },
    whatsapp: {
      title: '💬 WhatsApp Broadcast',
      content: `Hello from Food7! 👋

🍽️ This weekend, treat yourself to our Chef's Special Menu!

🔥 Highlights:
• Tandoori Platter
• Biryani Feast
• Premium Desserts

💰 Flat 15% OFF on dine-in
⏰ Valid till Sunday

Book your table now! 📞
Food7 - Where taste meets luxury ✨`,
      type: 'whatsapp',
    },
    offer: {
      title: '🎁 Special Offer',
      content: `🎉 MEGA OFFER ALERT! 🎉

Get FLAT 25% OFF on all orders above ₹1000!

✅ Valid for 48 hours only
✅ Dine-in & Takeaway
✅ No minimum party size

Use code: FOOD25

Don't miss out! Visit Food7 today! 🍽️`,
      type: 'offer',
    },
    festival: {
      title: '🎉 Festival Promotion',
      content: `🪔 Celebrate this festive season with Food7! 🪔

Special Festival Menu:
🍛 Traditional Delicacies
🥘 Royal Thali
🍰 Sweet Treats

🎁 FREE dessert with every order
✨ Festive ambiance & decor
🎊 Live music on weekends

Book your celebration with us!
Food7 - Making festivals more delicious! 🎉`,
      type: 'festival',
    },
    combo: {
      title: '🍽️ Combo Deal',
      content: `🔥 SUPER COMBO DEAL! 🔥

Family Feast Combo @ Just ₹999
• 2 Main Course
• 4 Rotis/Rice
• 2 Beverages
• 1 Dessert

Perfect for 2-3 people! 👨‍👩‍👧

💰 Save ₹400 on this combo
⏰ Available all day

Order now from Food7! 📞
Limited time offer! ⚡`,
      type: 'combo',
    },
  };

  return mockContents[type] || mockContents.instagram;
}

/**
 * Generate multiple marketing suggestions based on current context
 */
async function generateSuggestions(salesData, inventoryData) {
  const suggestions = [];
  
  // Low sales suggestion
  if (salesData.trend === 'low') {
    suggestions.push({
      type: 'offer',
      reason: 'Low sales detected',
      priority: 'high',
    });
  }
  
  // High inventory items
  if (inventoryData.highStock && inventoryData.highStock.length > 0) {
    suggestions.push({
      type: 'combo',
      reason: `High stock of ${inventoryData.highStock.join(', ')}`,
      priority: 'medium',
    });
  }
  
  // Weekend promotion
  const day = new Date().getDay();
  if (day === 5 || day === 6) {
    suggestions.push({
      type: 'instagram',
      reason: 'Weekend approaching',
      priority: 'medium',
    });
  }
  
  return suggestions;
}

module.exports = {
  generateMarketingContent,
  generateSuggestions,
};
