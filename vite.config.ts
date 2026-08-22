import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let proxyTarget = (env.VITE_PROXY_TARGET || env.VITE_API_URL || '').trim();
  if (!proxyTarget || !proxyTarget.startsWith('http')) {
    proxyTarget = 'https://prc-backend-6sw7.onrender.com';
  }

  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('Origin');
              proxyReq.removeHeader('referer');
              proxyReq.removeHeader('Referer');
            });
          }
        }
      }
    },
  };
})
