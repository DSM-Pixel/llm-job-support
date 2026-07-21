import { useEffect, useState } from 'react'
import { activeJobs, ensurePoller } from '../lib/aijob.js'
import { saveArtifact } from '../lib/activity.js'
import { getProject } from '../lib/storage.js'
import { updateBoxes } from '../lib/imagedb.js'
import { labelsToBoxes } from '../pages/labeling/labelingApi.js'

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
      const project = (getProject() || {}).id || 'none'
      items.forEach((it) => {
        if (!it?.count) return
        // 데이터 관리 작업물(라벨) 저장.
        saveArtifact({
          kind: 'image',
          cat: '라벨',
          id: it.name,
          title: `라벨링 · ${it.name}`,
          image: it.thumb || '',
          caption: `라벨 ${it.count}개${it.classes?.length ? ` · ${it.classes.join(', ')}` : ''}`,
        })
        // 캔버스 박스를 IndexedDB 에 저장 → 라벨링 페이지 복귀 시 원본+박스 복원.
        if (it.labels?.length) updateBoxes(project, it.name, labelsToBoxes(it))
      })
      // 라벨링 페이지 결과 갤러리를 sessionStorage 에 보관 — 항상 떠 있는 이 컴포넌트가 저장하므로
      // 사용자가 라벨링 페이지를 떠나 있는 동안 완료돼도 복귀 시 결과가 보인다.
      try {
        sessionStorage.setItem(
          'gnsoft.labeling.lastbatch',
          JSON.stringify(items.filter((it) => it?.count)),
        )
      } catch {
        /* 용량 초과 등 무시 */
      }
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
