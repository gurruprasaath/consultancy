/**
 * Marketing Controller
 * Handles AI marketing content generation and distribution
 */

const Marketing = require('../models/Marketing');
const { generateMarketingContent, generateSuggestions } = require('../services/marketingAI');
const { sendBulkEmail } = require('../services/emailService');
const { sendBulkWhatsApp } = require('../services/whatsappService');
const { sendBulkSMS } = require('../services/smsService');
const { postToInstagram } = require('../services/instagramService');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');

/**
 * @route   POST /api/marketing/generate
 * @desc    Generate AI marketing content
 * @access  Private
 */
exports.generateContent = async (req, res, next) => {
  try {
    const { type, context = {} } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Please specify marketing type',
      });
    }

    // Enrich context with real data if not provided
    if (!context.topItems) {
      const today = new Date();
      today.setDate(today.getDate() - 7); // Last 7 days
      
      const orders = await Order.find({
        createdAt: { $gte: today },
        status: 'completed',
      });
      
      const itemCounts = {};
      orders.forEach(order => {
        order.items.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      });
      
      context.topItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
    }

    // Generate content
    const generated = await generateMarketingContent(type, context);

    res.json({
      success: true,
      data: generated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/marketing/save
 * @desc    Save marketing campaign
 * @access  Private
 */
exports.saveCampaign = async (req, res, next) => {
  try {
    const campaign = await Marketing.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Campaign saved successfully',
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/marketing/campaigns
 * @desc    Get all campaigns
 * @access  Private
 */
exports.getCampaigns = async (req, res, next) => {
  try {
    const { type, status, limit = 50 } = req.query;
    
    const query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }

    const campaigns = await Marketing.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/marketing/campaigns/:id
 * @desc    Get single campaign
 * @access  Private
 */
exports.getCampaign = async (req, res, next) => {
  try {
    const campaign = await Marketing.findById(req.params.id).populate('createdBy', 'name email');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/marketing/campaigns/:id
 * @desc    Update campaign
 * @access  Private
 */
exports.updateCampaign = async (req, res, next) => {
  try {
    const campaign = await Marketing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/marketing/campaigns/:id
 * @desc    Delete campaign
 * @access  Private/Admin
 */
exports.deleteCampaign = async (req, res, next) => {
  try {
    const campaign = await Marketing.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    await campaign.deleteOne();

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/marketing/suggestions
 * @desc    Get AI marketing suggestions
 * @access  Private
 */
exports.getSuggestions = async (req, res, next) => {
  try {
    // Get sales data
    const today = new Date();
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    
    const orders = await Order.find({
      createdAt: { $gte: last7Days },
      status: 'completed',
    });
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const avgDailyRevenue = totalRevenue / 7;
    
    const salesData = {
      trend: avgDailyRevenue < 5000 ? 'low' : 'normal',
      avgDailyRevenue,
    };
    
    // Get inventory data
    const inventory = await Inventory.find();
    const highStock = inventory
      .filter(item => item.quantity > item.reorderLevel * 3)
      .map(item => item.itemName);
    
    const inventoryData = {
      highStock,
    };
    
    // Generate suggestions
    const suggestions = await generateSuggestions(salesData, inventoryData);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/marketing/customers
 * @desc    Get unique customers from orders (for marketing audience)
 * @access  Private
 */
exports.getCustomers = async (req, res, next) => {
  try {
    const orders = await Order.find({
      status: 'completed',
      $or: [
        { customerPhone: { $exists: true, $ne: '' } },
        { customerEmail: { $exists: true, $ne: '' } },
      ],
    }).select('customerName customerPhone customerEmail').lean();

    // Deduplicate by phone, then by email
    const seen = new Set();
    const customers = [];
    for (const o of orders) {
      const key = o.customerPhone || o.customerEmail;
      if (key && !seen.has(key)) {
        seen.add(key);
        customers.push({
          name: o.customerName || 'Customer',
          phone: o.customerPhone || null,
          email: o.customerEmail || null,
        });
      }
    }

    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/marketing/send/email
 * @desc    Send campaign to all customers via email
 * @access  Private
 */
exports.sendEmail = async (req, res, next) => {
  try {
    const { subject, content, context } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

    // Get customers with emails
    const orders = await Order.find({ customerEmail: { $exists: true, $ne: '' }, status: 'completed' })
      .select('customerName customerEmail').lean();

    const seen = new Set();
    const customers = [];
    for (const o of orders) {
      if (o.customerEmail && !seen.has(o.customerEmail)) {
        seen.add(o.customerEmail);
        customers.push({ name: o.customerName || 'Valued Customer', email: o.customerEmail });
      }
    }

    const result = await sendBulkEmail(customers, subject || 'Special offer from Food7 🍽️', content, context || '');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/marketing/send/sms
 * @desc    Send campaign to all customers via SMS (Free SMS providers)
 * @access  Private
 */
exports.sendSMS = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

    const orders = await Order.find({ customerPhone: { $exists: true, $ne: '' }, status: 'completed' })
      .select('customerName customerPhone').lean();

    const seen = new Set();
    const customers = [];
    for (const o of orders) {
      if (o.customerPhone && !seen.has(o.customerPhone)) {
        seen.add(o.customerPhone);
        customers.push({ name: o.customerName || 'Customer', phone: o.customerPhone });
      }
    }

    const result = await sendBulkSMS(customers, content);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/marketing/send/whatsapp
 * @desc    Send campaign to all customers via WhatsApp
 * @access  Private
 */
exports.sendWhatsApp = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

    const orders = await Order.find({ customerPhone: { $exists: true, $ne: '' }, status: 'completed' })
      .select('customerName customerPhone').lean();

    const seen = new Set();
    const customers = [];
    for (const o of orders) {
      if (o.customerPhone && !seen.has(o.customerPhone)) {
        seen.add(o.customerPhone);
        customers.push({ name: o.customerName || 'Customer', phone: o.customerPhone });
      }
    }

    const result = await sendBulkWhatsApp(customers, content);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/marketing/send/instagram
 * @desc    Post campaign content to Instagram
 * @access  Private
 */
exports.sendInstagram = async (req, res, next) => {
  try {
    const { content, imageUrl } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' });

    const result = await postToInstagram(content, imageUrl);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
