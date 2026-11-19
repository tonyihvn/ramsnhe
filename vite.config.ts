
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env files into an object for this config invocation
  const env = loadEnv(mode, process.cwd(), '');
  const frontendPort = Number(env.FRONTEND_PORT) || 5173;
  const serverPort = Number(env.SERVER_PORT) || 3000;
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1,ihvn.duckdns.org')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
  const publicHost = (env.VITE_PUBLIC_HOST || '').trim();
  const useHttpsProxy = String(env.VITE_USE_HTTPS_PROXY || '').toLowerCase() === 'true';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: frontendPort,
      strictPort: true,
      allowedHosts,
      ...(useHttpsProxy && publicHost
        ? {
            hmr: {
              protocol: 'wss',
              host: publicHost,
              clientPort: 443
            }
          }
        : {}),
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          rewrite: (path) => path,
        },
        '/auth': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          rewrite: (path) => path,
        },
        '/uploads': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          rewrite: (path) => path,
        },
        '/builds': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          rewrite: (path) => path,
        }
      }
    },
    optimizeDeps: {
      include: ['summernote']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom']
          }
        }
      }
    }
  };
});
