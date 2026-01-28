import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { VSCodeProvider } from './hooks/useVSCode';
import App from './App';
import './styles/index.css';
import './i18n/i18n'; // Initialize i18n

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <VSCodeProvider>
            <App />
        </VSCodeProvider>
    </StrictMode>
);
