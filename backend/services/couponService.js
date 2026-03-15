/**
 * Coupon Service
 * Handles loyalty coupon generation, validation, and redemption
 *
 * Loyalty tiers (configurable):
 *   3rd visit  → 10% off coupon
 *   5th visit  → 15% off coupon
 *   10th visit → 20% off coupon
 *   Every 5 visits after 10 → 15% off coupon
 */

const Coupon = require('../models/Coupon');
const CustomerProfile = require('../models/CustomerProfile');

// Loyalty milestones: visitCount → discountPercent
const LOYALTY_MILESTONES = {
  3: 10,
  5: 15,
  10: 20,
};

// For visits beyond 10, reward every 5th visit with 15%
function getDiscountForVisit(visitCount, rewardedMilestones) {
  // Check fixed milestones
  if (LOYALTY_MILESTONES[visitCount] && !rewardedMilestones.includes(visitCount)) {
    return LOYALTY_MILESTONES[visitCount];
  }
  // Beyond 10: every 5th visit (15, 20, 25, ...)
  if (visitCount > 10 && visitCount % 5 === 0 && !rewardedMilestones.includes(visitCount)) {
    return 15;
  }
  return null;
}

/**
 * Generate a unique coupon code
 */
function generateCode(phone) {
  const suffix = phone.slice(-4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `F7-${date}-${suffix}-${rand}`;
}

/**
 * Upsert customer profile, increment visit count, return profile + any new coupon
 * @param {{ phone, name, email, orderTotal }} customerData
 * @returns {{ profile, coupon|null }}
 */
async function recordVisitAndCheckLoyalty(customerData) {
  const { phone, name, email, orderTotal = 0 } = customerData;

  if (!phone) return { profile: null, coupon: null };

  // Upsert customer profile
  let profile = await CustomerProfile.findOne({ phone });

  if (!profile) {
    profile = new CustomerProfile({
      phone,
      name: name || 'Customer',
      email: email || '',
      visitCount: 1,
      rewardedMilestones: [],
      totalSpent: orderTotal,
      lastVisit: new Date(),
    });
  } else {
    profile.visitCount += 1;
    profile.totalSpent += orderTotal;
    profile.lastVisit = new Date();
    if (name) profile.name = name;
    if (email) profile.email = email;
  }

  await profile.save();

  // Check if this visit earns a coupon
  const discount = getDiscountForVisit(profile.visitCount, profile.rewardedMilestones);
  if (!discount) return { profile, coupon: null };

  // Mark milestone as rewarded
  profile.rewardedMilestones.push(profile.visitCount);
  await profile.save();

  // Create coupon — valid for 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const coupon = await Coupon.create({
    code: generateCode(phone),
    phone,
    customerName: profile.name,
    customerEmail: profile.email,
    discountPercent: discount,
    expiresAt,
    visitMilestone: profile.visitCount,
  });

  return { profile, coupon };
}

/**
 * Validate and redeem a coupon
 * @param {string} code - Coupon code
 * @param {string} phone - Customer phone (must match)
 * @returns {{ valid: boolean, discountPercent?: number, message: string }}
 */
async function redeemCoupon(code, phone) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

  if (!coupon) {
    return { valid: false, message: 'Coupon not found.' };
  }
  if (coupon.phone !== phone.trim()) {
    return { valid: false, message: 'This coupon belongs to a different customer.' };
  }
  if (coupon.used) {
    return { valid: false, message: 'This coupon has already been used.' };
  }
  if (new Date() > coupon.expiresAt) {
    return { valid: false, message: `Coupon expired on ${coupon.expiresAt.toLocaleDateString()}.` };
  }

  return {
    valid: true,
    discountPercent: coupon.discountPercent,
    couponId: coupon._id,
    message: `${coupon.discountPercent}% discount applied!`,
  };
}

/**
 * Mark a coupon as used after order is placed
 */
async function markCouponUsed(code, orderNumber) {
  await Coupon.findOneAndUpdate(
    { code: code.toUpperCase().trim() },
    { used: true, usedAt: new Date(), usedInOrder: orderNumber }
  );
}

module.exports = { recordVisitAndCheckLoyalty, redeemCoupon, markCouponUsed, LOYALTY_MILESTONES };
