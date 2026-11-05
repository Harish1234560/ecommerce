import App from '@/App';
import { registerServiceWorker } from '@/utils/pwa';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
