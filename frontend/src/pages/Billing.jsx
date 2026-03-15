/**
 * Billing Page
 * Smart billing with Razorpay payment gateway integration
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ordersAPI, menuAPI, paymentsAPI } from '../services/api';
import {
  Receipt, Plus, Minus, Trash2, ShoppingCart,
  Search, CheckCircle, CreditCard, Smartphone,
  Banknote, AlertCircle, RefreshCw, Shield,
  Building2, Wallet,
} from 'lucide-react';

const CATEGORY_ICONS = {
  starters: '🥗', mains: '🍛', breads: '🫓', rice: '🍚',
  desserts: '🍮', beverages: '🥤', sides: '🥙',
};

const GST_RATE = 0.05;

// ── Payment methods (user-facing — no "Razorpay" branding) ───────────────────
const PAYMENT_METHODS = [
  {
    key: 'cash',
    label: 'Cash',
    description: 'Pay at counter',
    Icon: Banknote,
    color: '#34D399',
    gateway: false,         // direct order, no gateway
    upiApps: null,
  },
  {
    key: 'upi',
    label: 'UPI Payment',
    description: 'GPay · PhonePe · Paytm',
    Icon: Smartphone,
    color: '#A78BFA',
    gateway: true,
    upiApps: ['G', 'P', 'T'],  // initials for GPay, PhonePe, Paytm
  },
  {
    key: 'card',
    label: 'Credit / Debit Card',
    description: 'Visa · Mastercard · RuPay',
    Icon: CreditCard,
    color: '#60A5FA',
    gateway: true,
    upiApps: null,
  },
  {
    key: 'netbanking',
    label: 'Net Banking',
    description: 'All major banks',
    Icon: Building2,
    color: '#FB923C',
    gateway: true,
    upiApps: null,
  },
  {
    key: 'wallet',
    label: 'Wallets',
    description: 'Freecharge · Mobikwik',
    Icon: Wallet,
    color: '#F472B6',
    gateway: true,
    upiApps: null,
  },
];

// Helper: get meta for the currently selected method
const getMethodMeta = (key) => PAYMENT_METHODS.find(m => m.key === key) || PAYMENT_METHODS[0];

// ── Load Razorpay script dynamically ──────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Billing() {
  const [menuItems,     setMenuItems]     = useState([]);
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [creating,      setCreating]      = useState(false);
  const [cart,          setCart]          = useState([]);
  const [search,        setSearch]        = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [customerInfo,  setCustomerInfo]  = useState({
    customerName: '', customerPhone: '', customerEmail: '',
    tableNumber: '', paymentMethod: 'cash',
  });
  const [success,       setSuccess]       = useState(false);
  const [successMsg,    setSuccessMsg]    = useState('Order created successfully!');
  const [couponCode,    setCouponCode]    = useState('');
  const [couponStatus,  setCouponStatus]  = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [rzpConfig,     setRzpConfig]     = useState({ configured: false, keyId: null });
  const [payError,      setPayError]      = useState(null);

  useEffect(() => { fetchMenu(); fetchOrders(); fetchRzpConfig(); }, []);

  const fetchMenu = async () => {
    try {
      const res = await menuAPI.getAll({ available: true });
      if (res.success) setMenuItems(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersAPI.getAll({ limit: 8 });
      if (res.success) setOrders(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchRzpConfig = async () => {
    try {
      const res = await paymentsAPI.getConfig();
      if (res.success && res.data.keyId) {
        setRzpConfig(res.data);
      } else {
        console.warn('Payment gateway config returned no keyId:', res.data);
        setRzpConfig({ configured: false, keyId: null });
      }
    } catch (e) {
      console.warn('Could not fetch payment config:', e.message);
      setRzpConfig({ configured: false, keyId: null });
    }
  };

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (mi) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem._id === mi._id);
      if (existing) return prev.map(c => c.menuItem._id === mi._id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: mi, quantity: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart(prev =>
      prev.map(c => c.menuItem._id === id ? { ...c, quantity: c.quantity + delta } : c)
          .filter(c => c.quantity > 0)
    );
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c.menuItem._id !== id));
  const cartQty        = (id) => cart.find(c => c.menuItem._id === id)?.quantity || 0;

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal       = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const gst            = subtotal * GST_RATE;
  const baseTotal      = subtotal + gst;
  const discountAmount = couponStatus?.valid ? (baseTotal * couponStatus.discountPercent) / 100 : 0;
  const total          = baseTotal - discountAmount;

  // ── Filtered menu ─────────────────────────────────────────────────────────
  const categories = [...new Set(menuItems.map(m => m.category))];
  const filtered   = menuItems.filter(m => {
    const matchCat    = activeCategory === 'all' || m.category === activeCategory;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Coupon ────────────────────────────────────────────────────────────────
  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !customerInfo.customerPhone) return;
    try {
      setCouponLoading(true);
      const res = await ordersAPI.validateCoupon(couponCode.trim(), customerInfo.customerPhone);
      setCouponStatus(res.data);
    } catch {
      setCouponStatus({ valid: false, message: 'Could not validate coupon.' });
    } finally { setCouponLoading(false); }
  };

  // ── Build orderData payload (shared between cash/card/upi and Razorpay) ──
  const buildOrderData = useCallback(() => ({
    items: cart.map(c => ({
      name: c.menuItem.name,
      quantity: c.quantity,
      price: c.menuItem.price,
      total: c.menuItem.price * c.quantity,
    })),
    subtotal,
    gst,
    total,
    discountAmount,
    couponCode: couponStatus?.valid ? couponCode.trim() : undefined,
    ...customerInfo,
  }), [cart, subtotal, gst, total, discountAmount, couponStatus, couponCode, customerInfo]);

  // ── Reset form ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setCart([]);
    setCouponCode('');
    setCouponStatus(null);
    setCustomerInfo({ customerName: '', customerPhone: '', customerEmail: '', tableNumber: '', paymentMethod: 'cash' });
    setPayError(null);
    fetchOrders();
  };

  const showSuccess = (msg = 'Order created successfully!') => {
    setSuccessMsg(msg);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  };

  // ── Cash / Card / UPI order ───────────────────────────────────────────────
  const handleDirectOrder = async () => {
    if (!customerInfo.customerName || !customerInfo.customerPhone || cart.length === 0) return;
    try {
      setCreating(true);
      setPayError(null);
      const res = await ordersAPI.create(buildOrderData());
      if (res.success) { showSuccess(); resetForm(); }
    } catch (e) {
      setPayError(e.message || 'Failed to create order');
    } finally { setCreating(false); }
  };

  // ── Razorpay online payment ───────────────────────────────────────────────
  const handleRazorpayPayment = async () => {
    if (!customerInfo.customerName || !customerInfo.customerPhone || cart.length === 0) return;
    setPayError(null);

    try {
      setCreating(true);

      // 1. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Payment script failed to load. Check your internet connection.');

      // 2. Get key — re-fetch config if we don't have it yet
      let keyId = rzpConfig.keyId;
      if (!keyId) {
        const cfg = await paymentsAPI.getConfig();
        if (cfg.success && cfg.data.keyId) {
          keyId = cfg.data.keyId;
          setRzpConfig(cfg.data);
        } else {
          throw new Error('Payment gateway is not configured. Please contact admin.');
        }
      }

      // 3. Create Razorpay order on backend
      const rzpOrderRes = await paymentsAPI.createOrder({
        amount: total,
        receipt: `food7_${Date.now()}`,
        notes: {
          customerName: customerInfo.customerName,
          tableNumber: customerInfo.tableNumber || '',
        },
      });

      if (!rzpOrderRes.success) throw new Error(rzpOrderRes.message || 'Could not create payment order');

      const { razorpayOrderId, currency } = rzpOrderRes.data;
      const orderData = buildOrderData();

      // 4. Open Razorpay checkout modal
      await new Promise((resolve, reject) => {
        const options = {
          key: keyId,
          amount: Math.round(total * 100),
          currency: currency || 'INR',
          name: 'Food7',
          description: `Table ${customerInfo.tableNumber || '-'} · ${cart.length} item(s)`,
          order_id: razorpayOrderId,
          prefill: {
            name: customerInfo.customerName,
            contact: customerInfo.customerPhone,
            email: customerInfo.customerEmail || '',
          },
          theme: { color: '#C9A84C' },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled by user')),
          },
          handler: async (response) => {
            try {
              // 5. Verify payment signature on backend and create Food7 order
              const verifyRes = await paymentsAPI.verify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                orderData,
              });

              if (verifyRes.success) {
                showSuccess(`Payment successful! ID: ${response.razorpay_payment_id}`);
                resetForm();
                resolve();
              } else {
                reject(new Error(verifyRes.message || 'Payment verification failed'));
              }
            } catch (err) {
              reject(err);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          reject(new Error(response.error?.description || 'Payment failed'));
        });
        rzp.open();
      });

    } catch (e) {
      if (e.message !== 'Payment cancelled by user') {
        setPayError(e.message || 'Payment failed');
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Place order dispatcher ────────────────────────────────────────────────
  const handlePlaceOrder = () => {
    const method = customerInfo.paymentMethod;
    if (method === 'cash') {
      handleDirectOrder();
    } else {
      handleRazorpayPayment();
    }
  };

  const isGateway   = getMethodMeta(customerInfo.paymentMethod).gateway;
  const canOrder    = cart.length > 0 && customerInfo.customerName && customerInfo.customerPhone;
  const { Icon: PayIcon, color: payColor, label: payLabel } = getMethodMeta(customerInfo.paymentMethod);

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
          <p className="section-label" style={{ marginBottom: 8 }}>Point of Sale</p>
          <h1 style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800, color: '#F0EDE8', lineHeight: 1.1, margin: 0,
          }}>
            Smart <span className="text-shimmer">Billing</span>
          </h1>
        </motion.div>

        {/* ── Test Mode Banner ── */}
        {rzpConfig.keyId && rzpConfig.keyId.startsWith('rzp_test_') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: 24, padding: '12px 16px', borderRadius: 10,
              background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>🧪</span>
              <span style={{ color: '#C9A84C', fontSize: '0.85rem', fontWeight: 700 }}>TEST MODE — Use these credentials in the payment popup</span>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.78rem', color: '#A8A29E' }}>
                <span style={{ color: '#F0EDE8', fontWeight: 600 }}>UPI: </span>success@razorpay
              </div>
              <div style={{ fontSize: '0.78rem', color: '#A8A29E' }}>
                <span style={{ color: '#F0EDE8', fontWeight: 600 }}>Card: </span>4111 1111 1111 1111 · any future date · any CVV
              </div>
              <div style={{ fontSize: '0.78rem', color: '#A8A29E' }}>
                <span style={{ color: '#F0EDE8', fontWeight: 600 }}>OTP: </span>any 4+ digits
              </div>
            </div>
          </motion.div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, alignItems: 'start' }}>

          {/* ── LEFT: Menu Picker ── */}
          <div>
            {/* Customer Info */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="card" style={{ padding: 24, marginBottom: 20 }}>
              <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', fontWeight: 700, color: '#F0EDE8', marginBottom: 16 }}>
                Customer Details
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Customer Name *', key: 'customerName', placeholder: 'Full name' },
                  { label: 'Phone Number *',  key: 'customerPhone', placeholder: '+91 00000 00000' },
                  { label: 'Email (for offers)', key: 'customerEmail', placeholder: 'customer@email.com', type: 'email' },
                  { label: 'Table Number',    key: 'tableNumber',   placeholder: 'e.g. T-4' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#7A7570', marginBottom: 5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {f.label}
                    </label>
                    <input
                      className="input-field"
                      type={f.type || 'text'}
                      value={customerInfo[f.key]}
                      onChange={e => setCustomerInfo({ ...customerInfo, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}

                {/* Payment Method Selector */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#7A7570', marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Payment Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {PAYMENT_METHODS.map(({ key, label, description, Icon, color, upiApps }) => {
                      const active = customerInfo.paymentMethod === key;
                      return (
                        <motion.button
                          key={key}
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: key })}
                          title={label}
                          style={{
                            padding: '14px 8px',
                            borderRadius: 14,
                            border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.07)'}`,
                            background: active
                              ? `linear-gradient(135deg, ${color}22 0%, ${color}0a 100%)`
                              : 'rgba(255,255,255,0.03)',
                            color: active ? color : '#7A7570',
                            cursor: 'pointer',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 6,
                            transition: 'border-color 0.2s, background 0.2s, color 0.2s',
                            boxShadow: active ? `0 0 16px ${color}30` : 'none',
                            position: 'relative',
                          }}
                        >
                          {/* Icon */}
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s',
                          }}>
                            <Icon size={18} style={{ color: active ? color : '#7A7570' }} />
                          </div>

                          {/* Label */}
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.2, textAlign: 'center', letterSpacing: '0.01em' }}>
                            {label}
                          </span>

                          {/* Description / UPI app initials */}
                          {upiApps ? (
                            <div style={{ display: 'flex', gap: 3 }}>
                              {upiApps.map((app, i) => (
                                <span key={i} style={{
                                  width: 16, height: 16, borderRadius: 4,
                                  background: active ? `${color}30` : 'rgba(255,255,255,0.08)',
                                  fontSize: '0.55rem', fontWeight: 700,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: active ? color : '#7A7570',
                                }}>
                                  {app}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.58rem', color: active ? `${color}bb` : '#4A4A4A', lineHeight: 1.2, textAlign: 'center' }}>
                              {description}
                            </span>
                          )}

                          {/* Active dot */}
                          {active && (
                            <div style={{
                              position: 'absolute', top: 6, right: 6,
                              width: 6, height: 6, borderRadius: '50%',
                              background: color,
                              boxShadow: `0 0 6px ${color}`,
                            }} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Secure badge */}
                  {customerInfo.paymentMethod !== 'cash' && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)', width: 'fit-content' }}>
                      <Shield size={11} style={{ color: '#34D399' }} />
                      <span style={{ fontSize: '0.68rem', color: '#34D399', fontWeight: 600 }}>Secured &amp; encrypted payment</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Menu Search + Filter */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 16 }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A7570' }} />
                <input
                  className="input-field"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search menu items…"
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['all', ...categories].map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                    padding: '5px 14px', borderRadius: 999,
                    border: activeCategory === cat ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    background: activeCategory === cat ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                    color: activeCategory === cat ? '#C9A84C' : '#7A7570',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s', textTransform: 'capitalize',
                  }}>
                    {cat === 'all' ? 'All' : `${CATEGORY_ICONS[cat] || ''} ${cat}`}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Menu Grid */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {filtered.map((mi, idx) => {
                const qty = cartQty(mi._id);
                return (
                  <motion.div
                    key={mi._id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    className="card-hover"
                    style={{ padding: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                    onClick={() => addToCart(mi)}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: mi.isVeg ? '#34D399' : '#F87171' }} />
                    {qty > 0 && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'var(--ember)', color: '#fff',
                        borderRadius: '50%', width: 20, height: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                      }}>{qty}</div>
                    )}
                    <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{CATEGORY_ICONS[mi.category] || '🍽️'}</div>
                    <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '0.95rem', fontWeight: 700, color: '#F0EDE8', margin: '0 0 4px', lineHeight: 1.2 }}>
                      {mi.name}
                    </p>
                    <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '0.9rem', color: '#C9A84C', margin: 0 }}>
                      ₹{mi.price}
                    </p>
                  </motion.div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#7A7570' }}>No items found</div>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT: Bill Panel ── */}
          <div style={{ position: 'sticky', top: 24 }}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="card" style={{ padding: 24 }}>

              {/* Bill header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <ShoppingCart size={18} style={{ color: '#C9A84C' }} />
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.3rem', fontWeight: 700, color: '#F0EDE8', margin: 0 }}>
                  Current Bill
                </h2>
                {cart.length > 0 && (
                  <span className="badge badge-gold" style={{ marginLeft: 'auto' }}>
                    {cart.reduce((s, c) => s + c.quantity, 0)} items
                  </span>
                )}
              </div>

              {/* Cart items */}
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#7A7570' }}>
                  <Receipt size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.85rem' }}>Tap menu items to add</p>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <AnimatePresence>
                    {cart.map(c => (
                      <motion.div key={c.menuItem._id}
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>{c.menuItem.name}</p>
                            <p style={{ fontSize: '0.75rem', color: '#7A7570', margin: 0, fontFamily: '"DM Mono", monospace' }}>
                              ₹{c.menuItem.price} × {c.quantity}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => changeQty(c.menuItem._id, -1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#F0EDE8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Minus size={11} />
                            </button>
                            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '0.85rem', color: '#F0EDE8', minWidth: 16, textAlign: 'center' }}>{c.quantity}</span>
                            <button onClick={() => changeQty(c.menuItem._id, 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#F0EDE8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Plus size={11} />
                            </button>
                          </div>
                          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '0.9rem', color: '#C9A84C', minWidth: 56, textAlign: 'right' }}>
                            ₹{(c.menuItem.price * c.quantity).toFixed(0)}
                          </span>
                          <button onClick={() => removeFromCart(c.menuItem._id)} style={{ color: '#7A7570', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Totals */}
              {cart.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: 16, marginBottom: 16 }}>
                  {[
                    { label: 'Subtotal', value: `₹${subtotal.toFixed(2)}` },
                    { label: 'GST (5%)', value: `₹${gst.toFixed(2)}` },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#7A7570', fontSize: '0.85rem' }}>{row.label}</span>
                      <span style={{ color: '#F0EDE8', fontSize: '0.85rem', fontFamily: '"DM Mono", monospace' }}>{row.value}</span>
                    </div>
                  ))}
                  {couponStatus?.valid && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#34D399', fontSize: '0.85rem' }}>Discount ({couponStatus.discountPercent}%)</span>
                      <span style={{ color: '#34D399', fontSize: '0.85rem', fontFamily: '"DM Mono", monospace' }}>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', fontWeight: 700, color: '#F0EDE8' }}>Total</span>
                    <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '1.3rem', fontWeight: 500, color: '#C9A84C' }}>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Coupon */}
              <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: '0.75rem', color: '#7A7570', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎟️ Have a coupon?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }}
                    placeholder="Enter coupon code…"
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${couponStatus?.valid ? 'rgba(52,211,153,0.4)' : couponStatus ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      background: 'rgba(255,255,255,0.04)', color: '#F0EDE8',
                      fontSize: '0.8rem', fontFamily: '"DM Mono", monospace', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleValidateCoupon}
                    disabled={couponLoading || !couponCode.trim() || !customerInfo.customerPhone}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      opacity: (!couponCode.trim() || !customerInfo.customerPhone) ? 0.4 : 1,
                    }}
                  >
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </div>
                {!customerInfo.customerPhone && couponCode && (
                  <p style={{ fontSize: '0.72rem', color: '#7A7570', margin: '6px 0 0' }}>Enter phone number first to validate coupon</p>
                )}
                {couponStatus && (
                  <p style={{ fontSize: '0.78rem', margin: '6px 0 0', color: couponStatus.valid ? '#34D399' : '#EF4444', fontWeight: 600 }}>
                    {couponStatus.valid ? `✅ ${couponStatus.message}` : `❌ ${couponStatus.message}`}
                  </p>
                )}
              </div>

              {/* Customer summary */}
              {customerInfo.customerName && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '0.75rem', color: '#7A7570', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>{customerInfo.customerName}</p>
                  {customerInfo.tableNumber && (
                    <p style={{ fontSize: '0.8rem', color: '#7A7570', margin: '2px 0 0', fontFamily: '"DM Mono", monospace' }}>
                      Table {customerInfo.tableNumber}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                     <PayIcon size={13} style={{ color: payColor }} />
                     <span style={{ fontSize: '0.78rem', color: payColor, fontWeight: 600 }}>
                       {payLabel}
                     </span>
                   </div>
                </div>
              )}

              {/* Payment error */}
              <AnimatePresence>
                {payError && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#EF4444', fontSize: '0.82rem' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{payError}</span>
                    <button onClick={() => setPayError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}>✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#34D399', fontSize: '0.85rem', fontWeight: 600 }}>
                    <CheckCircle size={16} /> {successMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Place Order button */}
              <button
                className="btn-gold"
                onClick={handlePlaceOrder}
                disabled={creating || !canOrder}
                style={{ width: '100%', padding: '13px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {creating ? (
                  <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                ) : isGateway ? (
                  <><Shield size={16} /> Pay ₹{total.toFixed(2)} Securely</>
                ) : (
                  <><PayIcon size={16} /> Place Order · ₹{total.toFixed(2)}</>
                )}
              </button>
            </motion.div>

            {/* Recent Orders */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ marginTop: 20 }}>
              <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.1rem', fontWeight: 700, color: '#F0EDE8', marginBottom: 12 }}>
                Recent Orders
              </p>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
              ) : orders.slice(0, 5).map((order, idx) => (
                <motion.div key={order._id}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + idx * 0.05 }}
                  className="card" style={{ padding: '12px 16px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>{order.customerName}</p>
                      <p style={{ fontSize: '0.75rem', color: '#7A7570', margin: '2px 0 0', fontFamily: '"DM Mono", monospace' }}>
                        #{order.orderNumber} · {order.items?.length} items · {order.paymentMethod?.toUpperCase()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '0.95rem', color: '#C9A84C', fontWeight: 500 }}>
                        ₹{order.total}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
