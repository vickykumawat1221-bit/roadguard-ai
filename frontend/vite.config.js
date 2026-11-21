import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend port defaults to 8005 (since 8000 is occupied by system process)
const BACKEND_PORT = process.env.VITE_BACKEND_PORT || 8005

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/processed': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      '/sample_media': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
      }
    }
  }
})
