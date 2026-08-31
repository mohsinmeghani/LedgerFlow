import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Docker Desktop's bind mounts on Windows don't reliably forward native
    // filesystem change events into the container, so HMR silently stops
    // picking up edits without polling.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
