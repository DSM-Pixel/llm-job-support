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
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        query: resolve(__dirname, 'query.html'),
        rag: resolve(__dirname, 'rag.html'),
        pubdata: resolve(__dirname, 'pubdata.html'),
        labeling: resolve(__dirname, 'labeling.html'),
        report: resolve(__dirname, 'report.html'),
        data: resolve(__dirname, 'data.html'),
        agent: resolve(__dirname, 'agent.html'),
        admin: resolve(__dirname, 'admin.html'),
        reset: resolve(__dirname, 'reset.html'),
      },
    },
  },
})
