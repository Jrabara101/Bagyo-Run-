import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const BACKEND_PORT = process.env.BACKEND_PORT || process.env.PORT || '3002';

// Prevent unhandled proxy socket write errors (ECONNABORTED, ECONNRESET, EPIPE) from crashing Vite
process.on('uncaughtException', (err: any) => {
  if (['ECONNABORTED', 'ECONNRESET', 'EPIPE', 'ERR_STREAM_DESTROYED'].includes(err?.code)) {
    return;
  }
  console.error('Vite Process Uncaught Exception:', err);
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT) || 5174,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server starting up or temporarily offline.' }));
            }
          });
        },
      },
      '/ws': {
        target: `ws://127.0.0.1:${BACKEND_PORT}`,
        ws: true,
        rewriteWsOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any, _req, socket) => {
            // Guard against socket write errors on dead/aborted sockets
            if (socket && 'destroyed' in socket) {
              try {
                if (!socket.destroyed) {
                  socket.destroy();
                }
              } catch {
                // Ignore destruction errors
              }
            }
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err: any) => {
              if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err?.code)) {
                return;
              }
            });
          });
          proxy.on('open', (proxySocket) => {
            proxySocket.on('error', (err: any) => {
              if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err?.code)) {
                return;
              }
            });
          });
        },
      },
    },
  },
});
