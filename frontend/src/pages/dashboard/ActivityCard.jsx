import { useMemo } from 'react'
import { relTime } from '../../lib/time.js'
import { getActivity } from '../../lib/activity.js'
import { useShell } from '../../shell/ShellContext.js'

// 최근 활동 카드 — 기존 dashboard.js 재현.
// 실제 사용 기록(localStorage)이 있으면 그걸(최신 6개), 없으면 서버 활동, 둘 다 없으면 빈 상태.
const ACT_ICON = {
  '자연어 질의': '☰',
  'RAG 검색': '⌕',
  '문서 색인': '▱',
  '이미지 분석': '⌗',
  '라벨 저장': '⌗',
  '데이터 업로드': '▱',
}

// props: serverActivity — /api/dashboard 의 activity(부모가 전달)
export default function ActivityCard({ serverActivity = [] }) {
  const { openHistory } = useShell()
  const localActs = useMemo(() => getActivity(), [])

  let items = null
  if (localActs.length) {
    // 실제 내가 한 작업(최신 6개).
    items = localActs
      .slice(-6)
      .reverse()
      .map((a) => {
        const icon = ACT_ICON[a.type] || '•'
        const label = a.label ? ` — ${a.label}` : ''
        return { icon, text: a.type + label, meta: `${a.page || ''} · ${relTime(a.ts)}` }
      })
  } else if (serverActivity.length) {
    items = serverActivity.map((a) => ({ icon: a.icon, text: a.text, meta: a.meta }))
  }

  return (
    <article className="card activity-card">
      <div className="card-head">
        <h3>최근 활동</h3>
        <button
          className="card-link history-link"
          type="button"
          title="이 프로젝트의 전체 기록 보기·삭제"
          onClick={openHistory}
        >
          전체 기록 →
        </button>
      </div>
      <ul>
        {items ? (
          items.map((it, i) => (
            <li key={i}>
              <span className="activity-icon">{it.icon}</span>
              <b>{it.text}</b>
              <small>{it.meta}</small>
            </li>
          ))
        ) : (
          <li className="activity-empty">
            <small>
              아직 활동 기록이 없습니다. 질의·검색·라벨링을 시작하면 여기에 표시됩니다.
            </small>
          </li>
        )}
      </ul>
    </article>
  )
}
