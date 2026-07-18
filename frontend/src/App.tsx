import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Signup from './features/auth/Signup';
import Login from './features/auth/Login';
import Verify from './features/auth/Verify';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './features/dashboard/Dashboard';
import Teams from './features/teams/Teams';
import Settings from './features/settings/Settings';
import Documents from './features/documents/Documents';

// Private Route Guard
interface PrivateRouteProps {
  children: React.ReactElement;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/auth/login" replace />;
}

// Public Route Guard (Redirects away from auth pages if logged in)
function PublicRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } 
        />
        <Route 
          path="/auth/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route path="/auth/verify" element={<Verify />} />

        {/* Protected Core Application Routes */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="teams" element={<Teams />} />
          <Route path="documents" element={<Documents />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback Redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
