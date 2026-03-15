/**
 * Call Analysis Controller
 * Handles call uploads and AI analysis
 */

const Call = require('../models/Call');
const { analyzeCall } = require('../services/aiCallService');
const fs = require('fs');
const path = require('path');

/**
 * @route   POST /api/calls/upload
 * @desc    Upload and analyze call recording
 * @access  Private
 */
exports.uploadCall = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an audio file',
      });
    }

    const { customerName, customerPhone } = req.body;

    // Create initial call record
    const call = await Call.create({
      audioFilePath: req.file.path,
      fileName: req.file.filename,
      fileSize: req.file.size,
      customerName,
      customerPhone,
      uploadedBy: req.user.id,
      status: 'pending',
    });

    // Analyze call asynchronously
    analyzeCall(req.file.path)
      .then(async (analysis) => {
        await Call.findByIdAndUpdate(call._id, {
          transcript: analysis.transcript,
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentimentScore,
          isComplaint: analysis.isComplaint,
          complaintCategory: analysis.complaintCategory,
          suggestedAction: analysis.suggestedAction,
          keywords: analysis.keywords,
          status: 'analyzed',
          analyzedAt: new Date()
        });
      })
      .catch(async (error) => {
        console.error('❌ Call analysis failed:', error);
        await Call.findByIdAndUpdate(call._id, { status: 'pending' });
      });

    res.status(201).json({
      success: true,
      message: 'Call uploaded successfully. Analysis in progress...',
      data: call,
    });
  } catch (error) {
    // Clean up uploaded file if database save fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * @route   GET /api/calls
 * @desc    Get all calls
 * @access  Private
 */
exports.getCalls = async (req, res, next) => {
  try {
    const { sentiment, isComplaint, status, limit = 50 } = req.query;
    
    const query = {};
    
    if (sentiment) {
      query.sentiment = sentiment;
    }
    
    if (isComplaint !== undefined) {
      query.isComplaint = isComplaint === 'true';
    }
    
    if (status) {
      query.status = status;
    }

    const calls = await Call.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('uploadedBy', 'name email');

    res.json({
      success: true,
      count: calls.length,
      data: calls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/calls/:id
 * @desc    Get single call
 * @access  Private
 */
exports.getCall = async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.id).populate('uploadedBy', 'name email');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/calls/:id
 * @desc    Update call status/notes
 * @access  Private
 */
exports.updateCall = async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    const call = await Call.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (status) call.status = status;
    if (notes) call.notes = notes;
    
    if (status === 'resolved') {
      call.resolvedAt = new Date();
    }

    await call.save();

    res.json({
      success: true,
      message: 'Call updated successfully',
      data: call,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/calls/:id
 * @desc    Delete call
 * @access  Private/Admin
 */
exports.deleteCall = async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    // Delete audio file only if it exists on disk
    if (call.audioFilePath && fs.existsSync(call.audioFilePath)) {
      try {
        fs.unlinkSync(call.audioFilePath);
      } catch (fileErr) {
        console.warn('Could not delete audio file:', fileErr.message);
      }
    }

    await call.deleteOne();

    res.json({
      success: true,
      message: 'Call deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/calls/stats/summary
 * @desc    Get call statistics summary
 * @access  Private
 */
exports.getCallStats = async (req, res, next) => {
  try {
    const totalCalls = await Call.countDocuments();
    const complaints = await Call.countDocuments({ isComplaint: true });
    const resolved = await Call.countDocuments({ status: 'resolved' });
    const pending = await Call.countDocuments({ status: 'pending' });

    const sentimentCounts = await Call.aggregate([
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      totalCalls,
      complaints,
      resolved,
      pending,
      sentimentBreakdown: sentimentCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
