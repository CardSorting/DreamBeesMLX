/**
 * [LAYER: INFRASTRUCTURE]
 */
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const dreamTrailApiProxyTarget = env.VITE_DREAMTRAIL_API_PROXY_TARGET || 'https://dreambees-alchemist.web.app';
  const dreamTrailApiProxyPath = env.VITE_DREAMTRAIL_API_PROXY_PATH;

  return {
    base: './',
    server: {
      port: 3000,
      proxy: {
        '/api/dreamtrail': {
          target: dreamTrailApiProxyTarget,
          changeOrigin: true,
          secure: dreamTrailApiProxyTarget.startsWith('https://'),
          rewrite: dreamTrailApiProxyPath ? () => dreamTrailApiProxyPath : undefined,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              rollupOptions: {
                external: ['better-sqlite3'],
              },
            },
            define: {
              'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
              'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
              'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
              'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
              'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
              'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
            },
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) { options.reload(); }
        },
      ]),
      renderer(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'react-router-dom'],
            'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'toast-vendor': ['react-hot-toast'],
          }
        }
      }
    }
  }
});
