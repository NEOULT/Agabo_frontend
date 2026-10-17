import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Escucha en todas las interfaces para que el teléfono alcance el servidor
    // (LAN o túnel HTTPS del puerto 5173).
    host: true,
    // El escaneo por teléfono abre la app desde otra URL (Dev Tunnel o IP de la
    // red), que Vite rechazaría por no ser `localhost`. Es solo desarrollo.
    allowedHosts: true,
    proxy: {
      // En desarrollo `/api` se enruta al backend Express (localhost:3000),
      // evitando CORS sin configurar cabeceras en el backend. El teléfono usa
      // el mismo origen, así que `/api` también viaja por aquí.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
