import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Apply dark mode early before mounting to prevent flash.
// Default to dark mode (true) if no preference is explicitly set in localStorage.
const savedDarkMode = localStorage.getItem('sg_bus_dark_mode');
const isDark = savedDarkMode === 'true' || savedDarkMode === null;

if (isDark) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);