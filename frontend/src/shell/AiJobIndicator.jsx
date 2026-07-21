import { useEffect, useState } from 'react'
import { activeJobs, ensurePoller } from '../lib/aijob.js'

// 상단바 전역 표시기 — 진행 중인 AI 백그라운드 작업이 있으면 어느 페이지에서든 보인다.
// 모든 페이지의 AppShell 에서 mount 되므로 여기서 poller 를 기동해 사이드바를 옮겨도
// 완료 감지/알림이 계속된다.
export default function AiJobIndicator() {
  const [jobs, setJobs] = useState(() => activeJobs())

  useEffect(() => {
    ensurePoller()
    const refresh = () => setJobs(activeJobs())
    window.addEventListener('aijob:change', refresh)
    window.addEventListener('aijob:done', refresh)
    window.addEventListener('aijob:error', refresh)
    const id = setInterval(refresh, 2000) // 다른 탭에서 시작된 job 대비 폴백
    return () => {
      window.removeEventListener('aijob:change', refresh)
      window.removeEventListener('aijob:done', refresh)
      window.removeEventListener('aijob:error', refresh)
      clearInterval(id)
    }
  }, [])

  if (!jobs.length) return null
  const label = jobs.length === 1 ? jobs[0].label : `AI 작업 ${jobs.length}건`
  return (
    <span className="ai-job-indicator" title="다른 메뉴로 이동해도 계속 진행됩니다">
      <span className="ai-job-dot" aria-hidden="true" />
      {label} 진행 중…
    </span>
  )
}
