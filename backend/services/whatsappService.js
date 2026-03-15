/**
 * WhatsApp Marketing Service
 * Uses Meta WhatsApp Business Cloud API — FREE (1000 conversations/month)
 * Setup: developers.facebook.com → Create App → WhatsApp
 *
 * If not configured: returns the message text so user can copy-paste manually
 */

const axios = require('axios');
const config = require('../config/env');

const WA_API_URL = 'https://graph.facebook.com/v19.0';

/**
 * Send a text message to a single WhatsApp number
 */
async function sendWhatsAppMessage(phoneNumber, message) {
  if (!config.whatsappToken || !config.whatsappPhoneId) {
    return { success: false, configured: false };
  }

  // Normalize phone number — remove spaces, dashes, ensure + prefix
  const normalized = phoneNumber.replace(/[\s\-()]/g, '');
  const phone = normalized.startsWith('+') ? normalized.slice(1) : normalized;

  const response = await axios.post(
    `${WA_API_URL}/${config.whatsappPhoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${config.whatsappToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { success: true, messageId: response.data?.messages?.[0]?.id };
}

/**
 * Send marketing message to all customers with phone numbers
 * @param {Array} customers - [{ name, phone }]
 * @param {string} message - AI-generated content
 */
async function sendBulkWhatsApp(customers, message) {
  if (!config.whatsappToken || !config.whatsappPhoneId) {
    return {
      success: false,
      configured: false,
      message: 'WhatsApp API not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID to .env',
      manualText: message,
      phoneNumbers: customers.filter(c => c.phone).map(c => c.phone),
    };
  }

  const results = { sent: 0, failed: 0, errors: [] };

  for (const customer of customers) {
    if (!customer.phone) continue;
    try {
      await sendWhatsAppMessage(customer.phone, message);
      results.sent++;
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      results.failed++;
      results.errors.push({ phone: customer.phone, error: err.response?.data?.error?.message || err.message });
    }
  }

  return {
    success: true,
    configured: true,
    ...results,
    message: `Sent to ${results.sent} customers via WhatsApp. ${results.failed} failed.`,
  };
}

module.exports = { sendBulkWhatsApp, sendWhatsAppMessage };
