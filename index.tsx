
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

function mountReactApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Critical: Root element 'root' not found in HTML. React app cannot be mounted.");
    // Display a user-friendly message on the page itself
    document.body.innerHTML = `
      <div style="color: #f3f4f6; background-color: #111827; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; padding: 20px; text-align: center;">
        <h1 style="font-size: 2em; color: #ef4444; margin-bottom: 1em;">Lỗi Khởi Tạo Ứng Dụng</h1>
        <p style="font-size: 1.2em; margin-bottom: 0.5em;">Không tìm thấy thành phần HTML gốc (thường là một div với id="root") để khởi chạy ứng dụng React.</p>
        <p style="font-size: 1em; color: #d1d5db;">Vui lòng kiểm tra những điều sau:</p>
        <ul style="list-style: disc; text-align: left; margin: 1em 0; padding-left: 40px; color: #d1d5db;">
          <li>File <code style="background-color: #374151; padding: 2px 4px; border-radius: 4px;">index.html</code> có chứa thẻ <code style="background-color: #374151; padding: 2px 4px; border-radius: 4px;">&lt;div id="root"&gt;&lt;/div&gt;</code>.</li>
          <li>Script chính của ứng dụng được tải và thực thi đúng cách.</li>
        </ul>
        <p style="font-size: 0.9em; color: #9ca3af;">Kiểm tra console của trình duyệt (F12) để biết thêm thông báo lỗi chi tiết.</p>
      </div>
    `;
    throw new Error("Không tìm thấy root element '#root' để gắn React app vào.");
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
