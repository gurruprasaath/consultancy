/**
 * Call Analysis Routes
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadCall,
  getCalls,
  getCall,
  updateCall,
  deleteCall,
  getCallStats,
} = require('../controllers/callController');

// All routes are protected
router.use(protect);

router.post('/upload', upload.single('audio'), uploadCall);
router.get('/stats/summary', getCallStats);

router.route('/')
  .get(getCalls);

router.route('/:id')
  .get(getCall)
  .put(updateCall)
  .delete(deleteCall);

module.exports = router;
