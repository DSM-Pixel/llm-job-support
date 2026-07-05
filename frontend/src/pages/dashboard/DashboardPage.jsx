import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api.js'
import { toast } from '../../lib/toast.js'
import AppShell from '../../shell/AppShell.jsx'
import { useShell } from '../../shell/ShellContext.js'
import StatGrid from './StatGrid.jsx'
import AgentCard from './AgentCard.jsx'
import ModelCard from './ModelCard.jsx'
import ActivityCard from './ActivityCard.jsx'

// 빠른 작업 버튼 → 이동 경로(순서 고정) — 기존 dashboard.js routes.
const QUICK = [
  { cls: 'quick-icon quick-search', icon: '⌕', text: '문서 지식 검색', route: 'rag.html' },
  { cls: 'quick-icon', icon: '⌗', text: '이미지 라벨링', route: 'labeling.html' },
  { cls: 'quick-icon', icon: '⇱', text: '보고서 생성', route: 'report.html' },
  { cls: 'quick-icon', icon: '☰', text: '자연어 질의', route: 'query.html' },
]

// 대시보드 본문 — 셸 컨텍스트가 필요해 AppShell 안쪽(자식)에서 렌더한다.
function DashboardContent() {
  const { settings } = useShell()
  const name = settings.name || '사용자'

  const [heroText, setHeroText] = useState('')
  const [models, setModels] = useState(null) // /api/dashboard 모델 상태
  const [serverActivity, setServerActivity] = useState([])

  // 오늘 날짜 — YYYY.M.D · 요일(ko-KR).
  const dateLabel = useMemo(() => {
    const today = new Date()
    const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(today)
    return `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()} · ${weekday}`
  }, [])

  // /api/dashboard — 모델 상태 + 서버 활동. 모델은 12초마다 폴링 갱신.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await api('/api/dashboard')
        if (!alive) return
        if (data.models) setModels(data.models)
        if (data.activity && data.activity.length) setServerActivity(data.activity)
      } catch {
        /* 서버 미연결 시 기본값 유지 */
      }
    })()
    const id = setInterval(async () => {
      try {
        const d = await api('/api/dashboard')
        if (alive && d.models) setModels(d.models)
      } catch {
        /* 일시적 실패는 무시 */
      }
    }, 12000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  // 히어로 질문 — 자연어 질의로 보내면 거기서 자동 분류·연계.
  const heroAsk = () => {
    const q = heroText.trim()
    if (!q) return toast('질문을 입력해주세요')
    window.location.href = `query.html?q=${encodeURIComponent(q)}`
  }

  return (
    <section className="content dashboard">
      <div className="hero-row">
        <div>
          <p className="date">{dateLabel}</p>
          <h2>
            안녕하세요, <span className="user-greet">{name}</span>님 — 무엇을 도와드릴까요?
          </h2>
        </div>
      </div>
      <div className="hero-ask">
        <input
          className="hero-ask-input"
          type="text"
          placeholder="자연어로 질문하세요 — 질문에 맞는 기능(문서 검색·이미지 분석·통계)으로 알아서 연결합니다"
          value={heroText}
          onChange={(e) => setHeroText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && heroAsk()}
        />
        <button className="btn primary hero-ask-go" type="button" onClick={heroAsk}>
          → 질문하기
        </button>
      </div>

      <StatGrid />

      <section className="dashboard-grid">
        <AgentCard />

        <article className="card quick-card">
          <h3>빠른 작업</h3>
          <div className="quick-grid">
            {QUICK.map((q) => (
              <button key={q.route} onClick={() => (window.location.href = q.route)}>
                <span className={q.cls}>{q.icon}</span>
                <span>{q.text}</span>
              </button>
            ))}
          </div>
        </article>

        <ModelCard models={models} />

        <ActivityCard serverActivity={serverActivity} />
      </section>
    </section>
  )
}

export default function DashboardPage() {
  return (
    <AppShell title="메인 대시보드" activeNav="dashboard">
      <DashboardContent />
    </AppShell>
  )
}
