/**
 * Email Marketing Service
 * Uses Nodemailer + Gmail SMTP — completely FREE
 * Setup: Gmail → Settings → Security → App Passwords → generate one
 */

const nodemailer = require('nodemailer');
const config = require('../config/env');

function createTransporter() {
  if (!config.emailUser || !config.emailAppPassword) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: config.emailUser,
      pass: config.emailAppPassword,
    },
  });
}

/**
 * Build a context-relevant Unsplash food image URL (free, no API key needed)
 */
function getFoodImageUrl(context) {
  const raw = typeof context === 'string' ? context : '';
  const keywords = raw
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 3)
    .join(',');
  const query = encodeURIComponent((keywords || 'indian food') + ',food,restaurant');
  return `https://source.unsplash.com/1200x500/?${query}`;
}

/**
 * Build a premium branded HTML email for Food7 with a hero food image
 */
function buildHtmlEmail(customerName, content, subject, context) {
  const imageUrl = getFoodImageUrl(context);
  // Convert newlines to <br> for HTML display
  const htmlContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6);">

        <!-- Header / Logo -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a0505,#2d0a0a);padding:28px 40px;text-align:center;border-bottom:2px solid #8B0000;">
            <h1 style="margin:0;font-size:38px;font-weight:900;color:#C9A84C;letter-spacing:-1px;font-family:Georgia,serif;">Food7</h1>
            <p style="margin:4px 0 0;font-size:10px;color:#7A7570;letter-spacing:4px;text-transform:uppercase;">Premium Restaurant</p>
          </td>
        </tr>

        <!-- Hero Food Image -->
        <tr>
          <td style="padding:0;line-height:0;">
            <img src="${imageUrl}"
                 alt="Delicious food at Food7"
                 width="600"
                 style="width:100%;max-width:600px;height:260px;object-fit:cover;display:block;border:none;"
                 onerror="this.style.display='none'">
          </td>
        </tr>

        <!-- Red accent bar -->
        <tr>
          <td style="background:linear-gradient(90deg,#8B0000,#C0392B,#8B0000);height:4px;line-height:4px;font-size:0;">&nbsp;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#111111;padding:36px 40px;">
            ${customerName
              ? `<p style="margin:0 0 20px;font-size:16px;color:#F0EDE8;line-height:1.5;">
                   Hey <strong style="color:#C9A84C;">${customerName}</strong> 👋,
                 </p>`
              : ''}
            <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-left:4px solid #8B0000;border-radius:12px;padding:28px 28px;font-size:15px;line-height:1.8;color:#D8D4CF;">
              ${htmlContent}
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin-top:32px;">
              <a href="#" style="display:inline-block;background:linear-gradient(135deg,#8B0000,#C0392B);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:50px;letter-spacing:0.5px;box-shadow:0 4px 20px rgba(139,0,0,0.5);">
                🍽️ Reserve Your Table Now
              </a>
            </div>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="background:#1A1A1A;height:1px;line-height:1px;font-size:0;">&nbsp;</td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0D0D0D;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:20px;color:#C9A84C;font-family:Georgia,serif;font-weight:700;">Food7</p>
            <p style="margin:0 0 12px;font-size:12px;color:#7A7570;line-height:1.6;">
              You're receiving this because you dined with us.<br>
              We'd love to see you again soon.
            </p>
            <p style="margin:0;font-size:11px;color:#3A3530;">© 2026 Food7 Restaurant. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send marketing email to a list of customers
 * @param {Array} customers - [{ name, email }]
 * @param {string} subject
 * @param {string} content - The AI-generated marketing text
 * @param {string} context - Original context string (used to pick food image)
 */
async function sendBulkEmail(customers, subject, content, context = '') {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      message: 'Email not configured. Add EMAIL_USER and EMAIL_APP_PASSWORD to .env',
      configured: false,
    };
  }

  const results = { sent: 0, failed: 0, errors: [] };

  for (const customer of customers) {
    if (!customer.email) continue;
    try {
      await transporter.sendMail({
        from: `"Food7 Restaurant" <${config.emailUser}>`,
        to: customer.email,
        subject,
        html: buildHtmlEmail(customer.name, content, subject, context),
        text: content,
      });
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push({ email: customer.email, error: err.message });
    }
  }

  return {
    success: true,
    configured: true,
    ...results,
    message: `Sent to ${results.sent} customers. ${results.failed} failed.`,
  };
}

/**
 * Send a test email to verify configuration
 */
async function sendTestEmail(toEmail) {
  return sendBulkEmail(
    [{ name: 'Test', email: toEmail }],
    '✅ Food7 Email Test',
    'This is a test email from your Food7 marketing system. Everything is working perfectly!',
    'indian food restaurant'
  );
}

/**
 * Send an itemized bill receipt to the customer
 */
async function sendBillEmail(order) {
  const transporter = createTransporter();
  if (!transporter || !order.customerEmail) return { sent: false };

  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding:10px 12px;color:#D0CCC8;border-bottom:1px solid #2A2A2A;">${item.name}</td>
      <td style="padding:10px 12px;color:#D0CCC8;border-bottom:1px solid #2A2A2A;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;color:#D0CCC8;border-bottom:1px solid #2A2A2A;text-align:right;">₹${item.price.toFixed(2)}</td>
      <td style="padding:10px 12px;color:#C9A84C;border-bottom:1px solid #2A2A2A;text-align:right;font-weight:600;">₹${item.total.toFixed(2)}</td>
    </tr>`).join('');

  const discountRow = order.discountAmount > 0 ? `
    <tr>
      <td colspan="3" style="padding:10px 12px;color:#4CAF50;text-align:right;">Discount (${order.couponCode || 'Coupon'})</td>
      <td style="padding:10px 12px;color:#4CAF50;text-align:right;font-weight:600;">-₹${order.discountAmount.toFixed(2)}</td>
    </tr>` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Your Food7 Bill</title></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a0505,#2d0a0a);padding:28px 40px;text-align:center;border-bottom:2px solid #8B0000;">
    <h1 style="margin:0;font-size:34px;font-weight:900;color:#C9A84C;font-family:Georgia,serif;">Food7</h1>
    <p style="margin:4px 0 0;font-size:10px;color:#7A7570;letter-spacing:4px;text-transform:uppercase;">Your Bill Receipt</p>
  </td></tr>
  <!-- Order Info -->
  <tr><td style="background:#111;padding:24px 40px;">
    <p style="margin:0 0 4px;color:#7A7570;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Order Number</p>
    <p style="margin:0 0 16px;color:#C9A84C;font-size:20px;font-weight:700;">${order.orderNumber}</p>
    <p style="margin:0;color:#D0CCC8;font-size:14px;">Hi <strong style="color:#C9A84C;">${order.customerName || 'Valued Customer'}</strong>, thank you for dining with us! 🍽️</p>
  </td></tr>
  <!-- Items Table -->
  <tr><td style="background:#111;padding:0 40px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #2A2A2A;">
      <thead>
        <tr style="background:#1A1A1A;">
          <th style="padding:12px;color:#7A7570;font-size:11px;text-transform:uppercase;text-align:left;">Item</th>
          <th style="padding:12px;color:#7A7570;font-size:11px;text-transform:uppercase;text-align:center;">Qty</th>
          <th style="padding:12px;color:#7A7570;font-size:11px;text-transform:uppercase;text-align:right;">Price</th>
          <th style="padding:12px;color:#7A7570;font-size:11px;text-transform:uppercase;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:10px 12px;color:#7A7570;text-align:right;">Subtotal</td>
            <td style="padding:10px 12px;color:#D0CCC8;text-align:right;">₹${order.subtotal.toFixed(2)}</td></tr>
        <tr><td colspan="3" style="padding:10px 12px;color:#7A7570;text-align:right;">GST (5%)</td>
            <td style="padding:10px 12px;color:#D0CCC8;text-align:right;">₹${order.gst.toFixed(2)}</td></tr>
        ${discountRow}
        <tr style="background:#1A1A1A;">
          <td colspan="3" style="padding:14px 12px;color:#C9A84C;font-weight:700;text-align:right;font-size:15px;">TOTAL</td>
          <td style="padding:14px 12px;color:#C9A84C;font-weight:700;text-align:right;font-size:18px;">₹${order.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="margin:16px 0 0;color:#7A7570;font-size:12px;">Payment: <strong style="color:#D0CCC8;text-transform:capitalize;">${order.paymentMethod}</strong></p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#0D0D0D;padding:20px 40px;text-align:center;border-top:1px solid #1E1E1E;">
    <p style="margin:0 0 6px;font-size:18px;color:#C9A84C;font-family:Georgia,serif;font-weight:700;">Food7</p>
    <p style="margin:0;font-size:12px;color:#3A3530;">© 2026 Food7 Restaurant. We hope to see you again soon! ❤️</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  try {
    await transporter.sendMail({
      from: `"Food7 Restaurant" <${config.emailUser}>`,
      to: order.customerEmail,
      subject: `Your Food7 Bill — ${order.orderNumber}`,
      html,
      text: `Thank you for dining at Food7!\nOrder: ${order.orderNumber}\nTotal: ₹${order.total.toFixed(2)}\nPayment: ${order.paymentMethod}`,
    });
    return { sent: true };
  } catch (err) {
    console.error('Bill email error:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send a loyalty coupon email to the customer
 */
async function sendCouponEmail(coupon) {
  const transporter = createTransporter();
  if (!transporter || !coupon.customerEmail) return { sent: false };

  const expiry = new Date(coupon.expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Your Food7 Loyalty Reward</title></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a0505,#2d0a0a);padding:28px 40px;text-align:center;border-bottom:2px solid #C9A84C;">
    <h1 style="margin:0;font-size:34px;font-weight:900;color:#C9A84C;font-family:Georgia,serif;">Food7</h1>
    <p style="margin:4px 0 0;font-size:10px;color:#7A7570;letter-spacing:4px;text-transform:uppercase;">Loyalty Reward 🎁</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="background:#111;padding:36px 40px;text-align:center;">
    <p style="margin:0 0 8px;color:#D0CCC8;font-size:16px;">Hey <strong style="color:#C9A84C;">${coupon.customerName || 'Valued Customer'}</strong>! 🎉</p>
    <p style="margin:0 0 28px;color:#7A7570;font-size:14px;line-height:1.6;">
      You've visited us <strong style="color:#C9A84C;">${coupon.visitMilestone} times</strong> — you're a Food7 legend!<br>
      As a thank you, here's an exclusive discount just for you:
    </p>
    <!-- Coupon Card -->
    <div style="background:linear-gradient(135deg,#1A0A0A,#2D1010);border:2px dashed #C9A84C;border-radius:16px;padding:32px 24px;margin:0 auto;max-width:360px;">
      <p style="margin:0 0 8px;font-size:13px;color:#7A7570;text-transform:uppercase;letter-spacing:3px;">Your Coupon Code</p>
      <p style="margin:0 0 16px;font-size:28px;font-weight:900;color:#C9A84C;letter-spacing:4px;font-family:monospace;">${coupon.code}</p>
      <div style="background:#8B0000;border-radius:50px;padding:10px 24px;display:inline-block;margin-bottom:16px;">
        <span style="color:#fff;font-size:22px;font-weight:900;">${coupon.discountPercent}% OFF</span>
      </div>
      <p style="margin:0;font-size:12px;color:#7A7570;">Valid until <strong style="color:#D0CCC8;">${expiry}</strong></p>
    </div>
    <!-- Instructions -->
    <div style="margin-top:28px;background:#1A1A1A;border-radius:10px;padding:20px;text-align:left;">
      <p style="margin:0 0 8px;color:#C9A84C;font-size:13px;font-weight:700;">How to use:</p>
      <ol style="margin:0;padding-left:20px;color:#7A7570;font-size:13px;line-height:1.8;">
        <li>Visit Food7 and place your order</li>
        <li>Enter code <strong style="color:#C9A84C;">${coupon.code}</strong> at billing</li>
        <li>Show your phone number <strong style="color:#C9A84C;">${coupon.phone}</strong> for verification</li>
        <li>Enjoy your ${coupon.discountPercent}% discount! 🎉</li>
      </ol>
      <p style="margin:12px 0 0;color:#3A3530;font-size:11px;">⚠️ One-time use only. Non-transferable. Valid only for the registered phone number.</p>
    </div>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#0D0D0D;padding:20px 40px;text-align:center;border-top:1px solid #1E1E1E;">
    <p style="margin:0;font-size:12px;color:#3A3530;">© 2026 Food7 Restaurant. Thank you for your loyalty! ❤️</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  try {
    await transporter.sendMail({
      from: `"Food7 Restaurant" <${config.emailUser}>`,
      to: coupon.customerEmail,
      subject: `🎁 Your ${coupon.discountPercent}% Loyalty Reward — Food7`,
      html,
      text: `Congratulations! You've earned a ${coupon.discountPercent}% discount at Food7.\nCode: ${coupon.code}\nValid until: ${expiry}\nShow your phone number ${coupon.phone} at billing.`,
    });
    return { sent: true };
  } catch (err) {
    console.error('Coupon email error:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send real-time order alert to the owner
 * Called immediately after every order is created
 */
async function sendOwnerOrderAlert(order, cashierName) {
  const transporter = createTransporter();
  if (!transporter || !config.ownerEmail) return { sent: false };

  const time = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const itemRows = order.items.map(item =>
    `<tr>
      <td style="padding:8px 12px;color:#D0CCC8;border-bottom:1px solid #1E1E1E;">${item.name}</td>
      <td style="padding:8px 12px;color:#D0CCC8;border-bottom:1px solid #1E1E1E;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;color:#C9A84C;border-bottom:1px solid #1E1E1E;text-align:right;font-weight:600;">₹${item.total.toFixed(2)}</td>
    </tr>`
  ).join('');

  const discountRow = order.discountAmount > 0
    ? `<tr><td colspan="2" style="padding:8px 12px;color:#4CAF50;text-align:right;">Discount (${order.couponCode || 'Coupon'})</td>
       <td style="padding:8px 12px;color:#4CAF50;text-align:right;font-weight:600;">-₹${order.discountAmount.toFixed(2)}</td></tr>`
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:24px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border-radius:14px;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0a1a0a,#0d2b0d);padding:20px 32px;border-bottom:2px solid #2d8a2d;">
    <table width="100%"><tr>
      <td><h1 style="margin:0;font-size:20px;font-weight:900;color:#4CAF50;">🔔 New Order Alert</h1>
          <p style="margin:4px 0 0;font-size:11px;color:#5A7570;letter-spacing:2px;text-transform:uppercase;">Food7 — Owner Notification</p></td>
      <td style="text-align:right;"><span style="background:#4CAF50;color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;">${order.orderNumber}</span></td>
    </tr></table>
  </td></tr>
  <!-- Meta info -->
  <tr><td style="background:#111;padding:16px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:6px 0;width:50%;">
          <p style="margin:0;font-size:11px;color:#5A7570;text-transform:uppercase;letter-spacing:1px;">Cashier</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#F0EDE8;">${cashierName || 'Unknown'}</p>
        </td>
        <td style="padding:6px 0;width:50%;">
          <p style="margin:0;font-size:11px;color:#5A7570;text-transform:uppercase;letter-spacing:1px;">Time</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#F0EDE8;">${time}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;">
          <p style="margin:0;font-size:11px;color:#5A7570;text-transform:uppercase;letter-spacing:1px;">Customer</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#F0EDE8;">${order.customerName || '—'} ${order.customerPhone ? `· ${order.customerPhone}` : ''}</p>
        </td>
        <td style="padding:6px 0;">
          <p style="margin:0;font-size:11px;color:#5A7570;text-transform:uppercase;letter-spacing:1px;">Table / Payment</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:#F0EDE8;">${order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'} · ${(order.paymentMethod || '').toUpperCase()}</p>
        </td>
      </tr>
    </table>
  </td></tr>
  <!-- Items -->
  <tr><td style="background:#111;padding:0 32px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1E1E1E;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#1A1A1A;">
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:left;">Item</th>
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:center;">Qty</th>
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:right;">Amount</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr><td colspan="2" style="padding:8px 12px;color:#5A7570;text-align:right;font-size:12px;">Subtotal</td>
            <td style="padding:8px 12px;color:#D0CCC8;text-align:right;">₹${order.subtotal.toFixed(2)}</td></tr>
        <tr><td colspan="2" style="padding:8px 12px;color:#5A7570;text-align:right;font-size:12px;">GST (5%)</td>
            <td style="padding:8px 12px;color:#D0CCC8;text-align:right;">₹${order.gst.toFixed(2)}</td></tr>
        ${discountRow}
        <tr style="background:#1A1A1A;">
          <td colspan="2" style="padding:12px;color:#4CAF50;font-weight:700;text-align:right;font-size:14px;">TOTAL COLLECTED</td>
          <td style="padding:12px;color:#4CAF50;font-weight:900;text-align:right;font-size:18px;">₹${order.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#0D0D0D;padding:14px 32px;text-align:center;border-top:1px solid #1E1E1E;">
    <p style="margin:0;font-size:11px;color:#3A3530;">Food7 Restaurant · Owner Alert System · ${new Date().getFullYear()}</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  try {
    await transporter.sendMail({
      from: `"Food7 Alerts" <${config.emailUser}>`,
      to: config.ownerEmail,
      subject: `🔔 Order ${order.orderNumber} — ₹${order.total.toFixed(2)} by ${cashierName || 'Staff'}`,
      html,
      text: `New Order: ${order.orderNumber}\nCashier: ${cashierName}\nTotal: ₹${order.total.toFixed(2)}\nItems: ${order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}\nTime: ${time}`,
    });
    return { sent: true };
  } catch (err) {
    console.error('Owner alert email error:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Send end-of-day daily report to the owner
 * Called by the cron scheduler at 11:59 PM every day
 */
async function sendDailyReport(reportData) {
  const transporter = createTransporter();
  if (!transporter || !config.ownerEmail) return { sent: false };

  const {
    date, totalOrders, totalRevenue, totalGst, totalDiscount,
    netRevenue, cashOrders, cardOrders, upiOrders,
    topItems, cashierBreakdown, avgOrderValue, totalItemsSold,
  } = reportData;

  const topItemRows = (topItems || []).slice(0, 10).map((item, i) =>
    `<tr style="${i % 2 === 0 ? 'background:#161616;' : ''}">
      <td style="padding:8px 12px;color:#D0CCC8;">${i + 1}. ${item.name}</td>
      <td style="padding:8px 12px;color:#D0CCC8;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;color:#C9A84C;text-align:right;font-weight:600;">₹${item.revenue.toFixed(2)}</td>
    </tr>`
  ).join('');

  const cashierRows = (cashierBreakdown || []).map((c, i) =>
    `<tr style="${i % 2 === 0 ? 'background:#161616;' : ''}">
      <td style="padding:8px 12px;color:#D0CCC8;">${c.name}</td>
      <td style="padding:8px 12px;color:#D0CCC8;text-align:center;">${c.orders}</td>
      <td style="padding:8px 12px;color:#C9A84C;text-align:right;font-weight:600;">₹${c.revenue.toFixed(2)}</td>
    </tr>`
  ).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:24px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a0505,#2d0a0a);padding:28px 40px;text-align:center;border-bottom:2px solid #C9A84C;">
    <h1 style="margin:0;font-size:32px;font-weight:900;color:#C9A84C;font-family:Georgia,serif;">Food7</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#7A7570;letter-spacing:3px;text-transform:uppercase;">Daily Business Report</p>
    <p style="margin:8px 0 0;font-size:16px;color:#F0EDE8;font-weight:600;">${date}</p>
  </td></tr>

  <!-- Revenue Summary Cards -->
  <tr><td style="background:#111;padding:24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:50%;padding-right:8px;">
          <div style="background:linear-gradient(135deg,#0a2a0a,#0d3d0d);border:1px solid #2d8a2d;border-radius:12px;padding:18px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#5A7570;text-transform:uppercase;letter-spacing:2px;">Total Revenue</p>
            <p style="margin:8px 0 0;font-size:28px;font-weight:900;color:#4CAF50;">₹${totalRevenue.toFixed(2)}</p>
          </div>
        </td>
        <td style="width:50%;padding-left:8px;">
          <div style="background:linear-gradient(135deg,#1a0a00,#2d1800);border:1px solid #8B4513;border-radius:12px;padding:18px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#5A7570;text-transform:uppercase;letter-spacing:2px;">Total Orders</p>
            <p style="margin:8px 0 0;font-size:28px;font-weight:900;color:#C9A84C;">${totalOrders}</p>
          </div>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:12px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:33%;padding-right:6px;">
              <div style="background:#161616;border:1px solid #1E1E1E;border-radius:10px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;color:#5A7570;text-transform:uppercase;letter-spacing:1px;">Avg Order</p>
                <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#F0EDE8;">₹${(avgOrderValue || 0).toFixed(2)}</p>
              </div>
            </td>
            <td style="width:33%;padding:0 3px;">
              <div style="background:#161616;border:1px solid #1E1E1E;border-radius:10px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;color:#5A7570;text-transform:uppercase;letter-spacing:1px;">Items Sold</p>
                <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#F0EDE8;">${totalItemsSold}</p>
              </div>
            </td>
            <td style="width:33%;padding-left:6px;">
              <div style="background:#161616;border:1px solid #1E1E1E;border-radius:10px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;color:#5A7570;text-transform:uppercase;letter-spacing:1px;">Discounts Given</p>
                <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#EF4444;">₹${(totalDiscount || 0).toFixed(2)}</p>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Payment Breakdown -->
  <tr><td style="background:#111;padding:0 40px 24px;">
    <p style="margin:0 0 12px;font-size:13px;color:#7A7570;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Payment Breakdown</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1E1E1E;border-radius:10px;overflow:hidden;">
      <tr style="background:#1A1A1A;">
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:left;">Method</th>
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:center;">Orders</th>
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:right;">Amount</th>
      </tr>
      <tr><td style="padding:8px 12px;color:#D0CCC8;">💵 Cash</td>
          <td style="padding:8px 12px;color:#D0CCC8;text-align:center;">${cashOrders?.count || 0}</td>
          <td style="padding:8px 12px;color:#C9A84C;text-align:right;font-weight:600;">₹${(cashOrders?.amount || 0).toFixed(2)}</td></tr>
      <tr style="background:#161616;"><td style="padding:8px 12px;color:#D0CCC8;">💳 Card</td>
          <td style="padding:8px 12px;color:#D0CCC8;text-align:center;">${cardOrders?.count || 0}</td>
          <td style="padding:8px 12px;color:#C9A84C;text-align:right;font-weight:600;">₹${(cardOrders?.amount || 0).toFixed(2)}</td></tr>
      <tr><td style="padding:8px 12px;color:#D0CCC8;">📱 UPI</td>
          <td style="padding:8px 12px;color:#D0CCC8;text-align:center;">${upiOrders?.count || 0}</td>
          <td style="padding:8px 12px;color:#C9A84C;text-align:right;font-weight:600;">₹${(upiOrders?.amount || 0).toFixed(2)}</td></tr>
      <tr style="background:#1A1A1A;">
        <td colspan="2" style="padding:12px;color:#C9A84C;font-weight:700;text-align:right;">TOTAL</td>
        <td style="padding:12px;color:#C9A84C;font-weight:900;text-align:right;font-size:16px;">₹${totalRevenue.toFixed(2)}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Top Selling Items -->
  ${topItemRows ? `
  <tr><td style="background:#111;padding:0 40px 24px;">
    <p style="margin:0 0 12px;font-size:13px;color:#7A7570;text-transform:uppercase;letter-spacing:2px;font-weight:600;">🏆 Top Selling Items</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1E1E1E;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#1A1A1A;">
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:left;">Item</th>
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:center;">Qty Sold</th>
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:right;">Revenue</th>
      </tr></thead>
      <tbody>${topItemRows}</tbody>
    </table>
  </td></tr>` : ''}

  <!-- Cashier Breakdown -->
  ${cashierRows ? `
  <tr><td style="background:#111;padding:0 40px 24px;">
    <p style="margin:0 0 12px;font-size:13px;color:#7A7570;text-transform:uppercase;letter-spacing:2px;font-weight:600;">👤 Cashier Performance</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1E1E1E;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#1A1A1A;">
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:left;">Cashier</th>
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:center;">Orders</th>
        <th style="padding:10px 12px;color:#5A7570;font-size:11px;text-transform:uppercase;text-align:right;">Revenue</th>
      </tr></thead>
      <tbody>${cashierRows}</tbody>
    </table>
  </td></tr>` : ''}

  <!-- GST Summary -->
  <tr><td style="background:#111;padding:0 40px 24px;">
    <div style="background:#161616;border:1px solid #1E1E1E;border-radius:10px;padding:16px 20px;">
      <p style="margin:0 0 10px;font-size:13px;color:#7A7570;text-transform:uppercase;letter-spacing:2px;font-weight:600;">📊 Financial Summary</p>
      <table width="100%">
        <tr><td style="color:#7A7570;font-size:13px;padding:4px 0;">Gross Revenue (incl. GST)</td>
            <td style="color:#F0EDE8;text-align:right;font-weight:600;">₹${totalRevenue.toFixed(2)}</td></tr>
        <tr><td style="color:#7A7570;font-size:13px;padding:4px 0;">GST Collected (5%)</td>
            <td style="color:#EF4444;text-align:right;font-weight:600;">₹${(totalGst || 0).toFixed(2)}</td></tr>
        <tr><td style="color:#7A7570;font-size:13px;padding:4px 0;">Discounts Given</td>
            <td style="color:#EF4444;text-align:right;font-weight:600;">₹${(totalDiscount || 0).toFixed(2)}</td></tr>
        <tr style="border-top:1px solid #2A2A2A;">
          <td style="color:#C9A84C;font-size:14px;font-weight:700;padding:8px 0 4px;">Net Revenue (excl. GST)</td>
          <td style="color:#4CAF50;text-align:right;font-weight:900;font-size:16px;">₹${(netRevenue || 0).toFixed(2)}</td>
        </tr>
      </table>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#0D0D0D;padding:20px 40px;text-align:center;border-top:1px solid #1E1E1E;">
    <p style="margin:0 0 4px;font-size:18px;color:#C9A84C;font-family:Georgia,serif;font-weight:700;">Food7</p>
    <p style="margin:0;font-size:11px;color:#3A3530;">Automated Daily Report · Generated at 11:59 PM IST</p>
  </td></tr>

</table></td></tr></table></body></html>`;

  try {
    await transporter.sendMail({
      from: `"Food7 Reports" <${config.emailUser}>`,
      to: config.ownerEmail,
      subject: `📊 Food7 Daily Report — ${date} · ₹${totalRevenue.toFixed(2)} · ${totalOrders} orders`,
      html,
      text: `Food7 Daily Report — ${date}\nTotal Revenue: ₹${totalRevenue.toFixed(2)}\nTotal Orders: ${totalOrders}\nItems Sold: ${totalItemsSold}\nAvg Order: ₹${(avgOrderValue || 0).toFixed(2)}\nGST: ₹${(totalGst || 0).toFixed(2)}\nNet Revenue: ₹${(netRevenue || 0).toFixed(2)}`,
    });
    return { sent: true };
  } catch (err) {
    console.error('Daily report email error:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendBulkEmail, sendTestEmail, sendBillEmail, sendCouponEmail, sendOwnerOrderAlert, sendDailyReport };


