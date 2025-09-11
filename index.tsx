
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('Starting React app...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('Root element found, creating React root...');

const root = ReactDOM.createRoot(rootElement);

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  rootElement.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">
    <h1>خطأ في تحميل التطبيق</h1>
    <p>${error}</p>
  </div>`;
}
