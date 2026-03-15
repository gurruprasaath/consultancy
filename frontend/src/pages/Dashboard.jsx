/**
 * Dashboard Page
 * Main owner dashboard with analytics and alerts
 */

import { useState, useEffect } from 'react';
import { analyticsAPI, marketingAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle, 
  Package, 
  Sparkles,
  DollarSign,
  Users,
  Phone
} from 'lucide-react';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [marketingSuggestions, setMarketingSuggestions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 30 seconds to show live updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Only set loading on initial load, not background refreshes
      if (!dashboardData) setLoading(true);
      
      const [dashboard, suggestions] = await Promise.all([
        analyticsAPI.getDashboard(),
        marketingAPI.getSuggestions(),
      ]);

      if (dashboard.success) {
        setDashboardData(dashboard.data);
      }

      if (suggestions.success) {
        setMarketingSuggestions(suggestions.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      if (loading) setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-food7-black">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      title: 'Today Revenue',
      value: `₹${dashboardData?.revenue?.today?.toLocaleString() || 0}`,
      change: dashboardData?.revenue?.change || 0,
      icon: DollarSign,
      color: 'gold',
    },
    {
      title: 'Today Orders',
      value: dashboardData?.orders?.today || 0,
      change: `${dashboardData?.orders?.change > 0 ? '+' : ''}${dashboardData?.orders?.change || 0}%`,
      icon: ShoppingCart,
      color: 'red',
    },
    {
      title: 'Complaints',
      value: dashboardData?.complaints?.total || 0,
      change: dashboardData?.complaints?.pending ? `-${dashboardData.complaints.pending}` : '0',
      icon: Phone,
      color: 'red',
    },
    {
      title: 'Low Stock Items',
      value: dashboardData?.alerts?.inventory?.length || 0,
      change: 'Alerts',
      icon: Package,
      color: 'gold',
    },
  ];

  return (
    <div className="min-h-screen bg-food7-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-heading font-bold text-food7-white mb-2">
            Dashboard
          </h1>
          <p className="text-food7-white/60">Welcome to Food7 Management System</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card-hover p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  stat.color === 'gold' ? 'bg-food7-gold/20' : 'bg-food7-red/20'
                }`}>
                  <stat.icon className={`w-6 h-6 ${
                    stat.color === 'gold' ? 'text-food7-gold' : 'text-food7-red'
                  }`} />
                </div>
                <span className={`text-sm font-medium ${
                  String(stat.change).startsWith('+') ? 'text-green-400' : 
                  String(stat.change).startsWith('-') ? 'text-red-400' : 
                  'text-food7-gold'
                }`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-food7-white/60 text-sm mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-food7-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Selling Items */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-food7-gold" />
              <h2 className="text-xl font-heading font-semibold text-food7-white">
                Top Selling Items
              </h2>
            </div>
            <div className="space-y-3">
              {dashboardData?.topItems?.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-food7-white font-medium">{item.name}</p>
                    <p className="text-food7-white/60 text-sm">{item.quantity} sold</p>
                  </div>
                  <p className="text-food7-gold font-semibold">₹{item.revenue}</p>
                </div>
              )) || (
                <p className="text-food7-white/40 text-center py-4">No data available</p>
              )}
            </div>
          </motion.div>

          {/* Complaint Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-food7-red" />
              <h2 className="text-xl font-heading font-semibold text-food7-white">
                Complaint Alerts
              </h2>
            </div>
            <div className="space-y-3">
              {dashboardData?.alerts?.complaints?.slice(0, 3).map((complaint, index) => (
                <div key={index} className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 text-sm font-medium">{complaint.category}</span>
                    <span className="text-red-400 text-xs">{complaint.sentiment}</span>
                  </div>
                  <p className="text-food7-white/80 text-sm">{complaint.suggestedAction}</p>
                </div>
              )) || (
                <div className="text-center py-4">
                  <p className="text-green-400 font-medium">✓ No complaints today!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Inventory Alerts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-food7-gold" />
              <h2 className="text-xl font-heading font-semibold text-food7-white">
                Inventory Alerts
              </h2>
            </div>
            <div className="space-y-3">
              {dashboardData?.alerts?.inventory?.slice(0, 5).map((item, index) => (
                <div key={index} className="p-3 bg-food7-gold/10 border border-food7-gold/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-food7-white font-medium">{item.name}</p>
                      <p className="text-food7-white/60 text-sm">
                        {item.currentQty} {item.unit} left
                      </p>
                    </div>
                    <span className="text-food7-gold text-xs font-medium">LOW STOCK</span>
                  </div>
                </div>
              )) || (
                <p className="text-food7-white/40 text-center py-4">All stock levels healthy</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* AI Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-food7-gold" />
            <h2 className="text-xl font-heading font-semibold text-food7-white">
              AI Recommendations
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData?.recommendations?.map((rec, index) => (
              <div key={index} className="p-4 bg-food7-gold/10 border border-food7-gold/30 rounded-lg">
                <p className="text-food7-white text-sm">{rec}</p>
              </div>
            )) || (
              <p className="text-food7-white/40">No recommendations at this time</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
