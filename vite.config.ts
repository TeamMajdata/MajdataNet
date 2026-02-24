import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // 代理所有 /api1, /api2, /api3 请求到 majdata.net
      '/api1': {
        target: 'https://majdata.net',
        changeOrigin: true,
        secure: true,
      },
      '/api2': {
        target: 'https://majdata.net',
        changeOrigin: true,
        secure: true,
      },
      '/api3': {
        target: 'https://majdata.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
