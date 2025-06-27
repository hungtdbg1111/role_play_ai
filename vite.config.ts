// vite.config.ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'; // 1. Thêm dòng import này

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 2. Thêm khóa 'plugins' vào đây
      plugins: [react()], 

      // 3. Thêm khóa 'build' vào đây
      build: {
        target: 'es2015' 
      },

      // Các cấu hình hiện tại của bạn giữ nguyên
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});