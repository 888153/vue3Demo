import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8000, // 启动端口号
    open: true, // 是否启动就打开浏览器
    // 反向代理
    proxy: {
      '/api': {
        target: '192.168.110.232:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace('', ''),
      }
    },
  },
})
