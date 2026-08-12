import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const DEFAULT_CLIENT_ID = '447122554579-0vils920hrphrbt1femo496kibt53tp4.apps.googleusercontent.com';

function MainApp() {
  const [clientId, setClientId] = useState<string>(() => {
    return (
      localStorage.getItem('onenote_custom_client_id') ||
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      DEFAULT_CLIENT_ID
    );
  });

  useEffect(() => {
    const handleStorage = () => {
      const custom = localStorage.getItem('onenote_custom_client_id');
      const resolved = custom || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || DEFAULT_CLIENT_ID;
      setClientId(resolved);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainApp />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker registered with scope:', reg.scope))
      .catch((err) => console.log('[PWA] Service Worker registration failed:', err));
  });
}
