/**
 * Menu Management Page
 * Add, edit, remove menu items with category management
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { menuAPI } from '../services/api';
import { Plus, Trash2, Edit3, Check, X, ToggleLeft, ToggleRight, ChefHat, Flame } from 'lucide-react';

const CATEGORIES = ['starters', 'mains', 'breads', 'rice', 'desserts', 'beverages', 'sides'];
const SPICE_LEVELS = ['mild', 'medium', 'hot', 'extra-hot'];

const CATEGORY_ICONS = {
  starters: '🥗', mains: '🍛', breads: '🫓', rice: '🍚',
  desserts: '🍮', beverages: '🥤', sides: '🥙',
};

const empty = () => ({
  name: '', description: '', category: 'mains',
  price: '', isVeg: true, spiceLevel: 'medium', isAvailable: true,
});

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await menuAPI.getAll();
      if (res.success) setMenuItems(res.data);
    } catch (e) {
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const filtered = activeCategory === 'all'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  const openAdd = () => { setForm(empty()); setEditingId(null); setShowForm(true); setError(''); };
  const openEdit = (mi) => {
    setForm({ ...mi, price: String(mi.price) });
    setEditingId(mi._id);
    setShowForm(true);
    setError('');
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { setError('Name and price are required'); return; }
    try {
      setSaving(true);
      const payload = { ...form, price: parseFloat(form.price) };
      if (editingId) {
        await menuAPI.update(editingId, payload);
      } else {
        await menuAPI.create(payload);
      }
      await fetchMenu();
      closeForm();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const [confirmingId, setConfirmingId] = useState(null);

  const handleDelete = async (id) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      return;
    }
    setConfirmingId(null);
    try {
      await menuAPI.delete(id);
      setMenuItems(prev => prev.filter(i => i._id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
      setError('Delete failed: ' + (e.message || 'Server error. Check you are logged in.'));
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await menuAPI.toggleAvailability(id);
      if (res.success) {
        setMenuItems(prev => prev.map(i => i._id === id ? res.data : i));
      }
    } catch (e) { /* silent */ }
  };

  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c] = menuItems.filter(i => i.category === c).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 40 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>Restaurant Management</p>
              <h1 style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800,
                color: '#F0EDE8',
                lineHeight: 1.1,
                margin: 0,
              }}>
                Menu <span className="text-shimmer">Curation</span>
              </h1>
              <p style={{ color: '#7A7570', marginTop: 8, fontSize: '0.9rem' }}>
                {menuItems.length} items across {CATEGORIES.filter(c => counts[c] > 0).length} categories
              </p>
            </div>
            <button className="btn-primary" onClick={openAdd} style={{ marginTop: 8 }}>
              <Plus size={16} /> Add Item
            </button>
          </div>
        </motion.div>

        {/* ── Page-level error banner ── */}
        <AnimatePresence>
          {error && !showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(139,0,0,0.15)', border: '1px solid rgba(139,0,0,0.4)',
                borderRadius: 10, padding: '10px 16px', color: '#FF8080',
                fontSize: '0.85rem', marginBottom: 20,
              }}
            >
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                style={{ background: 'none', border: 'none', color: '#FF8080', cursor: 'pointer', padding: '0 4px' }}
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Category Filter ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}
        >
          {['all', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                border: activeCategory === cat
                  ? '1px solid rgba(201,168,76,0.6)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: activeCategory === cat
                  ? 'rgba(201,168,76,0.12)'
                  : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat ? '#C9A84C' : '#7A7570',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.04em',
                textTransform: 'capitalize',
              }}
            >
              {cat === 'all' ? `All (${menuItems.length})` : `${CATEGORY_ICONS[cat]} ${cat} (${counts[cat] || 0})`}
            </button>
          ))}
        </motion.div>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card"
            style={{ padding: '80px 40px', textAlign: 'center' }}
          >
            <ChefHat size={48} style={{ color: '#3A3530', margin: '0 auto 16px' }} />
            <p style={{ color: '#7A7570', fontSize: '1rem' }}>
              {activeCategory === 'all' ? 'No menu items yet.' : `No ${activeCategory} items.`}
            </p>
            <button className="btn-primary" onClick={openAdd} style={{ marginTop: 20 }}>
              <Plus size={15} /> Add First Item
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {filtered.map(mi => (
              <motion.div key={mi._id} variants={item}>
                <MenuCard
                  item={mi}
                  onEdit={() => openEdit(mi)}
                  onDelete={() => handleDelete(mi._id)}
                  onToggle={() => handleToggle(mi._id)}
                  confirming={confirmingId === mi._id}
                  onCancelDelete={() => setConfirmingId(null)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 50, padding: 24,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="card"
              style={{ width: '100%', maxWidth: 520, padding: 32, position: 'relative' }}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                  <p className="section-label" style={{ marginBottom: 4 }}>
                    {editingId ? 'Edit Item' : 'New Item'}
                  </p>
                  <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.6rem', fontWeight: 700, color: '#F0EDE8', margin: 0 }}>
                    {editingId ? 'Update Details' : 'Add to Menu'}
                  </h2>
                </div>
                <button className="btn-ghost" onClick={closeForm} style={{ padding: '8px 10px' }}>
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(139,0,0,0.15)', border: '1px solid rgba(139,0,0,0.4)',
                  borderRadius: 10, padding: '10px 14px', color: '#FF8080',
                  fontSize: '0.85rem', marginBottom: 20,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#7A7570', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Item Name *
                  </label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Butter Chicken"
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#7A7570', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Description
                  </label>
                  <textarea
                    className="input-field"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Short description..."
                    rows={2}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Category + Price */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#7A7570', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Category *
                    </label>
                    <select
                      className="input-field"
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#7A7570', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Price (₹) *
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Spice + Veg toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#7A7570', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Spice Level
                    </label>
                    <select
                      className="input-field"
                      value={form.spiceLevel}
                      onChange={e => setForm({ ...form, spiceLevel: e.target.value })}
                    >
                      {SPICE_LEVELS.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#7A7570', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Type
                    </label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {[true, false].map(v => (
                        <button
                          key={String(v)}
                          onClick={() => setForm({ ...form, isVeg: v })}
                          style={{
                            flex: 1, padding: '9px 0', borderRadius: 10,
                            border: form.isVeg === v
                              ? `1px solid ${v ? '#34D399' : '#F87171'}`
                              : '1px solid rgba(255,255,255,0.08)',
                            background: form.isVeg === v
                              ? (v ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)')
                              : 'rgba(255,255,255,0.03)',
                            color: form.isVeg === v ? (v ? '#34D399' : '#F87171') : '#7A7570',
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {v ? '🟢 Veg' : '🔴 Non-Veg'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="btn-ghost" onClick={closeForm} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    className="btn-gold"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ flex: 2 }}
                  >
                    {saving ? 'Saving…' : editingId ? <><Check size={15} /> Update Item</> : <><Plus size={15} /> Add to Menu</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuCard({ item, onEdit, onDelete, onToggle, confirming, onCancelDelete }) {
  const spiceColors = { mild: '#34D399', medium: '#FBBF24', hot: '#F97316', 'extra-hot': '#EF4444' };

  return (
    <div
      className="card-hover"
      style={{
        padding: 20,
        opacity: item.isAvailable ? 1 : 0.55,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Veg indicator strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: item.isVeg
          ? 'linear-gradient(90deg, #34D399, #10B981)'
          : 'linear-gradient(90deg, #F87171, #EF4444)',
        borderRadius: '16px 16px 0 0',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '1.1rem' }}>{CATEGORY_ICONS[item.category]}</span>
            <span style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#F0EDE8',
              lineHeight: 1.2,
            }}>
              {item.name}
            </span>
          </div>
          {item.description && (
            <p style={{ color: '#7A7570', fontSize: '0.78rem', lineHeight: 1.4, margin: 0 }}>
              {item.description}
            </p>
          )}
        </div>
        <div style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: '1.1rem',
          fontWeight: 500,
          color: '#C9A84C',
          whiteSpace: 'nowrap',
        }}>
          ₹{item.price}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>
          {item.category}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: spiceColors[item.spiceLevel] }}>
          <Flame size={11} />
          {item.spiceLevel}
        </span>
        {!item.isAvailable && (
          <span className="badge badge-red">Unavailable</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onToggle}
          title={item.isAvailable ? 'Mark unavailable' : 'Mark available'}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: item.isAvailable ? '#34D399' : '#7A7570',
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            fontSize: '0.75rem', fontWeight: 600,
          }}
        >
          {item.isAvailable ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {item.isAvailable ? 'Available' : 'Off Menu'}
        </button>
        {!confirming && (
          <button
            onClick={onEdit}
            style={{
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid rgba(201,168,76,0.2)',
              background: 'rgba(201,168,76,0.06)',
              color: '#C9A84C', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Edit3 size={14} />
          </button>
        )}
        {confirming ? (
          <>
            <button
              onClick={onDelete}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 8,
                border: '1px solid rgba(139,0,0,0.5)',
                background: 'rgba(139,0,0,0.25)',
                color: '#F87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
              }}
            >
              Confirm
            </button>
            <button
              onClick={onCancelDelete}
              style={{
                padding: '7px 10px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#7A7570', cursor: 'pointer', fontSize: '0.75rem',
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={onDelete}
            style={{
              padding: '7px 12px', borderRadius: 8,
              border: '1px solid rgba(139,0,0,0.2)',
              background: 'rgba(139,0,0,0.06)',
              color: '#F87171', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
