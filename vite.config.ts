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
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库
          'vendor-react': ['react', 'react-dom'],
          // React Router
          'vendor-router': ['react-router-dom'],
          // UI 组件库
          'vendor-ui': [
            'framer-motion',
            'react-icons',
            'react-photo-view',
            'swiper',
            '@radix-ui/react-tooltip',
            'react-toastify',
          ],
          // Markdown 相关
          'vendor-markdown': [
            'react-markdown',
            'remark-gfm',
            'remark-breaks',
            'github-markdown-css',
          ],
          // Unity WebGL
          'vendor-unity': ['react-unity-webgl'],
          // 工具库
          'vendor-utils': [
            'axios',
            'jszip',
            'js-md5',
            'swr',
            'use-debounce',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 将警告阈值提高到 1000 kB
  },
  server: {
    proxy: {
      '/api3': {
        target: 'https://maj-3.moyingmoe.top',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
