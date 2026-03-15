/**
 * AI Call Analysis Service
 * Groq Whisper for transcription (FREE) + Groq LLM for sentiment analysis (FREE)
 */

const Groq = require('groq-sdk');
const fs = require('fs');
const config = require('../config/env');

// Single Groq client for both transcription AND analysis — 100% free
const groq = config.groqApiKey ? new Groq({ apiKey: config.groqApiKey }) : null;

/**
 * Transcribe audio file using Groq Whisper (FREE)
 * Model: whisper-large-v3 — same quality as OpenAI Whisper, zero cost on Groq
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioFilePath) {
  try {
    if (!groq) {
      console.warn('⚠️  Groq API key not configured, using mock transcription');
      return 'Mock transcription: Customer called about order delay. Not happy with service.';
    }

    const audioFile = fs.createReadStream(audioFilePath);

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',   // Free on Groq — same as OpenAI whisper-1
      language: 'en',
      response_format: 'text',
    });

    // Groq returns the text directly when response_format is 'text'
    return typeof transcription === 'string' ? transcription : transcription.text;
  } catch (error) {
    console.error('❌ Transcription error:', error.message);
    throw new Error('Failed to transcribe audio: ' + error.message);
  }
}

/**
 * Analyze sentiment and detect complaints using Groq
 * @param {string} transcript - Call transcript
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeSentiment(transcript) {
  try {
    if (!groq) {
      console.warn('⚠️  Groq API key not configured, using mock analysis');
      return {
        sentiment: 'negative',
        sentimentScore: -0.6,
        isComplaint: true,
        complaintCategory: 'delivery',
        suggestedAction: 'Send apology message and offer 10% discount on next order',
        keywords: ['delay', 'late', 'unhappy'],
      };
    }

    const prompt = `You are an AI assistant analyzing customer service calls for a restaurant named "Food7".

Analyze the following call transcript and provide:
1. Sentiment (positive/neutral/negative)
2. Sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
3. Is this a complaint? (true/false)
4. Complaint category (delivery/quality/service/pricing/other/none)
5. Suggested action to resolve the issue
6. Key keywords from the conversation

Call transcript:
"${transcript}"

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0.5,
  "isComplaint": false,
  "complaintCategory": "none",
  "suggestedAction": "Action to take",
  "keywords": ["keyword1", "keyword2"]
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that analyzes customer service calls. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',  // Current free Groq model
      temperature: 0.3,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    
    // Parse JSON response
    const analysis = JSON.parse(response);
    
    return analysis;
  } catch (error) {
    console.error('❌ Sentiment analysis error:', error.message);
    
    // Fallback analysis
    return {
      sentiment: 'neutral',
      sentimentScore: 0,
      isComplaint: false,
      complaintCategory: 'none',
      suggestedAction: 'Review call manually',
      keywords: [],
    };
  }
}

/**
 * Complete call analysis pipeline
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<Object>} - Complete analysis
 */
async function analyzeCall(audioFilePath) {
  try {
    // Step 1: Transcribe audio
    console.log('🎤 Transcribing audio...');
    const transcript = await transcribeAudio(audioFilePath);
    
    // Step 2: Analyze sentiment
    console.log('🧠 Analyzing sentiment...');
    const analysis = await analyzeSentiment(transcript);
    
    return {
      transcript,
      ...analysis,
      analyzedAt: new Date(),
    };
  } catch (error) {
    console.error('❌ Call analysis error:', error.message);
    throw error;
  }
}

module.exports = {
  transcribeAudio,
  analyzeSentiment,
  analyzeCall,
};
