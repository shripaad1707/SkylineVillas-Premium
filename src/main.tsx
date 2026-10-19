import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// Self-hosted type: Cormorant Garamond for headlines, Geist for everything else.
// Bundled with the site, so text never swaps fonts mid-scroll.
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/geist/latin-300.css';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
