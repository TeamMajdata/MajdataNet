import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    // Node 25+ 默认开启实验性 Web Storage，其全局 localStorage 会遮住 jsdom 的实现
    // （没有 --localstorage-file 时取值为 undefined）。在 worker 里关掉它。
    execArgv: ['--no-experimental-webstorage'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
})
