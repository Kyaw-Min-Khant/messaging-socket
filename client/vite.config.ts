import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/v1/api': {
        target: 'http://localhost:1500',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:1500',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
