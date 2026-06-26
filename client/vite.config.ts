import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:1500'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      proxy: {
        '/v1/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiProxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
