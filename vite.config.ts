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
  build: {
    // 不再手动分块：页面已按路由 lazy 拆分，交给 Rollup 自动提取公共依赖。
    chunkSizeWarningLimit: 1000, // Live2D 运行时（l2d）单个 chunk 约 650 kB，按需加载
  },
  server: {
    port: 3000,
    proxy: {
      '/api3': {
        target: 'https://majdata.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
