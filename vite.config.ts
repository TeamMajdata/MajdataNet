import { defineConfig, type Plugin, type ProxyOptions } from 'vite'
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

// 手机用局域网 IP（http）打开开发服务器时，有两处要在代理里处理：
// - CDN 的 CORS 只放行 localhost 和线上域名，API 302 跳到 CDN 的谱面、音乐会被拦下：
//   把跳转改写成同源的 /__cdn，再由下面的代理转发
// - 登录 Cookie 带 Secure，http 的局域网地址不算安全环境，浏览器会直接丢掉，登录后还是游客：
//   去掉 Secure / Domain，SameSite=None 离不开 Secure，一并改成 Lax（同源请求够用）
const CDN_ORIGIN = 'https://cdn.majdata.net'
const CDN_PATH = '/__cdn'
const devProxyResponse: ProxyOptions['configure'] = (proxy) => {
  proxy.on('proxyRes', (res) => {
    const location = res.headers.location
    if (location?.startsWith(CDN_ORIGIN + '/')) res.headers.location = CDN_PATH + location.slice(CDN_ORIGIN.length)
    const cookies = res.headers['set-cookie']
    if (cookies) {
      res.headers['set-cookie'] = cookies.map((cookie) => cookie
        .replace(/;\s*secure\b/gi, '')
        .replace(/;\s*domain=[^;]*/gi, '')
        .replace(/;\s*samesite=none\b/gi, '; SameSite=Lax'))
    }
  })
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
            configure: devProxyResponse,
          }
        : {
            target: 'https://majdata.net',
            changeOrigin: true,
            secure: true,
            configure: devProxyResponse,
          },
      [CDN_PATH]: {
        target: CDN_ORIGIN,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.slice(CDN_PATH.length),
        // CDN 有防盗链：不带页面的 Referer（vite preview 的页面没有开发时注入的 no-referrer）
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('referer')),
      },
    },
  },
})
