import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env files
  const env = loadEnv(mode, process.cwd(), '');
  
  const frontendPort = Number(env.FRONTEND_PORT) || 5173;
  const serverPort = Number(env.SERVER_PORT) || 3000;
  
  // Local: http://localhost:3000
  // Production: https://api.yourdomain.com (from your .env file)
  const apiTarget = env.VITE_API_URL || `http://localhost:${serverPort}`;

  return {
    plugins: [react()],
    server: {
      host: true,
      port: frontendPort,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      sourcemap: false,
      reportCompressedSize: false,
      minify: 'esbuild',
    }
  };
});