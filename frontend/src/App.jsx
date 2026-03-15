import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CallAnalysis from './pages/CallAnalysis';
import Marketing from './pages/Marketing';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import AnalyticsPage from './pages/AnalyticsPage';
import MenuPage from './pages/MenuPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div style={{ minHeight: '100vh', background: '#0A0A0A' }}>
                  <Navbar />
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/calls" element={<CallAnalysis />} />
                    <Route path="/marketing" element={<Marketing />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/menu" element={<MenuPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
