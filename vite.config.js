import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Chuyển các request /api sang server Express khi chạy dev
    // proxy: { '/api': `http://192.168.1.126:${process.env.API_PORT || 4000}` },
    // changeOrigin: false giữ nguyên địa chỉ khách đang mở (VD http://192.168.1.127:5173 trên điện thoại)
    // để cổng thanh toán giả lập đưa khách về đúng địa chỉ đó thay vì localhost
    proxy: {
      '/api': { target: `http://localhost:${process.env.API_PORT || 4000}`, changeOrigin: false },
    },
  },
})
