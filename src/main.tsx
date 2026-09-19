import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { currentMode } from './route';

// Before the first render, so the matching body styles apply from the first
// paint; see route.ts.
document.documentElement.dataset.mode = currentMode();

const el = document.getElementById('root');
if (!el) throw new Error('Root element #root not found in index.html');
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
