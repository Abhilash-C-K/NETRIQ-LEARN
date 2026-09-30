import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppRouter } from './router';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';

export const App = () => {
  // Dismiss initial HTML/CSS preloader on React mount with graceful fade-out
  useEffect(() => {
    const preloader = document.getElementById('app-preloader');
    if (preloader) {
      preloader.classList.add('preloader-exit');
      const timer = setTimeout(() => {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NetworkStatusBanner />
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
