import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles/common.css'
import '../../styles/login.css'
import LoginPage from './LoginPage.jsx'

// 이미 로그인돼 있으면 바로 프로젝트 선택으로 — 기존 login.js 상단 가드와 동일.
let authed = false
try {
  authed = !!localStorage.getItem('gnsoft.auth')
} catch {
  /* 무시 */
}

if (authed) {
  location.replace('projects.html')
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <LoginPage />
    </StrictMode>,
  )
}
