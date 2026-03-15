# Twilio Integration Setup Guide

## 🎯 Overview

Food7 now supports **automatic call recording and AI analysis** for incoming customer calls using Twilio telephony integration.

When a customer calls your restaurant's phone number:

1. ✅ Call is automatically answered with a greeting
2. ✅ Conversation is recorded
3. ✅ Recording is automatically transcribed using AI
4. ✅ Sentiment analysis is performed
5. ✅ Complaints are detected and categorized
6. ✅ Suggested actions are generated

---

## 📋 Prerequisites

1. **Twilio Account** - Sign up at [twilio.com](https://www.twilio.com)
2. **Twilio Phone Number** - Purchase a phone number from Twilio
3. **Public URL** - Your backend must be accessible from the internet (use ngrok for testing)

---

## 🚀 Setup Instructions

### Step 1: Get Twilio Credentials

1. Log in to your [Twilio Console](https://console.twilio.com)
2. Copy your **Account SID** and **Auth Token**
3. Purchase a phone number if you haven't already

### Step 2: Configure Environment Variables

Add these to your `backend/.env` file:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Expose Your Backend (for testing)

If testing locally, use ngrok:

```bash
ngrok http 5000
```

This will give you a public URL like: `https://abc123.ngrok.io`

### Step 4: Configure Twilio Webhooks

1. Go to [Twilio Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click on your phone number
3. Scroll to **Voice & Fax** section
4. Set **A CALL COMES IN** to:
   - **Webhook**: `https://your-domain.com/api/twilio/voice`
   - **HTTP Method**: POST

### Step 5: Test the Integration

1. Call your Twilio phone number
2. You'll hear: "Thank you for calling Food7 Restaurant..."
3. Speak your message
4. Hang up
5. Check the Food7 dashboard - your call will appear with AI analysis!

---

## 🔧 How It Works

### Call Flow

```
Customer Calls → Twilio Answers → Records Call → Sends to Food7 API
                                                          ↓
                                                    AI Analysis
                                                          ↓
                                        Transcription + Sentiment + Complaints
                                                          ↓
                                                  Stored in Database
                                                          ↓
                                            Visible in Call Analysis Page
```

### API Endpoints

- **POST /api/twilio/voice** - Handles incoming calls (Twilio webhook)
- **POST /api/twilio/recording-complete** - Called when recording finishes
- **POST /api/twilio/recording-status** - Receives recording status updates
- **GET /api/twilio/test** - Test Twilio configuration

---

## 📊 Features

### Automatic Analysis

Every call is automatically analyzed for:

- **Transcription**: Full text of the conversation
- **Sentiment**: Positive, Negative, or Neutral
- **Complaint Detection**: Automatically flags complaints
- **Category**: Food Quality, Service, Delivery, Pricing, Other
- **Suggested Action**: AI-generated recommendation for handling

### Dashboard Integration

All calls appear in the **Call Analysis** page with:

- Full transcript
- Sentiment badge
- Complaint alerts
- Suggested actions
- Timestamp and caller info

---

## 🧪 Testing

### Test Configuration

```bash
curl http://localhost:5000/api/twilio/test
```

Expected response:

```json
{
  "success": true,
  "message": "Twilio integration is configured",
  "configured": true,
  "webhookUrl": "http://localhost:5000/api/twilio/voice"
}
```

### Simulate Incoming Call

Use Twilio's test credentials to simulate calls without charges during development.

---

## 💰 Pricing

Twilio charges per minute for:

- Phone number rental: ~$1/month
- Incoming calls: ~$0.0085/minute
- Recording storage: ~$0.0005/minute

**Example**: 100 calls/month × 3 minutes average = ~$2.55/month

---

## 🔒 Security

- Webhook URLs should use HTTPS in production
- Twilio validates requests using signatures (implement validation for production)
- Store credentials securely in environment variables
- Never commit `.env` file to version control

---

## 🐛 Troubleshooting

### Calls not being recorded

1. Check Twilio webhook configuration
2. Verify your backend is publicly accessible
3. Check server logs for errors
4. Ensure environment variables are set correctly

### Analysis not working

1. Verify OpenAI API key is set
2. Verify Groq API key is set
3. Check server logs for AI service errors
4. Ensure sufficient API credits

### No calls appearing in dashboard

1. Check MongoDB connection
2. Verify Call model is updated
3. Check browser console for frontend errors
4. Refresh the Call Analysis page

---

## 📚 Resources

- [Twilio Voice Documentation](https://www.twilio.com/docs/voice)
- [TwiML Reference](https://www.twilio.com/docs/voice/twiml)
- [Twilio Webhooks Guide](https://www.twilio.com/docs/usage/webhooks)
- [ngrok Documentation](https://ngrok.com/docs)

---

## 🎉 You're All Set!

Your Food7 system now automatically records and analyzes all incoming customer calls!

Test it by calling your Twilio number and checking the Call Analysis dashboard.
