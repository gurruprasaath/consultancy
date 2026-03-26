/**
 * Marketing Page
 * AI-powered marketing content generator + distribution to Email, WhatsApp, Instagram
 */

import { useState, useEffect } from 'react';
import { marketingAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Megaphone, Instagram, MessageSquare, Gift, Calendar,
  Trash2, Mail, Send, Users, Copy, Check, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

const CONTENT_TYPES = [
  { value: 'instagram', label: 'Instagram Post', icon: Instagram },
  { value: 'sms', label: 'SMS Campaign', icon: MessageSquare },
  { value: 'offer', label: 'Special Offer', icon: Gift },
  { value: 'festival', label: 'Festival Special', icon: Calendar },
];

// Channel config — icon, label, color, description
const CHANNELS = [
  {
    key: 'email', label: 'Email', Icon: Mail,
    color: '#4F9EFF', bg: 'rgba(79,158,255,0.1)', border: 'rgba(79,158,255,0.3)',
    desc: 'Send to all customers with email on file',
    notConfigured: 'Add EMAIL_USER + EMAIL_APP_PASSWORD to .env (Gmail App Password)',
  },
  {
    key: 'sms', label: 'SMS (Free)', Icon: MessageSquare,
    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)',
    desc: 'Send SMS via free providers (Fast2SMS/TextBelt)',
    notConfigured: 'Add FAST2SMS_API_KEY to .env for 10 free SMS/day (India) or use TextBelt (Global, 1 SMS/day)',
  },
  {
    key: 'whatsapp', label: 'WhatsApp', Icon: MessageSquare,
    color: '#25D366', bg: 'rgba(37,211,102,0.1)', border: 'rgba(37,211,102,0.3)',
    desc: 'Send to all customers with phone numbers',
    notConfigured: 'Add WHATSAPP_TOKEN + WHATSAPP_PHONE_ID to .env (Meta Business API)',
  },
  {
    key: 'instagram', label: 'Instagram', Icon: Instagram,
    color: '#E1306C', bg: 'rgba(225,48,108,0.1)', border: 'rgba(225,48,108,0.3)',
    desc: 'Post directly to your Instagram Business page',
    notConfigured: 'Add INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_ACCOUNT_ID to .env',
  },
];

const Marketing = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({ type: 'instagram', context: '' });
  const [generatedContent, setGeneratedContent] = useState(null);

  // Distribution state
  const [customers, setCustomers] = useState([]);
  const [showDistribute, setShowDistribute] = useState(false);
  const [sending, setSending] = useState({}); // { email: bool, whatsapp: bool, instagram: bool }
  const [sendResults, setSendResults] = useState({}); // { email: result, ... }
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  useEffect(() => {
    fetchCampaigns();
    fetchSuggestions();
    fetchCustomers();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await marketingAPI.getCampaigns();
      if (response.success) setCampaigns(response.data);
    } catch (e) {
      console.error('Failed to fetch campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await marketingAPI.getSuggestions();
      if (response.success) setSuggestions(response.data);
    } catch (e) { /* silent */ }
  };

  const fetchCustomers = async () => {
    try {
      const response = await marketingAPI.getCustomers();
      if (response.success) setCustomers(response.data);
    } catch (e) { /* silent */ }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGeneratedContent(null);
      setSendResults({});
      const response = await marketingAPI.generate(formData);
      if (response.success) {
        setGeneratedContent(response.data);
        setShowDistribute(true);
      }
    } catch (e) {
      console.error('Failed to generate content:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;
    try {
      await marketingAPI.saveCampaign({
        title: `${formData.type} Campaign - ${new Date().toLocaleDateString()}`,
        content: generatedContent.content,
        type: formData.type,
        platform: formData.type === 'instagram' ? 'instagram' : formData.type === 'sms' ? 'sms' : 'whatsapp',
        context: formData.context,
      });
      fetchCampaigns();
    } catch (e) {
      console.error('Failed to save campaign:', e);
    }
  };

  const handleDelete = async (id) => {
    if (confirmingDelete !== id) { setConfirmingDelete(id); return; }
    setConfirmingDelete(null);
    try {
      await marketingAPI.delete(id);
      setCampaigns(prev => prev.filter(c => c._id !== id));
    } catch (e) {
      console.error('Failed to delete campaign:', e);
    }
  };

  const handleSend = async (channel) => {
    if (!generatedContent) return;
    setSending(prev => ({ ...prev, [channel]: true }));
    setSendResults(prev => ({ ...prev, [channel]: null }));
    try {
      let res;
      const content = generatedContent.content;
      if (channel === 'email') {
        res = await marketingAPI.sendEmail({
          content,
          subject: `Special from Food7 🍽️ — ${generatedContent.title || ''}`,
          context: typeof formData.context === 'string' ? formData.context : '',
        });
      } else if (channel === 'sms') {
        res = await marketingAPI.sendSMS({ content });
      } else if (channel === 'whatsapp') {
        res = await marketingAPI.sendWhatsApp({ content });
      } else if (channel === 'instagram') {
        res = await marketingAPI.sendInstagram({ content });
      }
      setSendResults(prev => ({ ...prev, [channel]: res?.data || res }));
    } catch (e) {
      setSendResults(prev => ({ ...prev, [channel]: { success: false, message: e.message } }));
    } finally {
      setSending(prev => ({ ...prev, [channel]: false }));
    }
  };

  const copyContent = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const emailCount = customers.filter(c => c.email).length;
  const phoneCount = customers.filter(c => c.phone).length;
  const channelCount = { email: emailCount, sms: phoneCount, whatsapp: phoneCount, instagram: 1 };

  return (
    <div className="min-h-screen bg-food7-black p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-food7-white mb-2">AI Marketing Generator</h1>
          <p className="text-food7-white/60">Generate and distribute marketing content to your customers</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Generator + Distribute */}
          <div className="lg:col-span-2 space-y-6">

            {/* Generator Form */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-food7-gold" />
                <h2 className="text-2xl font-heading font-semibold text-food7-white">Generate Content</h2>
              </div>

              <div className="space-y-6">
                {/* Content Type */}
                <div>
                  <label className="block text-sm font-medium text-food7-white mb-3">Content Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setFormData({ ...formData, type: value })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.type === value
                            ? 'border-food7-red bg-food7-red/20 text-food7-white'
                            : 'border-white/10 bg-white/5 text-food7-white/60 hover:border-food7-red/50'
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">{label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Context */}
                <div>
                  <label className="block text-sm font-medium text-food7-white mb-2">Context (Optional)</label>
                  <textarea
                    value={formData.context}
                    onChange={e => setFormData({ ...formData, context: e.target.value })}
                    placeholder="E.g., New dish launch, Weekend special, Diwali offer..."
                    className="input-field w-full h-28 resize-none"
                  />
                </div>

                <Button onClick={handleGenerate} loading={generating} className="w-full">
                  {generating ? 'Generating...' : 'Generate Content'}
                </Button>

                {/* Generated Content */}
                <AnimatePresence>
                  {generatedContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        background: 'rgba(201,168,76,0.08)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: 12, padding: 24,
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-food7-gold">{generatedContent.title || 'Generated Content'}</h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={copyContent}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(255,255,255,0.05)',
                              color: copied ? '#34D399' : '#7A7570',
                              cursor: 'pointer', fontSize: '0.8rem',
                            }}
                          >
                            {copied ? <Check size={13} /> : <Copy size={13} />}
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={handleSave}
                            style={{
                              padding: '6px 12px', borderRadius: 8,
                              border: '1px solid rgba(201,168,76,0.3)',
                              background: 'rgba(201,168,76,0.1)',
                              color: '#C9A84C', cursor: 'pointer', fontSize: '0.8rem',
                            }}
                          >
                            Save Campaign
                          </button>
                        </div>
                      </div>
                      <p className="text-food7-white whitespace-pre-wrap text-sm leading-relaxed">
                        {generatedContent.content}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Distribute Panel */}
            <AnimatePresence>
              {generatedContent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="glass-card"
                  style={{ overflow: 'hidden' }}
                >
                  {/* Distribute header — toggle */}
                  <button
                    onClick={() => setShowDistribute(v => !v)}
                    style={{
                      width: '100%', padding: '20px 28px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Send size={18} style={{ color: '#C9A84C' }} />
                      <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.2rem', fontWeight: 700, color: '#F0EDE8' }}>
                        Distribute Campaign
                      </span>
                      {/* Customer count badge */}
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 999,
                        background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)',
                        fontSize: '0.75rem', color: '#C9A84C', fontWeight: 600,
                      }}>
                        <Users size={11} /> {customers.length} customers
                      </span>
                    </div>
                    {showDistribute ? <ChevronUp size={16} style={{ color: '#7A7570' }} /> : <ChevronDown size={16} style={{ color: '#7A7570' }} />}
                  </button>

                  <AnimatePresence>
                    {showDistribute && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {CHANNELS.map(({ key, label, Icon, color, bg, border, desc, notConfigured }) => {
                            const result = sendResults[key];
                            const isSending = sending[key];
                            const count = channelCount[key];
                            const isNotConfigured = result && result.configured === false;

                            return (
                              <div
                                key={key}
                                style={{
                                  background: bg, border: `1px solid ${border}`,
                                  borderRadius: 12, padding: '16px 20px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                      width: 38, height: 38, borderRadius: 10,
                                      background: `${color}20`, border: `1px solid ${color}40`,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                      <Icon size={18} style={{ color }} />
                                    </div>
                                    <div>
                                      <p style={{ fontWeight: 700, color: '#F0EDE8', fontSize: '0.95rem', margin: 0 }}>{label}</p>
                                      <p style={{ color: '#7A7570', fontSize: '0.78rem', margin: 0 }}>
                                        {key === 'instagram' ? 'Post to your page' : `${count} recipient${count !== 1 ? 's' : ''}`}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleSend(key)}
                                    disabled={isSending}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 6,
                                      padding: '8px 18px', borderRadius: 8,
                                      border: `1px solid ${color}50`,
                                      background: `${color}15`,
                                      color, cursor: isSending ? 'not-allowed' : 'pointer',
                                      fontSize: '0.85rem', fontWeight: 600,
                                      opacity: isSending ? 0.6 : 1,
                                      transition: 'all 0.2s',
                                    }}
                                  >
                                    {isSending ? (
                                      <><span style={{ width: 12, height: 12, border: `2px solid ${color}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Sending…</>
                                    ) : (
                                      <><Send size={13} /> Send</>
                                    )}
                                  </button>
                                </div>

                                {/* Result feedback */}
                                <AnimatePresence>
                                  {result && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      style={{ marginTop: 12, overflow: 'hidden' }}
                                    >
                                      {isNotConfigured ? (
                                        <div style={{
                                          background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                                          padding: '10px 14px', fontSize: '0.8rem',
                                        }}>
                                          <p style={{ color: '#FBBF24', fontWeight: 600, margin: '0 0 4px' }}>⚙️ Not configured yet</p>
                                          <p style={{ color: '#7A7570', margin: 0 }}>{notConfigured}</p>
                                          {result.phoneNumbers?.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                              <p style={{ color: '#7A7570', margin: '0 0 4px' }}>Numbers to message manually:</p>
                                              <p style={{ color: '#F0EDE8', fontFamily: '"DM Mono", monospace', fontSize: '0.75rem', margin: 0 }}>
                                                {result.phoneNumbers.join(', ')}
                                              </p>
                                            </div>
                                          )}
                                          {result.caption && (
                                            <div style={{ marginTop: 8 }}>
                                              <p style={{ color: '#7A7570', margin: '0 0 4px' }}>Caption to post manually:</p>
                                              <p style={{ color: '#F0EDE8', fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>{result.caption}</p>
                                            </div>
                                          )}
                                        </div>
                                      ) : result.success ? (
                                        <p style={{ color: '#34D399', fontSize: '0.82rem', margin: 0 }}>
                                          ✅ {result.message}
                                        </p>
                                      ) : (
                                        <p style={{ color: '#F87171', fontSize: '0.82rem', margin: 0 }}>
                                          ❌ {result.message}
                                        </p>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved Campaigns */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-2xl font-heading font-semibold text-food7-white mb-4">Saved Campaigns</h2>
              {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
              ) : campaigns.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Megaphone className="w-16 h-16 text-food7-white/20 mx-auto mb-4" />
                  <p className="text-food7-white/60">No campaigns saved yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign, index) => (
                    <motion.div
                      key={campaign._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card-hover p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-food7-white mb-1">{campaign.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-food7-gold/20 text-food7-gold text-xs rounded">{campaign.platform}</span>
                            <span className="text-food7-white/60 text-sm">{new Date(campaign.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {confirmingDelete === campaign._id ? (
                            <>
                              <button
                                onClick={() => handleDelete(campaign._id)}
                                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.2)', color: '#F87171', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                              >Confirm</button>
                              <button
                                onClick={() => setConfirmingDelete(null)}
                                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#7A7570', cursor: 'pointer', fontSize: '0.78rem' }}
                              >Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => handleDelete(campaign._id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-food7-white/80 text-sm whitespace-pre-wrap">{campaign.content}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: AI Suggestions + Customer Summary */}
          <div className="space-y-6">
            {/* AI Suggestions */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-food7-gold" />
                <h3 className="text-lg font-heading font-semibold text-food7-white">AI Suggestions</h3>
              </div>
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-food7-white/80 text-sm">
                      {typeof s === 'string' ? s : s.reason || s.type || 'Marketing suggestion'}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Customer Audience Summary */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-food7-gold" />
                <h3 className="text-lg font-heading font-semibold text-food7-white">Audience</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Total Customers', value: customers.length, color: '#C9A84C' },
                  { label: 'With Email', value: emailCount, color: '#4F9EFF' },
                  { label: 'With SMS/WhatsApp', value: phoneCount, color: '#F59E0B' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#7A7570', fontSize: '0.85rem' }}>{label}</span>
                    <span style={{ color, fontWeight: 700, fontFamily: '"DM Mono", monospace' }}>{value}</span>
                  </div>
                ))}
                {customers.length === 0 && (
                  <p style={{ color: '#3A3530', fontSize: '0.8rem', textAlign: 'center', padding: '8px 0' }}>
                    Add customer emails/phones in Billing to grow your audience
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketing;
