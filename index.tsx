import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker for PWA support with origin check
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we are on a valid origin for SW registration
    const isLocalhost = Boolean(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    const swUrl = './sw.js';
    
    // In sandboxed environments like ai.studio, Service Workers might fail due to origin mismatches.
    // We attempt registration but catch errors silently to avoid cluttering the console.
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('ElderCare SW registered: ', registration.scope);
      })
      .catch(error => {
        // Log a more helpful message for origin mismatches
        if (error.name === 'SecurityError') {
          console.log('ElderCare SW: Browser security restricted background registration on this domain. App will continue in standard mode.');
        } else {
          console.log('ElderCare SW registration skipped:', error.message);
        }
      });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);