const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  generateContent,
  saveCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  getSuggestions,
  getCustomers,
  sendEmail,
  sendWhatsApp,
  sendInstagram,
} = require('../controllers/marketingController');

// All routes are protected
router.use(protect);

router.post('/generate', generateContent);
router.post('/save', saveCampaign);
router.get('/suggestions', getSuggestions);

// Customer audience
router.get('/customers', getCustomers);

// Distribution routes
router.post('/send/email', sendEmail);
router.post('/send/whatsapp', sendWhatsApp);
router.post('/send/instagram', sendInstagram);

router.route('/campaigns')
  .get(getCampaigns);

router.route('/campaigns/:id')
  .get(getCampaign)
  .put(updateCampaign)
  .delete(authorize('admin', 'manager'), deleteCampaign);

module.exports = router;
