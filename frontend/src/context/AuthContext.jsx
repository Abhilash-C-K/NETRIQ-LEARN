import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth';
import { setAccessToken, setUnauthenticatedHandler } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [capabilities, setCapabilities] = useState([]);
  const [accessToken, setAccessTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setRole(null);
      setCapabilities([]);
      setAccessTokenState(null);
      setAccessToken(null);
      localStorage.removeItem('netriq_refresh_token');
    }
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      logout();
    });
  }, [logout]);

  // Session Restore on Mount
  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = localStorage.getItem('netriq_refresh_token');
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await authService.refresh();
        setAccessTokenState(token);
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setRole(userData.role?.toLowerCase() || 'viewer');
        setCapabilities(userData.capabilities || []);
      } catch (err) {
        console.warn('Session restore failed:', err);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  const login = async (username, password) => {
    const { access_token, user: userData } = await authService.login(username, password);
    setAccessTokenState(access_token);
    setUser(userData);
    const userRole = (userData.role || 'viewer').toLowerCase();
    setRole(userRole);
    setCapabilities(userData.capabilities || []);
    return userData;
  };

  const hasCapability = useCallback(
    (requiredCapability) => {
      if (!requiredCapability) return true;
      if (role === 'admin') return true; // Admin has superuser access
      return capabilities.includes(requiredCapability);
    },
    [role, capabilities]
  );

  const value = {
    user,
    role,
    capabilities,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    login,
    logout,
    hasCapability,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
