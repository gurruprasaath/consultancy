/**
 * API Service
 * Axios instance with interceptors for authentication
 */

import axios from 'axios';

// In Docker / local dev: nginx proxies /api → backend, so baseURL = '/api'
// In Railway (separate services): set VITE_API_URL to the backend Railway URL
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'https://consultancy-k8nb.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('food7_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || 'An error occurred';
      
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('food7_token');
        localStorage.removeItem('food7_user');
        window.location.href = '/login';
      }
      
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(new Error('No response from server'));
    } else {
      // Something else happened
      return Promise.reject(error);
    }
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
};

// Orders API
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (orderData) => api.post('/orders', orderData),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  getTodayStats: () => api.get('/orders/stats/today'),
  validateCoupon: (code, phone) => api.post('/orders/validate-coupon', { code, phone }),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getOne: (id) => api.get(`/inventory/${id}`),
  create: (itemData) => api.post('/inventory', itemData),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  delete: (id) => api.delete(`/inventory/${id}`),
  restock: (id, quantity) => api.post(`/inventory/${id}/restock`, { quantity }),
  getPredictions: () => api.get('/inventory/predictions/all'),
  getLowStockAlerts: () => api.get('/inventory/alerts/low-stock'),
  getInsights: () => api.get('/inventory/analysis/insights'),
  getRestockForecast: (params) => api.get('/inventory/forecast/restock', { params }),
};

// Calls API
export const callsAPI = {
  upload: (formData) => api.post('/calls/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/calls', { params }),
  getOne: (id) => api.get(`/calls/${id}`),
  update: (id, data) => api.put(`/calls/${id}`, data),
  delete: (id) => api.delete(`/calls/${id}`),
  getStats: () => api.get('/calls/stats/summary'),
};

// Marketing API
export const marketingAPI = {
  generate: (data) => api.post('/marketing/generate', data),
  saveCampaign: (data) => api.post('/marketing/save', data),
  getCampaigns: (params) => api.get('/marketing/campaigns', { params }),
  getOne: (id) => api.get(`/marketing/campaigns/${id}`),
  update: (id, data) => api.put(`/marketing/campaigns/${id}`, data),
  delete: (id) => api.delete(`/marketing/campaigns/${id}`),
  getSuggestions: () => api.get('/marketing/suggestions'),
  // Distribution
  getCustomers: () => api.get('/marketing/customers'),
  sendEmail: (data) => api.post('/marketing/send/email', data),
  sendSMS: (data) => api.post('/marketing/send/sms', data),
  sendWhatsApp: (data) => api.post('/marketing/send/whatsapp', data),
  sendInstagram: (data) => api.post('/marketing/send/instagram', data),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenue: (params) => api.get('/analytics/revenue', { params }),
  getTopItems: (params) => api.get('/analytics/top-items', { params }),
  getPeakHours: (params) => api.get('/analytics/peak-hours', { params }),
  getInsights: () => api.get('/analytics/insights'),
  getAlerts: () => api.get('/analytics/alerts'),
};

// Menu API
export const menuAPI = {
  getAll: (params) => api.get('/menu', { params }),
  create: (data) => api.post('/menu', data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  delete: (id) => api.delete(`/menu/${id}`),
  toggleAvailability: (id) => api.patch(`/menu/${id}/toggle`),
};

// Payments API (Razorpay)
export const paymentsAPI = {
  getConfig: () => api.get('/payments/config'),
  createOrder: (data) => api.post('/payments/create-order', data),
  verify: (data) => api.post('/payments/verify', data),
  testSuccess: (data) => api.post('/payments/test-success', data),
};

export default api;
