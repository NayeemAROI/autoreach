import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle onboarding redirect logic
  const isOnboardingRoute = location.pathname === '/onboarding';
  
  // If user hasn't completed onboarding, and they are NOT on the onboarding page, redirect them there
  if (user.has_completed_onboarding === 0 && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // If user HAS completed onboarding, but tries to visit the onboarding page, redirect to dashboard
  if (user.has_completed_onboarding === 1 && isOnboardingRoute) {
    return <Navigate to="/" replace />;
  }

  return children;
}
