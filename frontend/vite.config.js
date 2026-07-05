import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// 멀티페이지(MPA) — 기존 web/pages/*.html 를 한 페이지씩 React 로 이관한다.
// 파일럿: projects. dev 서버는 /api 를 로컬 FastAPI(uvicorn 기본 8000)로 프록시.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    rollupOptions: {
      input: {
        projects: resolve(__dirname, 'projects.html'),
      },
    },
  },
})
