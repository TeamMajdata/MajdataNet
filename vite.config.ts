import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// cdn.majdata.net 开了防盗链，Referer 为 localhost / 局域网 IP 时封面返回 403。
// 仅开发服务器（apply: 'serve'）注入 no-referrer；vite build 不会执行此插件，线上 index.html 不受影响。
const devNoReferrer: Plugin = {
  name: 'dev-no-referrer',
  apply: 'serve',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
  ],
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devNoReferrer],
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
      // 默认代理到线上；本地联调时设置 VITE_API_PROXY=http://127.0.0.1:34613，
      // 本地后端没有 /api3 前缀，需要去掉。
      '/api3': process.env.VITE_API_PROXY
        ? {
            target: process.env.VITE_API_PROXY,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api3/, ''),
          }
        : {
            target: 'https://majdata.net',
            changeOrigin: true,
            secure: true,
          },
    },
  },
})
