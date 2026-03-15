/**
 * Login Page
 * Premium red-black themed authentication
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { motion } from 'framer-motion';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-food7-black via-food7-dark to-food7-black p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #8B0000 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-5xl font-heading font-bold text-food7-red mb-2"
            style={{ textShadow: '0 0 20px rgba(139, 0, 0, 0.5)' }}
          >
            FOOD7
          </motion.h1>
          <p className="text-food7-gold text-sm font-medium tracking-wider">
            AI-POWERED RESTAURANT MANAGEMENT
          </p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-8"
        >
          <h2 className="text-2xl font-heading font-semibold text-center mb-6 text-food7-white">
            Welcome Back
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@food7.com"
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-food7-gold/10 border border-food7-gold/30 rounded-lg">
            <p className="text-xs text-food7-gold font-medium mb-2">Demo Credentials:</p>
            <div className="text-xs text-food7-white/70 space-y-1">
              <p>Admin: admin@food7.com / admin123</p>
              <p>Manager: manager@food7.com / manager123</p>
              <p>Staff: staff@food7.com / staff123</p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-food7-white/50 text-sm mt-6">
          © 2026 Food7. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
