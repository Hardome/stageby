import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { getAccessToken } from '@shared/lib/auth';

import { client } from '../generated/api/.kubb/client';
import { App } from './app';
import './styles/index.css';

client.setConfig({ auth: getAccessToken });

const rootElement = document.querySelector('#root');

if (!rootElement) {
  throw new Error('Root element was not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
