import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles/common.css'
import '../../styles/projects.css'
import ProjectsPage from './ProjectsPage.jsx'
import { getAuth } from '../../lib/storage.js'

// 인증 가드 — 기존 바닐라 projects.html 의 인라인 스크립트와 동일. 미로그인 시 로그인으로.
if (!getAuth()?.token) {
  location.replace('login.html')
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ProjectsPage />
    </StrictMode>,
  )
}
