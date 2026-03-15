/**
 * Analytics Page
 * Detailed analytics with charts and insights
 */

import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Sparkles } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Analytics = () => {
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [revenue, items, hours, aiInsights] = await Promise.all([
        analyticsAPI.getRevenue({ days: 7 }),
        analyticsAPI.getTopItems({ days: 7 }),
        analyticsAPI.getPeakHours({ days: 7 }),
        analyticsAPI.getInsights(),
      ]);

      if (revenue.success) setRevenueData(revenue.data);
      if (items.success) setTopItems(items.data);
      if (hours.success) setPeakHours(hours.data);
      if (aiInsights.success) setInsights(aiInsights.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(11, 11, 11, 0.9)',
        titleColor: '#D4AF37',
        bodyColor: '#F5F5F5',
        borderColor: '#8B0000',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#F5F5F5',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#F5F5F5',
        },
      },
    },
  };

  const revenueChartData = {
    labels: revenueData?.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-IN', { weekday: 'short' });
    }) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Revenue',
        data: revenueData?.map(item => item.revenue) || [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(139, 0, 0, 0.8)',
        borderColor: '#8B0000',
        borderWidth: 2,
      },
    ],
  };

  const topItemsChartData = {
    labels: topItems.slice(0, 5).map(item => item.name) || [],
    datasets: [
      {
        label: 'Quantity Sold',
        data: topItems.slice(0, 5).map(item => item.quantity) || [],
        backgroundColor: 'rgba(212, 175, 55, 0.8)',
        borderColor: '#D4AF37',
        borderWidth: 2,
      },
    ],
  };

  const peakHoursChartData = {
    labels: peakHours.map(h => `${h.hour}:00`) || [],
    datasets: [
      {
        label: 'Orders',
        data: peakHours.map(h => h.orders) || [],
        backgroundColor: 'rgba(139, 0, 0, 0.8)',
        borderColor: '#8B0000',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-food7-black">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
            Analytics Dashboard
          </h1>
          <p className="text-food7-white/60">
            Detailed insights and performance metrics
          </p>
        </motion.div>

        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 mb-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-food7-gold" />
            <h2 className="text-2xl font-heading font-semibold text-food7-white">
              Revenue Trend (Last 7 Days)
            </h2>
          </div>
          <div className="h-80">
            <Bar data={revenueChartData} options={chartOptions} />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Items Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-6 h-6 text-food7-gold" />
              <h2 className="text-2xl font-heading font-semibold text-food7-white">
                Top Selling Items
              </h2>
            </div>
            <div className="h-80">
              <Bar data={topItemsChartData} options={chartOptions} />
            </div>
          </motion.div>

          {/* Peak Hours Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-6 h-6 text-food7-gold" />
              <h2 className="text-2xl font-heading font-semibold text-food7-white">
                Peak Hours
              </h2>
            </div>
            <div className="h-80">
              <Line data={peakHoursChartData} options={chartOptions} />
            </div>
          </motion.div>
        </div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-food7-gold" />
            <h2 className="text-2xl font-heading font-semibold text-food7-white">
              AI-Generated Insights
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.length > 0 ? (
              insights.map((insight, index) => (
                <div
                  key={index}
                  className="p-4 bg-food7-gold/10 border border-food7-gold/30 rounded-lg"
                >
                  <p className="text-food7-white text-sm">{insight}</p>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-8">
                <p className="text-food7-white/60">No insights available yet</p>
                <p className="text-food7-white/40 text-sm mt-2">
                  Insights will appear as you collect more data
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Items List */}
        {topItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 glass-card p-8"
          >
            <h2 className="text-2xl font-heading font-semibold text-food7-white mb-6">
              Detailed Item Performance
            </h2>
            <div className="space-y-3">
              {topItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-food7-gold/20 flex items-center justify-center">
                      <span className="text-food7-gold font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-food7-white font-medium">{item.name}</p>
                      <p className="text-food7-white/60 text-sm">{item.quantity} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-food7-gold">₹{item.revenue}</p>
                    <p className="text-food7-white/60 text-sm">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
