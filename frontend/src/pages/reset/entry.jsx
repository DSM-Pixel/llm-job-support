import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles/common.css'
import '../../styles/login.css'
import ResetPage from './ResetPage.jsx'

// 이메일 링크(?token=...)로 진입해 새 비밀번호를 설정하는 독립 페이지 — 기존 reset.js 이관.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ResetPage />
  </StrictMode>,
)
