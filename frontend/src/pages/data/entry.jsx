import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles/common.css'
import '../../styles/data.css'
import DataPage from './DataPage.jsx'
import { getAuth, getProject } from '../../lib/storage.js'

// 가드 2개 — 기존 바닐라 data.html 인라인 스크립트와 동일.
// ① 미로그인 → 로그인으로  ② 프로젝트 미선택 → 프로젝트 선택으로.
if (!getAuth()?.token) {
  location.replace('login.html')
} else if (!getProject()) {
  location.replace('projects.html')
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <DataPage />
    </StrictMode>,
  )
}
