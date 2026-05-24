import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './AuthContext';
import ErrorBoundary from './ErrorBoundary';
import App from './App.tsx';
import './index.css';

// Fail fast if required env vars are missing — surface a clear error in dev
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  document.getElementById('root')!.innerHTML = `
    <div style="font-family:sans-serif;padding:2rem;max-width:480px;margin:4rem auto;border:2px solid #fca5a5;border-radius:12px;background:#fef2f2">
      <h2 style="color:#dc2626;margin-bottom:.5rem">Missing environment variables</h2>
      <p style="color:#374151;font-size:.875rem">
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> must be set.<br/><br/>
        Copy <strong>.env.example</strong> to <strong>.env</strong> and fill in your Supabase credentials.
      </p>
    </div>`;
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
