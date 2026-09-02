import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ children, requiredCapability, requiredRole }) => {
  const { isAuthenticated, isLoading, role, hasCapability } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="large" label="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole && role !== 'admin') {
    return <AccessDeniedMessage requiredRole={requiredRole} />;
  }

  if (requiredCapability && !hasCapability(requiredCapability)) {
    return <AccessDeniedMessage requiredCapability={requiredCapability} />;
  }

  return children;
};

const AccessDeniedMessage = ({ requiredRole, requiredCapability }) => (
  <div className="p-8 max-w-lg mx-auto my-12 bg-slate-900 border border-rose-500/30 rounded-xl text-center shadow-glow-rose">
    <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
    <h2 className="text-xl font-bold text-slate-100 uppercase tracking-wider font-mono">
      Access Denied
    </h2>
    <p className="text-sm text-slate-400 mt-2">
      Your current role does not possess the required privilege (
      <span className="font-mono text-rose-400">
        {requiredCapability || requiredRole}
      </span>
      ) to access this security module.
    </p>
  </div>
);
