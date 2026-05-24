import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import TestPage from './pages/TestPage';

createRoot(document.getElementById('test-root')!).render(
  <StrictMode>
    <TestPage />
  </StrictMode>
);
