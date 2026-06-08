import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Scale the fixed 402×920 phone canvas to fit any viewport.
function fit() {
  const stage = document.getElementById('stage');
  const scale = document.getElementById('scale');
  if (!stage || !scale) return;
  const W = stage.clientWidth - 32;
  const H = stage.clientHeight - 32;
  const k = Math.min(W / 402, H / 920, 1.2);
  scale.style.transform = `scale(${k})`;
}
window.addEventListener('resize', fit);
setTimeout(fit, 100);
setTimeout(fit, 800);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
