import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { configureApiClient } from '@shared/api';
import { configureZod } from '@shared/lib';

import './styles/index.css';

configureZod();
configureApiClient();

// Схемы приложения создаются после отключения JIT, чтобы не нарушать CSP.
const [{ App }, { initializeTheme }] = await Promise.all([import('./app'), import('@shared/context')]);

initializeTheme();

const rootElement = document.querySelector('#root');

if (!rootElement) {
  throw new Error('Root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
