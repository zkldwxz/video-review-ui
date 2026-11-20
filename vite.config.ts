import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { titleApi } from './server/title-api.ts'

export default defineConfig(({ mode }) => {
  // 第三个参数为空字符串：读取所有变量（包括不带 VITE_ 前缀的），只在服务端使用，不会打进前端
  const env = loadEnv(mode, import.meta.dirname, '')
  return {
    plugins: [react(), tailwindcss(), titleApi(env.ANTHROPIC_API_KEY)],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
