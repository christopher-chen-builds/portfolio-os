import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CompanyDetail from './pages/CompanyDetail';
import CompanyNew from './pages/CompanyNew';
import './App.css';

function ProtectedRoute({ children, checkAuth }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (checkAuth) {
      api.me()
        .then(() => setAuthenticated(true))
        .catch(() => setAuthenticated(false))
        .finally(() => setLoading(false));
    }
  }, [checkAuth]);

  if (loading) {
    return <div className="state-message loading">Loading...</div>;
  }

  return authenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLoginSuccess = () => {
    api.me().then(setUser).catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    setUser(null);
  };

  if (!authChecked) {
    return <div className="state-message loading">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Login onSuccess={handleLoginSuccess} />
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute checkAuth>
              <Dashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/new"
          element={
            <ProtectedRoute checkAuth>
              <CompanyNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <ProtectedRoute checkAuth>
              <CompanyDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}