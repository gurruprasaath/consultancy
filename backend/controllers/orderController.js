/**
 * Order Controller
 * Handles billing and order management
 */

const Order = require('../models/Order');
const Analytics = require('../models/Analytics');
const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');
const { sendBillEmail, sendCouponEmail, sendOwnerOrderAlert } = require('../services/emailService');
const { recordVisitAndCheckLoyalty, redeemCoupon: validateCoupon, markCouponUsed } = require('../services/couponService');

/**
 * @route   GET /api/orders
 * @desc    Get all orders
 * @access  Private
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { status, startDate, endDate, limit = 50 } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order
 * @access  Private
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
exports.createOrder = async (req, res, next) => {
  try {
    const {
      items, paymentMethod, customerName, customerPhone, customerEmail,
      tableNumber, notes, couponCode,
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item',
      });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      item.total = item.price * item.quantity;
      return sum + item.total;
    }, 0);
    const gst = subtotal * 0.05;
    let total = subtotal + gst;

    // Apply coupon discount if provided
    let discountAmount = 0;
    let appliedCouponCode = null;
    if (couponCode && customerPhone) {
      const couponResult = await validateCoupon(couponCode, customerPhone);
      if (couponResult.valid) {
        discountAmount = (total * couponResult.discountPercent) / 100;
        total = total - discountAmount;
        appliedCouponCode = couponCode.toUpperCase().trim();
      }
    }

    // Generate a unique order number
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const orderNumber = `F7-${dateStr}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const order = new Order({
      orderNumber,
      items,
      subtotal,
      gst,
      total,
      discountAmount,
      couponCode: appliedCouponCode,
      paymentMethod,
      customerName,
      customerPhone,
      customerEmail,
      tableNumber,
      notes,
      createdBy: req.user.id,
    });
    await order.save();

    // Mark coupon as used
    if (appliedCouponCode) {
      await markCouponUsed(appliedCouponCode, orderNumber);
    }

    // Update inventory based on recipe ingredients
    for (const item of items) {
      const menuItem = await MenuItem.findOne({ name: item.name }).populate('ingredients.inventoryItem');
      if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
        // Deduct ingredients based on recipe
        for (const ingredient of menuItem.ingredients) {
          if (ingredient.inventoryItem) {
            const usedQty = ingredient.quantity * item.quantity;
            ingredient.inventoryItem.addUsage(usedQty, 0);
            await ingredient.inventoryItem.save();
          }
        }
      }
    }

    // Update analytics
    const analytics = await Analytics.getToday();
    analytics.revenue.total += total;
    analytics.revenue[paymentMethod] = (analytics.revenue[paymentMethod] || 0) + total;
    analytics.orders.total += 1;
    analytics.orders.completed += 1;
    analytics.orders.averageValue = analytics.revenue.total / analytics.orders.total;
    await analytics.save();

    // Send bill email to customer (non-blocking)
    sendBillEmail(order).catch(err => console.error('Bill email failed:', err.message));

    // Send real-time order alert to owner (non-blocking)
    sendOwnerOrderAlert(order, req.user?.name || req.user?.email || 'Staff')
      .catch(err => console.error('Owner alert failed:', err.message));

    // Track visit & check loyalty coupon (non-blocking)
    // Also saves the customer's visit count onto the order record
    if (customerPhone) {
      recordVisitAndCheckLoyalty({
        phone: customerPhone,
        name: customerName,
        email: customerEmail,
        orderTotal: total,
      }).then(async ({ profile, coupon }) => {
        // Stamp visit count on the order so history shows "Nth visit"
        if (profile) {
          await Order.findByIdAndUpdate(order._id, { customerVisitCount: profile.visitCount });
        }
        if (coupon) {
          sendCouponEmail(coupon).catch(err => console.error('Coupon email failed:', err.message));
          console.log(`🎁 Loyalty coupon ${coupon.code} (${coupon.discountPercent}% off) sent to ${customerPhone}`);
        }
      }).catch(err => console.error('Loyalty tracking failed:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order status
 * @access  Private
 */
exports.updateOrder = async (req, res, next) => {
  try {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    order.status = status || order.status;
    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete order
 * @access  Private/Admin
 */
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    await order.deleteOne();

    res.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/orders/stats/today
 * @desc    Get today's order statistics
 * @access  Private
 */
exports.getTodayStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'completed',
    });

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      avgOrderValue: 0,
      paymentMethods: {
        cash: 0,
        card: 0,
        upi: 0,
        online: 0,
      },
    };

    stats.avgOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

    orders.forEach(order => {
      stats.paymentMethods[order.paymentMethod] += order.total;
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/orders/validate-coupon
 * @desc    Validate a coupon code + phone before checkout
 * @access  Private
 */
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, phone } = req.body;
    if (!code || !phone) {
      return res.status(400).json({ success: false, message: 'Code and phone are required' });
    }
    const result = await validateCoupon(code, phone);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
