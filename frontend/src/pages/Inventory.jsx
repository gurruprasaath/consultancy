/**
 * Inventory Page
 * Stock management with AI demand predictions + full restock forecast
 */

import { useState, useEffect, useMemo } from 'react';
import { inventoryAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, TrendingUp, AlertTriangle, Trash2,
  RefreshCw, Brain, BarChart3, ChevronUp, ChevronDown,
  Filter, ArrowUpDown, Zap, ShieldCheck, AlertCircle,
  CheckCircle2, Clock, Search, CalendarDays,
} from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Expiry helpers ──────────────────────────────────────────────────────────
function getExpiryStatus(expiryDate) {
  if (!expiryDate) return 'no_date';
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil((new Date(expiryDate) - now) / msPerDay);
  if (daysLeft <= 0) return 'expired';
  if (daysLeft <= 7) return 'expiring_soon';
  return 'ok';
}

function getExpiryDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((new Date(expiryDate) - new Date()) / msPerDay);
}

const EXPIRY_META = {
  expired:      { label: 'EXPIRED',       bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.45)',  text: '#F87171' },
  expiring_soon:{ label: 'EXPIRING SOON', bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)',  text: '#FB923C' },
  ok:           { label: 'VALID',         bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)', text: '#34D399' },
  no_date:      { label: 'NO DATE',       bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.25)',text: '#9CA3AF' },
};

// ── Urgency helpers ───────────────────────────────────────────────────────────
function getUrgency(item) {
  if (item.recommendedRestockQty > 0) {
    const daysLeft = item.predictedDailyDemand > 0
      ? Math.floor(item.currentQty / item.predictedDailyDemand)
      : 999;
    if (daysLeft <= 2) return 'critical';
    if (daysLeft <= 5) return 'warning';
    return 'restock';
  }
  return 'ok';
}

const URGENCY_META = {
  critical: { label: 'CRITICAL',  bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#F87171', icon: AlertCircle },
  warning:  { label: 'WARNING',   bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', text: '#FB923C', icon: AlertTriangle },
  restock:  { label: 'RESTOCK',   bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.35)', text: '#FACC15', icon: Zap },
  ok:       { label: 'HEALTHY',   bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.3)', text: '#34D399', icon: CheckCircle2 },
};

const CONFIDENCE_META = {
  high:   { label: 'High AI',   color: '#34D399', bg: 'rgba(52,211,153,0.15)' },
  medium: { label: 'Medium AI', color: '#FACC15', bg: 'rgba(250,204,21,0.12)' },
  low:    { label: 'Low AI',    color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

// ── Sort helpers ──────────────────────────────────────────────────────────────
const URGENCY_ORDER = { critical: 0, warning: 1, restock: 2, ok: 3 };

function sortResults(results, sortBy, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...results].sort((a, b) => {
    switch (sortBy) {
      case 'urgency':
        return dir * (URGENCY_ORDER[getUrgency(a)] - URGENCY_ORDER[getUrgency(b)]);
      case 'restock':
        return dir * (b.recommendedRestockQty - a.recommendedRestockQty);
      case 'demand':
        return dir * (b.predictedDailyDemand - a.predictedDailyDemand);
      case 'name':
        return dir * a.itemName.localeCompare(b.itemName);
      case 'stock':
        return dir * (a.currentQty - b.currentQty);
      default:
        return 0;
    }
  });
}

// ── Inventory page ────────────────────────────────────────────────────────────
const Inventory = () => {
  const [items, setItems]               = useState([]);
  const [predictions, setPredictions]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [forecast, setForecast]         = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError]     = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // forecast controls
  const [sortBy,      setSortBy]      = useState('urgency');
  const [sortDir,     setSortDir]     = useState('asc');
  const [filterBy,    setFilterBy]    = useState('all');
  const [searchQ,     setSearchQ]     = useState('');
  const [forecastDays, setForecastDays] = useState(14);

  const [formData, setFormData] = useState({
    itemName: '', category: 'vegetables', quantity: '', unit: 'kg', price: '', reorderLevel: '', expiryDate: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchPredictions();
    fetchForecast();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const r = await inventoryAPI.getAll();
      if (r.success) setItems(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchPredictions = async () => {
    try {
      const r = await inventoryAPI.getPredictions();
      if (r.success) setPredictions(r.data);
    } catch (e) { console.error(e); }
  };

  const fetchForecast = async () => {
    try {
      setForecastLoading(true);
      setForecastError(null);
      const r = await inventoryAPI.getRestockForecast({ historyDays: 90, forecastDays });
      if (r.success) setForecast(r.data);
    } catch (e) {
      setForecastError('Failed to load forecast. Please retry.');
    } finally {
      setForecastLoading(false);
    }
  };

  // re-fetch when forecastDays changes
  useEffect(() => { if (forecast) fetchForecast(); }, [forecastDays]);

  // ── Computed forecast list ────────────────────────────────────────────────
  const filteredForecast = useMemo(() => {
    if (!forecast?.results) return [];
    let list = forecast.results;

    // text search
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(i => i.itemName.toLowerCase().includes(q));
    }

    // status filter
    if (filterBy === 'needs_restock') list = list.filter(i => i.recommendedRestockQty > 0);
    else if (filterBy === 'healthy')  list = list.filter(i => i.recommendedRestockQty === 0);
    else if (filterBy === 'critical') list = list.filter(i => getUrgency(i) === 'critical');
    else if (filterBy === 'high_confidence') list = list.filter(i => i.confidence === 'high');

    return sortResults(list, sortBy, sortDir);
  }, [forecast, sortBy, sortDir, filterBy, searchQ]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!forecast?.results) return null;
    const all = forecast.results;
    return {
      total:     all.length,
      critical:  all.filter(i => getUrgency(i) === 'critical').length,
      warning:   all.filter(i => getUrgency(i) === 'warning').length,
      restock:   all.filter(i => i.recommendedRestockQty > 0).length,
      healthy:   all.filter(i => i.recommendedRestockQty === 0).length,
      highConf:  all.filter(i => i.confidence === 'high').length,
    };
  }, [forecast]);

  // ── Expiry stats (from raw items list) ───────────────────────────────────
  const expiryStats = useMemo(() => ({
    expired:      items.filter(i => getExpiryStatus(i.expiryDate) === 'expired').length,
    expiring_soon:items.filter(i => getExpiryStatus(i.expiryDate) === 'expiring_soon').length,
  }), [items]);

  // ── Sort toggle ───────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // ── Form ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        quantity:     parseFloat(formData.quantity),
        price:        parseFloat(formData.price),
        reorderLevel: parseFloat(formData.reorderLevel),
      };
      if (!formData.expiryDate) delete payload.expiryDate;
      const r = await inventoryAPI.create(payload);
      if (r.success) {
        setShowAddModal(false);
        setFormData({ itemName: '', category: 'vegetables', quantity: '', unit: 'kg', price: '', reorderLevel: '', expiryDate: '' });
        fetchInventory();
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this item?')) {
      try { await inventoryAPI.delete(id); fetchInventory(); }
      catch (e) { console.error(e); }
    }
  };

  const getStockStatus = (item) => {
    if (item.quantity <= item.reorderLevel)
      return { text: 'LOW STOCK', color: 'text-red-400 bg-red-400/20 border-red-400/30' };
    if (item.quantity <= item.reorderLevel * 1.5)
      return { text: 'MODERATE',  color: 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30' };
    return   { text: 'HEALTHY',   color: 'text-green-400 bg-green-400/20 border-green-400/30' };
  };

  const categories = ['vegetables', 'meat', 'dairy', 'spices', 'beverages', 'other'];
  const units       = ['kg', 'l', 'pieces', 'grams'];

  // ── Sort button helper ────────────────────────────────────────────────────
  const SortBtn = ({ col, label }) => (
    <button
      onClick={() => handleSort(col)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
        border: `1px solid ${sortBy === col ? 'rgba(201,168,76,0.6)' : 'rgba(255,255,255,0.12)'}`,
        background: sortBy === col ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
        color: sortBy === col ? '#C9A84C' : '#A8A29E',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {label}
      {sortBy === col
        ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
        : <ArrowUpDown size={12} />}
    </button>
  );

  // ── Filter chip ───────────────────────────────────────────────────────────
  const FilterChip = ({ val, label, count }) => (
    <button
      onClick={() => setFilterBy(val)}
      style={{
        padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
        border: `1px solid ${filterBy === val ? 'rgba(201,168,76,0.6)' : 'rgba(255,255,255,0.1)'}`,
        background: filterBy === val ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.04)',
        color: filterBy === val ? '#C9A84C' : '#A8A29E',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}{count !== undefined ? ` (${count})` : ''}
    </button>
  );

  return (
    <div className="min-h-screen bg-food7-black p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold text-food7-white mb-2">
              Inventory Management
            </h1>
            <p className="text-food7-white/60">
              Stock control with AI-powered demand forecasting
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Item
          </Button>
        </motion.div>

        {/* ── AI Demand Predictions panel ── */}
        {predictions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-food7-gold" />
              <h2 className="text-xl font-heading font-semibold text-food7-white">
                AI Demand Predictions
              </h2>
              <span style={{
                marginLeft: 8, padding: '2px 10px', borderRadius: 20,
                background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
                fontSize: '0.72rem', fontWeight: 700,
              }}>{predictions.length} items</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {predictions.map((pred, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: 10, padding: '12px 14px',
                  }}>
                  <p style={{ color: '#F0EDE8', fontWeight: 600, fontSize: '0.88rem', marginBottom: 4 }}>
                    {pred.itemName}
                  </p>
                  <p style={{ color: '#C9A84C', fontSize: '0.78rem' }}>
                    {pred.predictedDailyDemand?.toFixed(1)} {pred.unit}/day
                  </p>
                  <p style={{ color: '#7A7570', fontSize: '0.75rem', marginTop: 2 }}>
                    Stockout in {pred.daysUntilStockout ?? '—'} days
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Restock Forecast panel ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6">

          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <BarChart3 size={20} color="#C9A84C" />
                <h2 className="text-xl font-heading font-semibold text-food7-white">
                  AI Restock Forecast
                </h2>
                {forecast && (
                  <span style={{
                    padding: '2px 10px', borderRadius: 20,
                    background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {forecast.forecastDays}-day outlook
                  </span>
                )}
              </div>
              {forecast && (
                <p style={{ color: '#7A7570', fontSize: '0.82rem' }}>
                  Avg daily orders: {forecast.avgCustomers} · Data points: {forecast.dataPointsUsed} · Menu items: {forecast.menuCoverage?.availableItems}/{forecast.menuCoverage?.totalItems} available
                </p>
              )}
            </div>

            {/* Refresh + forecast window buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setForecastDays(d)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                      border: `1px solid ${forecastDays === d ? 'rgba(201,168,76,0.6)' : 'rgba(255,255,255,0.1)'}`,
                      background: forecastDays === d ? 'rgba(201,168,76,0.2)' : 'transparent',
                      color: forecastDays === d ? '#C9A84C' : '#7A7570', cursor: 'pointer',
                    }}>{d}d</button>
                ))}
              </div>
              <button
                onClick={fetchForecast}
                disabled={forecastLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                  background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)',
                  color: '#C9A84C', cursor: forecastLoading ? 'not-allowed' : 'pointer',
                  opacity: forecastLoading ? 0.6 : 1, transition: 'all 0.2s',
                }}>
                <RefreshCw size={14} style={{ animation: forecastLoading ? 'spin 1s linear infinite' : 'none' }} />
                {forecastLoading ? 'Refreshing…' : 'Refresh Forecast'}
              </button>
            </div>
          </div>

          {/* Summary stat chips */}
          {stats && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              {[
                { label: 'Total Items',    val: stats.total,    color: '#F0EDE8', bg: 'rgba(255,255,255,0.06)' },
                { label: 'Critical',       val: stats.critical, color: '#F87171', bg: 'rgba(239,68,68,0.12)'   },
                { label: 'Warning',        val: stats.warning,  color: '#FB923C', bg: 'rgba(251,146,60,0.12)'  },
                { label: 'Need Restock',   val: stats.restock,  color: '#FACC15', bg: 'rgba(250,204,21,0.1)'   },
                { label: 'Healthy',        val: stats.healthy,  color: '#34D399', bg: 'rgba(52,211,153,0.1)'   },
                { label: 'High AI Confidence', val: stats.highConf, color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
                { label: 'Expired',        val: expiryStats.expired,       color: '#F87171', bg: 'rgba(239,68,68,0.12)'   },
                { label: 'Expiring ≤7d',   val: expiryStats.expiring_soon, color: '#FB923C', bg: 'rgba(251,146,60,0.12)'  },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '6px 14px', borderRadius: 20,
                  background: s.bg, border: `1px solid ${s.color}30`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.val}</span>
                  <span style={{ fontSize: '0.72rem', color: '#A8A29E', fontWeight: 500 }}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Controls: search + filter + sort */}
          {forecast && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {/* Search */}
              <div style={{ position: 'relative', maxWidth: 280 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A7570' }} />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search items…"
                  style={{
                    width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#F0EDE8', fontSize: '0.82rem', outline: 'none',
                  }}
                />
              </div>

              {/* Filter chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <Filter size={13} color="#7A7570" />
                <FilterChip val="all"             label="All"           count={stats?.total} />
                <FilterChip val="critical"        label="Critical"      count={stats?.critical} />
                <FilterChip val="needs_restock"   label="Needs Restock" count={stats?.restock} />
                <FilterChip val="healthy"         label="Healthy"       count={stats?.healthy} />
                <FilterChip val="high_confidence" label="High AI Confidence" count={stats?.highConf} />
              </div>

              {/* Sort buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <ArrowUpDown size={13} color="#7A7570" />
                <SortBtn col="urgency" label="Urgency" />
                <SortBtn col="restock" label="Restock Qty" />
                <SortBtn col="demand"  label="Daily Demand" />
                <SortBtn col="stock"   label="Current Stock" />
                <SortBtn col="name"    label="Name" />
              </div>
            </div>
          )}

          {/* Forecast loading */}
          {forecastLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: '#7A7570' }}>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.85rem' }}>Running AI forecast model…</span>
            </div>
          )}

          {/* Forecast error */}
          {forecastError && !forecastLoading && (
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#F87171', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <AlertCircle size={15} /> {forecastError}
            </div>
          )}

          {/* Forecast grid — ALL items */}
          {!forecastLoading && filteredForecast.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {filteredForecast.map((item, idx) => {
                const urgency = getUrgency(item);
                const u = URGENCY_META[urgency];
                const c = CONFIDENCE_META[item.confidence] || CONFIDENCE_META.low;
                const UIcon = u.icon;
                const daysLeft = item.predictedDailyDemand > 0
                  ? Math.floor(item.currentQty / item.predictedDailyDemand)
                  : null;
                const stockPct = daysLeft !== null
                  ? Math.min(100, Math.round((daysLeft / forecastDays) * 100))
                  : 100;

                return (
                  <motion.div key={item.id || item.itemName}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.025, 0.4) }}
                    style={{
                      background: u.bg, border: `1px solid ${u.border}`,
                      borderRadius: 12, padding: '14px 16px',
                    }}>

                    {/* Top row: name + badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <p style={{ color: '#F0EDE8', fontWeight: 700, fontSize: '0.9rem', flex: 1, marginRight: 8 }}>
                        {item.itemName}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{
                          padding: '2px 7px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800,
                          background: u.bg, border: `1px solid ${u.border}`, color: u.text,
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <UIcon size={9} /> {u.label}
                        </span>
                        <span style={{
                          padding: '2px 7px', borderRadius: 6, fontSize: '0.63rem', fontWeight: 600,
                          background: c.bg, color: c.color,
                        }}>
                          {c.label}
                        </span>
                      </div>
                    </div>

                    {/* Stock days bar */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.7rem', color: '#A8A29E' }}>Stock runway</span>
                        <span style={{ fontSize: '0.7rem', color: u.text, fontWeight: 600 }}>
                          {daysLeft !== null ? `${daysLeft} days` : '—'}
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: `${stockPct}%`,
                          background: urgency === 'ok' ? '#34D399'
                            : urgency === 'restock'  ? '#FACC15'
                            : urgency === 'warning'  ? '#FB923C' : '#F87171',
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Current stock', val: `${item.currentQty} ${item.unit}` },
                        { label: 'Daily demand',  val: `${item.predictedDailyDemand} ${item.unit}` },
                        { label: `${forecastDays}-day total`, val: `${item.predictedTotalDemand} ${item.unit}` },
                        {
                          label: 'Restock needed',
                          val: item.recommendedRestockQty > 0 ? `${item.recommendedRestockQty} ${item.unit}` : 'None',
                          highlight: item.recommendedRestockQty > 0,
                        },
                      ].map(s => (
                        <div key={s.label} style={{
                          background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '6px 8px',
                        }}>
                          <p style={{ fontSize: '0.65rem', color: '#7A7570', marginBottom: 2 }}>{s.label}</p>
                          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: s.highlight ? u.text : '#F0EDE8' }}>
                            {s.val}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Expiry row */}
                    {item.expiryDate && (() => {
                      const expStatus = getExpiryStatus(item.expiryDate);
                      const expMeta   = EXPIRY_META[expStatus];
                      const daysLeft  = getExpiryDaysLeft(item.expiryDate);
                      return (
                        <div style={{
                          marginTop: 8, padding: '6px 10px', borderRadius: 8,
                          background: expMeta.bg, border: `1px solid ${expMeta.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CalendarDays size={12} color={expMeta.text} />
                            <span style={{ fontSize: '0.68rem', color: expMeta.text, fontWeight: 700 }}>
                              {expMeta.label}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#A8A29E' }}>
                            {daysLeft <= 0
                              ? `${Math.abs(daysLeft)}d ago`
                              : daysLeft === 1 ? 'Tomorrow'
                              : `${daysLeft}d left · ${new Date(item.expiryDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })}`}
                          </span>
                        </div>
                      );
                    })()}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!forecastLoading && !forecastError && filteredForecast.length === 0 && forecast && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#7A7570', fontSize: '0.85rem' }}>
              No items match the current filter.
            </div>
          )}

          {/* Not yet loaded */}
          {!forecast && !forecastLoading && !forecastError && (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <button onClick={fetchForecast} style={{
                padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem',
                background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)',
                color: '#C9A84C', cursor: 'pointer',
              }}>
                Load AI Forecast
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Inventory List ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Package size={18} color="#C9A84C" />
            <h2 className="text-xl font-heading font-semibold text-food7-white">Stock Levels</h2>
            <span style={{
              padding: '2px 10px', borderRadius: 20,
              background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
              fontSize: '0.72rem', fontWeight: 700,
            }}>{items.length} items</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : items.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Package className="w-16 h-16 text-food7-white/20 mx-auto mb-4" />
              <p className="text-food7-white/60">No inventory items yet</p>
              <p className="text-food7-white/40 text-sm mt-2">Add your first item to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item, index) => {
                const status = getStockStatus(item);
                return (
                  <motion.div key={item._id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="glass-card-hover p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-food7-white mb-1">{item.itemName}</h3>
                        <span className="px-2 py-1 bg-white/10 text-food7-white/60 text-xs rounded">
                          {item.category}
                        </span>
                      </div>
                      <button onClick={() => handleDelete(item._id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-food7-white/60 text-sm">Stock:</span>
                        <span className="text-food7-white font-medium">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-food7-white/60 text-sm">Price:</span>
                        <span className="text-food7-gold font-medium">₹{item.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-food7-white/60 text-sm">Reorder Level:</span>
                        <span className="text-food7-white/80 text-sm">{item.reorderLevel} {item.unit}</span>
                      </div>
                      {/* Expiry date row */}
                      {item.expiryDate && (() => {
                        const expStatus = getExpiryStatus(item.expiryDate);
                        const expMeta   = EXPIRY_META[expStatus];
                        const daysLeft  = getExpiryDaysLeft(item.expiryDate);
                        return (
                          <div className="flex justify-between items-center" style={{ marginTop: 4 }}>
                            <span className="text-food7-white/60 text-sm flex items-center gap-1">
                              <CalendarDays size={12} /> Expires:
                            </span>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700, color: expMeta.text,
                              background: expMeta.bg, border: `1px solid ${expMeta.border}`,
                              padding: '2px 8px', borderRadius: 6,
                            }}>
                              {daysLeft <= 0
                                ? `${Math.abs(daysLeft)}d AGO`
                                : daysLeft <= 7
                                ? `${daysLeft}d left`
                                : new Date(item.expiryDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className={`px-3 py-2 rounded-lg border text-center text-sm font-medium ${status.color}`}>
                      {status.text}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Add Item Modal ── */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-8 max-w-md w-full">
                <h2 className="text-2xl font-heading font-bold text-food7-white mb-6">Add Inventory Item</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input label="Item Name" value={formData.itemName}
                    onChange={e => setFormData({ ...formData, itemName: e.target.value })} required />
                  <div>
                    <label className="block text-sm font-medium text-food7-white mb-2">Category</label>
                    <select value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="input-field w-full">
                      {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Quantity" type="number" step="0.1" value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: e.target.value })} required />
                    <div>
                      <label className="block text-sm font-medium text-food7-white mb-2">Unit</label>
                      <select value={formData.unit}
                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        className="input-field w-full">
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <Input label="Price (₹)" type="number" step="0.01" value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                  <Input label="Reorder Level" type="number" step="0.1" value={formData.reorderLevel}
                    onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })} required />
                  <div>
                    <label className="block text-sm font-medium text-food7-white mb-2">
                      Expiry Date <span style={{ color: '#7A7570', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="input-field w-full"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">Add Item</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Spin keyframe */}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default Inventory;
