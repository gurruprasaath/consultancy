/**
 * Navbar — redesigned with Playfair Display + DM Sans aesthetic
 */

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Phone, Megaphone, Package,
  Receipt, BarChart3, LogOut, Menu, X, UtensilsCrossed,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/menu',      label: 'Menu',      icon: UtensilsCrossed },
  { path: '/billing',   label: 'Billing',   icon: Receipt },
  { path: '/calls',     label: 'Calls',     icon: Phone },
  { path: '/marketing', label: 'Marketing', icon: Megaphone },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav style={{
      background: 'rgba(17,17,17,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(201,168,76,0.12)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

          {/* Logo */}
          <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: '1.5rem',
              fontWeight: 900,
              color: '#C9A84C',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              Food7
            </span>
            <span style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '0.6rem',
              color: '#7A7570',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              AI
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="hidden-mobile">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: '0.8rem', fontWeight: 500,
                    transition: 'all 0.2s',
                    background: active ? 'rgba(139,0,0,0.25)' : 'transparent',
                    color: active ? '#C9A84C' : '#7A7570',
                    border: active ? '1px solid rgba(139,0,0,0.4)' : '1px solid transparent',
                  }}
                >
                  <Icon size={13} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right: user + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>{user?.name}</p>
              <p style={{ fontSize: '0.65rem', color: '#C9A84C', margin: 0, textTransform: 'capitalize', fontFamily: '"DM Mono", monospace' }}>
                {user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: 'rgba(139,0,0,0.12)',
                border: '1px solid rgba(139,0,0,0.3)',
                color: '#F87171', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <LogOut size={13} /> Logout
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              style={{
                display: 'none', padding: 8, background: 'none',
                border: 'none', color: '#F0EDE8', cursor: 'pointer',
              }}
              className="mobile-menu-btn"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ borderTop: '1px solid rgba(201,168,76,0.1)', overflow: 'hidden' }}
          >
            <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: '0.9rem', fontWeight: 500,
                      color: active ? '#C9A84C' : '#7A7570',
                      background: active ? 'rgba(139,0,0,0.2)' : 'transparent',
                    }}
                  >
                    <Icon size={16} /> {label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
