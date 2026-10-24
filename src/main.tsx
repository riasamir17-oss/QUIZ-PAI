import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and suppress HMR websocket disconnections in sandbox environment
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || String(event?.reason || '');
  if (msg.includes('WebSocket') || msg.includes('closed without opened')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
