import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { configureApiClient } from '@shared/api';
import { initializeTheme } from '@shared/context';

import { App } from './app';
import './styles/index.css';

configureApiClient();
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
