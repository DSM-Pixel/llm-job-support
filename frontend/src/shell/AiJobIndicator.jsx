import { useEffect, useState } from 'react'
import { activeJobs, ensurePoller } from '../lib/aijob.js'
import { saveArtifact } from '../lib/activity.js'

// 상단바 전역 표시기 — 진행 중인 AI 백그라운드 작업이 있으면 어느 페이지에서든 보인다.
// 모든 페이지의 AppShell 에서 mount 되므로 여기서 poller 를 기동해 사이드바를 옮겨도
// 완료 감지/알림이 계속된다.
export default function AiJobIndicator() {
  const [jobs, setJobs] = useState(() => activeJobs())

  useEffect(() => {
    ensurePoller()
    const refresh = () => setJobs(activeJobs())
    // 폴더 라벨링 완료 → 각 사진을 '데이터 관리' 작업물(라벨)로 저장. 항상 떠 있는
    // 표시기에서 처리하므로, 사용자가 라벨링 페이지를 떠나 있어도 결과가 남는다.
    const onDone = (e) => {
      refresh()
      if (e.detail?.kind !== 'labeling_batch') return
      const items = e.detail.result?.items || []
      items.forEach((it) => {
        if (!it?.count) return
        saveArtifact({
          kind: 'image',
          cat: '라벨',
          id: it.name,
          title: `라벨링 · ${it.name}`,
          image: it.thumb || '',
          caption: `라벨 ${it.count}개${it.classes?.length ? ` · ${it.classes.join(', ')}` : ''}`,
        })
      })
    }
    window.addEventListener('aijob:change', refresh)
    window.addEventListener('aijob:done', onDone)
    window.addEventListener('aijob:error', refresh)
    const id = setInterval(refresh, 2000) // 다른 탭에서 시작된 job 대비 폴백
    return () => {
      window.removeEventListener('aijob:change', refresh)
      window.removeEventListener('aijob:done', onDone)
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
