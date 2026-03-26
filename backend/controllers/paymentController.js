/**
 * Payment Controller — Razorpay integration
 *
 * Flow:
 *  1. Frontend calls POST /api/payments/create-order  → gets razorpay_order_id
 *  2. Frontend opens Razorpay checkout with that id
 *  3. On payment success Razorpay returns { razorpay_payment_id, razorpay_order_id, razorpay_signature }
 *  4. Frontend calls POST /api/payments/verify  → server validates signature and creates the Food7 order
 */

const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Analytics = require('../models/Analytics');
const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');

function generateOrderNumber() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `F7-${dateStr}-${rand}`;
}

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || keyId.includes('XXXX') || !keySecret || keySecret.includes('XXXX')) {
    return null;
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * GET /api/payments/config
 * Returns the publishable key to the frontend (never the secret)
 */
exports.getPaymentConfig = (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const configured = keyId && !keyId.includes('XXXX');

  res.json({
    success: true,
    data: {
      keyId: configured ? keyId : null,
      configured,
      currency: 'INR',
    },
  });
};

/**
 * POST /api/payments/create-order
 * Body: { amount (in rupees), receipt, notes }
 * Creates a Razorpay order and returns its id for the checkout modal
 */
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, receipt, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const razorpay = getRazorpayInstance();

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: receipt || `food7_${Date.now()}`,
      notes: notes || {},
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/test-success
 * ONLY available in test mode (key starts with rzp_test_).
 * Simulates a completed Razorpay payment without opening the checkout modal.
 * Body: { amount (in rupees), orderData }
 * Returns the same shape as /verify so the frontend can treat it identically.
 */
exports.testSuccessPayment = async (req, res, next) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    // Safety guard — only works in Razorpay test mode
    if (!keyId.startsWith('rzp_test_')) {
      return res.status(403).json({
        success: false,
        message: 'test-success endpoint is only available in Razorpay test mode',
      });
    }

    const { amount, orderData } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Generate fake but realistic Razorpay IDs
    const timestamp = Date.now();
    const rand = () => Math.random().toString(36).slice(2, 10).toUpperCase();
    const fakeOrderId   = `order_TEST${rand()}${rand()}`;
    const fakePaymentId = `pay_TEST${rand()}${rand()}`;

    // Compute the HMAC the same way verifyPayment does, so it would pass verification
    const fakeSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${fakeOrderId}|${fakePaymentId}`)
      .digest('hex');

    // Create the Food7 order in DB (identical logic to verifyPayment)
    if (!orderData) {
      return res.json({
        success: true,
        message: 'Test payment simulated (no orderData provided)',
        data: {
          razorpay_order_id:   fakeOrderId,
          razorpay_payment_id: fakePaymentId,
          razorpay_signature:  fakeSignature,
        },
      });
    }

    const order = new Order({
      ...orderData,
      orderNumber: orderData.orderNumber || generateOrderNumber(),
      paymentMethod: 'online',
      status: 'completed',
      notes: `[TEST MODE] Simulated Payment ID: ${fakePaymentId}`,
      createdBy: req.user._id,
    });
    await order.save();

    // Update analytics
    try {
      const analytics = await Analytics.getToday();
      analytics.orders.total += 1;
      analytics.orders.completed += 1;
      analytics.revenue.total += orderData.total || 0;
      analytics.revenue.online = (analytics.revenue.online || 0) + (orderData.total || 0);
      await analytics.save();
    } catch (_) { /* non-fatal */ }

    // Deduct inventory based on recipe ingredients (best-effort)
    try {
      for (const item of (orderData.items || [])) {
        const menuItem = await MenuItem.findOne({ name: item.name }).populate('ingredients.inventoryItem');
        if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
          for (const ingredient of menuItem.ingredients) {
            if (ingredient.inventoryItem) {
              const usedQty = ingredient.quantity * item.quantity;
              ingredient.inventoryItem.addUsage(usedQty, 0);
              await ingredient.inventoryItem.save();
            }
          }
        }
      }
    } catch (_) { /* non-fatal */ }

    res.json({
      success: true,
      message: 'Test payment simulated and order created',
      data: {
        order,
        razorpay_payment_id: fakePaymentId,
        razorpay_order_id:   fakeOrderId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData }
 * Verifies HMAC signature, then creates the Food7 order in DB
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData, // Same shape as POST /api/orders body
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret || keySecret.includes('XXXX')) {
      return res.status(503).json({ success: false, message: 'Razorpay not configured' });
    }

    // Verify HMAC-SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed — invalid signature',
      });
    }

    // Signature valid → create the Food7 order
    if (!orderData) {
      return res.json({
        success: true,
        message: 'Payment verified',
        data: { razorpay_payment_id, razorpay_order_id },
      });
    }

    const order = new Order({
      ...orderData,
      orderNumber: orderData.orderNumber || generateOrderNumber(),
      paymentMethod: 'online',
      status: 'completed',
      notes: `Razorpay Payment ID: ${razorpay_payment_id}`,
      createdBy: req.user._id,
    });
    await order.save();

    // Update analytics
    try {
      const analytics = await Analytics.getToday();
      analytics.orders.total += 1;
      analytics.orders.completed += 1;
      analytics.revenue.total += orderData.total || 0;
      analytics.revenue.online = (analytics.revenue.online || 0) + (orderData.total || 0);
      await analytics.save();
    } catch (_) { /* non-fatal */ }

    // Deduct inventory based on recipe ingredients (best-effort)
    try {
      for (const item of (orderData.items || [])) {
        const menuItem = await MenuItem.findOne({ name: item.name }).populate('ingredients.inventoryItem');
        if (menuItem && menuItem.ingredients && menuItem.ingredients.length > 0) {
          for (const ingredient of menuItem.ingredients) {
            if (ingredient.inventoryItem) {
              const usedQty = ingredient.quantity * item.quantity;
              ingredient.inventoryItem.addUsage(usedQty, 0);
              await ingredient.inventoryItem.save();
            }
          }
        }
      }
    } catch (_) { /* non-fatal */ }

    res.json({
      success: true,
      message: 'Payment verified and order created',
      data: {
        order,
        razorpay_payment_id,
        razorpay_order_id,
      },
    });
  } catch (error) {
    next(error);
  }
};
