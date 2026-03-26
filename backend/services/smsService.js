/**
 * Free SMS Service
 * Uses multiple free SMS providers for reliability
 * - Fast2SMS (India) - free 10 SMS/day
 * - TextBelt (Global) - free 1 SMS/day
 * - Way2SMS (India) - free tier available
 */

const axios = require('axios');
const config = require('../config/env');

// Provider configuration
const SMS_PROVIDERS = {
  fast2sms: {
    url: 'https://www.fast2sms.com/dev/bulkV2',
    enabled: () => !!config.fast2smsApiKey,
  },
  textbelt: {
    url: 'https://textbelt.com/text',
    enabled: () => true, // Free tier available without API key
  },
};

/**
 * Format phone number for India
 * Removes +91 prefix if present, ensures 10 digits
 */
function formatIndianNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  // Remove 91 prefix if present
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  // Remove 0 prefix if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.length === 10 ? cleaned : null;
}

/**
 * Send SMS via Fast2SMS (India) - Free 10 SMS/day
 * Sign up: https://www.fast2sms.com/
 */
async function sendViaFast2SMS(phone, message) {
  if (!config.fast2smsApiKey) {
    return { success: false, error: 'Fast2SMS API key not configured' };
  }

  const formattedPhone = formatIndianNumber(phone);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid Indian phone number' };
  }

  try {
    const response = await axios.post(
      SMS_PROVIDERS.fast2sms.url,
      {
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: formattedPhone,
      },
      {
        headers: {
          authorization: config.fast2smsApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('    Fast2SMS response:', response.data);
    if (response.data?.return === true || response.data?.status === 'success') {
      return { success: true, provider: 'fast2sms', messageId: response.data?.message_id || response.data?.request_id };
    }
    return { success: false, error: response.data?.message || JSON.stringify(response.data) || 'Fast2SMS failed' };
  } catch (error) {
    console.error('    Fast2SMS error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

/**
 * Send SMS via TextBelt (Global) - Free 1 SMS/day
 * No signup required for free tier
 */
async function sendViaTextBelt(phone, message) {
  try {
    console.log('    Trying TextBelt...');
    const response = await axios.post(
      SMS_PROVIDERS.textbelt.url,
      {
        phone: phone,
        message: message,
        key: config.textbeltApiKey || 'textbelt', // 'textbelt' = free tier (1 SMS/day)
      }
    );

    console.log('    TextBelt response:', response.data);
    if (response.data?.success) {
      return { success: true, provider: 'textbelt', quotaRemaining: response.data?.quotaRemaining };
    }
    return { success: false, error: response.data?.error || response.data?.message || 'TextBelt failed' };
  } catch (error) {
    console.error('    TextBelt error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

/**
 * Send SMS to a single number
 * Tries multiple providers in order
 */
async function sendSMS(phone, message) {
  // Try TextBelt first (Global, actually works without payment)
  console.log('  - Trying TextBelt first...');
  const textBeltResult = await sendViaTextBelt(phone, message);
  console.log('  - TextBelt result:', textBeltResult);
  if (textBeltResult.success) return textBeltResult;

  // Try Fast2SMS for Indian numbers (requires 100 INR payment first)
  if (SMS_PROVIDERS.fast2sms.enabled() && isIndianNumber(phone)) {
    console.log('  - Trying Fast2SMS...');
    const result = await sendViaFast2SMS(phone, message);
    console.log('  - Fast2SMS result:', result);
    if (result.success) return result;
    // If Fast2SMS fails due to payment requirement, return specific error
    if (result.error?.includes('transaction')) {
      return {
        success: false,
        error: `TextBelt failed: ${textBeltResult.error}. Fast2SMS requires 100 INR payment.`,
      };
    }
    return { success: false, error: `TextBelt: ${textBeltResult.error}. Fast2SMS: ${result.error}` };
  }

  return {
    success: false,
    error: `TextBelt failed: ${textBeltResult.error}. Fast2SMS not configured.`,
    manualText: message,
    phone,
  };
}

/**
 * Check if number is Indian
 */
function isIndianNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('91') || cleaned.startsWith('+91') || cleaned.length === 10;
}

/**
 * Send bulk SMS to multiple customers
 * @param {Array} customers - [{ name, phone }]
 * @param {string} message - SMS content
 */
async function sendBulkSMS(customers, message) {
  const results = {
    sent: 0,
    failed: 0,
    errors: [],
    provider: null,
  };

  // Debug logging
  console.log('📱 SMS Service Debug:');
  console.log('  - Fast2SMS API Key configured:', !!config.fast2smsApiKey);
  console.log('  - TextBelt API Key:', config.textbeltApiKey || 'textbelt (free tier)');
  console.log('  - Customers to send:', customers.length);

  // Check if any provider is configured
  const isConfigured = SMS_PROVIDERS.fast2sms.enabled() || SMS_PROVIDERS.textbelt.enabled();
  
  if (!isConfigured) {
    return {
      success: false,
      configured: false,
      message: 'SMS not configured. Add FAST2SMS_API_KEY to .env file.',
      manualText: message,
      phoneNumbers: customers.filter(c => c.phone).map(c => c.phone),
    };
  }

  for (const customer of customers) {
    if (!customer.phone) continue;

    try {
      console.log(`  - Sending to ${customer.phone}...`);
      const result = await sendSMS(customer.phone, message);
      console.log(`    Result:`, result);
      
      if (result.success) {
        results.sent++;
        results.provider = result.provider;
      } else {
        results.failed++;
        results.errors.push({ phone: customer.phone, error: result.error });
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      results.failed++;
      results.errors.push({ phone: customer.phone, error: err.message });
      console.error(`    Error:`, err.message);
    }
  }

  return {
    success: results.sent > 0,
    configured: true,
    ...results,
    message: results.sent > 0
      ? `Sent to ${results.sent} customers via ${results.provider}. ${results.failed} failed.`
      : `SMS sending failed. Errors: ${results.errors.map(e => e.error).join(', ')}`,
    manualText: message,
    phoneNumbers: customers.filter(c => c.phone).map(c => c.phone),
  };
}

module.exports = {
  sendSMS,
  sendBulkSMS,
};
