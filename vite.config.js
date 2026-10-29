import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Chuyển các request /api sang server Express khi chạy dev
    // proxy: { '/api': `http://192.168.1.126:${process.env.API_PORT || 4000}` },
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 4000}` },
  },
})
