import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './tailwind.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global Async Error Handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('[System] Unhandled Promise Rejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
