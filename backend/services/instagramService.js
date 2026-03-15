/**
 * Instagram Marketing Service
 * Uses Meta Graph API — FREE (requires Facebook Business + Instagram Business account)
 * Setup: developers.facebook.com → Create App → Instagram Graph API
 *
 * Flow: Create media container → Publish container
 * If not configured: returns the caption so user can post manually
 */

const axios = require('axios');
const config = require('../config/env');

const GRAPH_URL = 'https://graph.facebook.com/v19.0';

/**
 * Post a caption (text-only post using a placeholder image, or image URL if provided)
 * Instagram requires an image — we use a branded Food7 placeholder if none provided
 *
 * @param {string} caption - The marketing text/caption
 * @param {string} imageUrl - Optional public image URL (must be publicly accessible)
 */
async function postToInstagram(caption, imageUrl) {
  if (!config.instagramToken || !config.instagramAccountId) {
    return {
      success: false,
      configured: false,
      message: 'Instagram API not configured. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID to .env',
      caption, // Return caption so user can post manually
    };
  }

  // Instagram requires a public image URL — use a branded placeholder if none provided
  const image = imageUrl || `https://via.placeholder.com/1080x1080/1a0a0a/C9A84C?text=Food7`;

  try {
    // Step 1: Create media container
    const containerRes = await axios.post(
      `${GRAPH_URL}/${config.instagramAccountId}/media`,
      {
        image_url: image,
        caption,
        access_token: config.instagramToken,
      }
    );

    const containerId = containerRes.data?.id;
    if (!containerId) throw new Error('Failed to create media container');

    // Step 2: Wait a moment for container to be ready
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Publish the container
    const publishRes = await axios.post(
      `${GRAPH_URL}/${config.instagramAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: config.instagramToken,
      }
    );

    return {
      success: true,
      configured: true,
      postId: publishRes.data?.id,
      message: 'Posted to Instagram successfully!',
    };
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    return {
      success: false,
      configured: true,
      message: 'Instagram post failed: ' + errMsg,
      caption,
    };
  }
}

module.exports = { postToInstagram };
