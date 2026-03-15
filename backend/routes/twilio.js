/**
 * Twilio Integration Routes
 * Handles incoming calls and automatic recording
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Call = require('../models/Call');
const { analyzeCall } = require('../services/aiCallService');

// Configure multer for Twilio recording downloads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'uploads/calls';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `twilio-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

/**
 * @route   POST /api/twilio/voice
 * @desc    Handle incoming call - Twilio webhook
 * @access  Public (Twilio webhook)
 */
router.post('/voice', (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you for calling Food7 Restaurant. Your call is being recorded for quality assurance. Please hold while we connect you.</Say>
    <Record 
        action="/api/twilio/recording-complete" 
        method="POST"
        maxLength="600"
        playBeep="true"
        recordingStatusCallback="/api/twilio/recording-status"
        recordingStatusCallbackMethod="POST"
    />
    <Say voice="alice">Thank you for your call. Goodbye.</Say>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

/**
 * @route   POST /api/twilio/recording-complete
 * @desc    Called when recording is complete
 * @access  Public (Twilio webhook)
 */
router.post('/recording-complete', async (req, res) => {
  try {
    const { RecordingUrl, CallSid, From, To } = req.body;

    console.log('📞 Call recording completed:', {
      CallSid,
      From,
      RecordingUrl,
    });

    // Store initial call data
    const call = await Call.create({
      callSid: CallSid,
      phoneNumber: From,
      recordingUrl: RecordingUrl,
      status: 'processing',
    });

    // Download and analyze recording asynchronously
    downloadAndAnalyze(call._id, RecordingUrl);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Your feedback has been recorded. Thank you!</Say>
    <Hangup/>
</Response>`;

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error handling recording completion:', error);
    res.status(500).send('<Response><Say>An error occurred.</Say></Response>');
  }
});

/**
 * @route   POST /api/twilio/recording-status
 * @desc    Webhook for recording status updates
 * @access  Public (Twilio webhook)
 */
router.post('/recording-status', async (req, res) => {
  try {
    const { RecordingUrl, RecordingSid, CallSid, RecordingStatus } = req.body;

    console.log('🎙️ Recording status update:', {
      CallSid,
      RecordingSid,
      Status: RecordingStatus,
    });

    if (RecordingStatus === 'completed' && RecordingUrl) {
      // Find call by CallSid and update
      const call = await Call.findOne({ callSid: CallSid });
      if (call) {
        call.recordingUrl = RecordingUrl;
        call.recordingSid = RecordingSid;
        await call.save();

        // Trigger analysis
        downloadAndAnalyze(call._id, RecordingUrl);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling recording status:', error);
    res.sendStatus(500);
  }
});

/**
 * Download recording from Twilio and analyze
 */
async function downloadAndAnalyze(callId, recordingUrl) {
  try {
    const axios = require('axios');
    const config = require('../config/config');

    console.log('⬇️ Downloading recording from Twilio...');

    // Add .mp3 to get audio format
    const audioUrl = `${recordingUrl}.mp3`;

    // Download with Twilio credentials
    const response = await axios.get(audioUrl, {
      auth: {
        username: config.twilioAccountSid,
        password: config.twilioAuthToken,
      },
      responseType: 'arraybuffer',
    });

    // Save to file
    const filename = `twilio-${callId}-${Date.now()}.mp3`;
    const filepath = path.join('uploads/calls', filename);
    await fs.writeFile(filepath, response.data);

    console.log('✅ Recording downloaded:', filepath);

    // Analyze the call
    console.log('🧠 Starting AI analysis...');
    const analysis = await analyzeCall(filepath);

    // Update call with analysis results
    await Call.findByIdAndUpdate(callId, {
      transcript: analysis.transcript,
      sentiment: analysis.sentiment,
      isComplaint: analysis.isComplaint,
      complaintCategory: analysis.complaintCategory,
      suggestedAction: analysis.suggestedAction,
      status: 'completed',
      analyzedAt: new Date(),
    });

    console.log('✅ Call analysis completed for:', callId);

    // Clean up file
    await fs.unlink(filepath);
  } catch (error) {
    console.error('❌ Error downloading/analyzing recording:', error);
    
    // Update call status to failed
    await Call.findByIdAndUpdate(callId, {
      status: 'failed',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/twilio/test
 * @desc    Test Twilio configuration
 * @access  Public
 */
router.get('/test', (req, res) => {
  const config = require('../config/config');
  
  res.json({
    success: true,
    message: 'Twilio integration is configured',
    configured: !!(config.twilioAccountSid && config.twilioAuthToken),
    webhookUrl: `${req.protocol}://${req.get('host')}/api/twilio/voice`,
  });
});

module.exports = router;
