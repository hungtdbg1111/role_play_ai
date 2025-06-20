
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

function mountReactApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Critical: Root element 'root' not found in HTML. React app cannot be mounted.");
    // Display a user-friendly message on the page itself is removed as per user request.
    // The console error and thrown error below are sufficient for debugging.
    throw new Error("Không tìm thấy root element '#root' để gắn React app vào. Kiểm tra file index.html và console của trình duyệt (F12).");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Wait for the DOM to be fully loaded before trying to mount the React app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountReactApp);
} else {
  // DOMContentLoaded has already fired
  mountReactApp();
}