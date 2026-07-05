import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { authToken, getProject } from '../../lib/storage.js'
import { getActivity, getArtifacts } from '../../lib/activity.js'

// 상단 통계 4카드 — 기존 dashboard.js 의 syncOnce → renderServerStats → renderRealStats 흐름 재현.
// 서버 통계(다기기 합산·Redis) 우선, 실패 시 localStorage 폴백. 값은 count-up 애니메이션.

const pid = () => (getProject() ? getProject().id : '') || 'none'

// 숫자를 24프레임에 걸쳐 세어 올리는 애니메이션 — 바닐라 countUp 과 동일.
function StatValue({ text }) {
  const [disp, setDisp] = useState(text)
  useEffect(() => {
    const raw = String(text).replace(/,/g, '')
    const target = Number.parseFloat(raw)
    if (Number.isNaN(target)) {
      setDisp(text)
      return
    }
    const suffix = String(text).includes('%') ? '%' : ''
    let frame = 0
    let raf
    const tick = () => {
      frame += 1
      const next = target * Math.min(frame / 24, 1)
      setDisp(Math.round(next).toLocaleString('ko-KR') + suffix)
      if (frame < 24) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [text])
  return disp
}

// 증감 배지 — delta>0이면 상승(↗), 0이면 표시 안 함, 음수면 하락(↘). 바닐라 deltaBadge.
function DeltaBadge({ delta, unit = '' }) {
  if (!delta) return null
  const up = delta > 0
  return (
    <em className={up ? 'up' : 'down'}>
      {up ? '↗' : '↘'} {up ? '+' : ''}
      {delta}
      {unit}
    </em>
  )
}

function StatCard({ icon, value, label, sub, delta }) {
  return (
    <article className="card stat-card">
      <span className="icon-box">{icon}</span>
      <DeltaBadge delta={delta} />
      <strong>
        <StatValue text={value} />
      </strong>
      <p>{label}</p>
      <small>{sub}</small>
    </article>
  )
}

// 서버 통계 우선 시도 — 성공 시 카드 배열 반환, 실패/미인증 시 null.
const fetchServerStats = async () => {
  const token = authToken()
  if (!token) return null
  let s
  try {
    s = await api('/api/dashboard/stats', { token, project: pid() })
  } catch {
    return null
  }
  if (!s || !s.ok) return null
  return [
    { icon: '▱', value: (s.files || 0).toLocaleString(), label: '색인 문서·소스', sub: `청크 ${(s.chunks || 0).toLocaleString()}개` },
    { icon: '⬡', value: (s.images || 0).toLocaleString(), label: '라벨·분석 작업물', sub: `RAG 결과 ${s.rag_results || 0}건`, delta: s.img_week || 0 },
    { icon: '⌁', value: (s.today || 0).toLocaleString(), label: '오늘 처리 작업', sub: '어제 대비', delta: (s.today || 0) - (s.yesterday || 0) },
    { icon: '◷', value: (s.total || 0).toLocaleString(), label: '총 활동 기록', sub: '최근 7일', delta: s.week || 0 },
  ]
}

// localStorage 폴백 통계 — 현재 프로젝트 기준 실집계 + RAG 색인 문서·청크(API).
const fetchRealStats = async () => {
  const acts = getActivity()
  const arts = getArtifacts()
  const now = Date.now()
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const d0 = dayStart.getTime()
  const yStart = d0 - 86400000
  const weekAgo = now - 7 * 86400000

  const todayCnt = acts.filter((a) => a.ts >= d0).length
  const yesterdayCnt = acts.filter((a) => a.ts >= yStart && a.ts < d0).length
  const week = acts.filter((a) => a.ts >= weekAgo).length
  const imgArts = arts.filter((a) => a.kind === 'image')
  const ragArts = arts.filter((a) => a.kind === 'rag').length
  const imgWeek = imgArts.filter((a) => (a.ts || 0) >= weekAgo).length

  let files = 0
  let chunks = 0
  try {
    const p = getProject() ? getProject().id : ''
    const r = await api(`/api/rag/files?project=${encodeURIComponent(p)}`)
    files = (r.files || []).length
    chunks = (r.files || []).reduce((sum, f) => sum + (f.chunks || 0), 0)
  } catch {
    /* 서버 미연결 시 0 */
  }

  return [
    { icon: '▱', value: files.toLocaleString(), label: '색인 문서·소스', sub: `청크 ${chunks.toLocaleString()}개` },
    { icon: '⬡', value: imgArts.length.toLocaleString(), label: '라벨·분석 작업물', sub: `RAG 결과 ${ragArts}건`, delta: imgWeek },
    { icon: '⌁', value: todayCnt.toLocaleString(), label: '오늘 처리 작업', sub: '어제 대비', delta: todayCnt - yesterdayCnt },
    { icon: '◷', value: acts.length.toLocaleString(), label: '총 활동 기록', sub: '최근 7일', delta: week },
  ]
}

// 기존 localStorage 기록을 서버로 1회 이관(프로젝트별) — 서버 통계 전환 시 데이터 유실 방지.
const syncOnce = async () => {
  const token = authToken()
  if (!token) return
  const flag = `gnsoft.synced.${pid()}`
  if (localStorage.getItem(flag)) return
  try {
    await api('/api/activity/sync', {
      token,
      project: pid(),
      activities: getActivity(),
      artifacts: getArtifacts().map((a) => ({
        ts: a.ts,
        id: a.id,
        kind: a.kind,
        title: a.title || a.name || '',
        page: a.page,
      })),
    })
    localStorage.setItem(flag, '1')
  } catch {
    /* 서버 미연결 시 다음 방문에 재시도 */
  }
}

// 로딩 placeholder — 기존 dashboard.html 의 초기 4카드.
const PLACEHOLDER = [
  { icon: '▱', label: '색인 문서·소스' },
  { icon: '⬡', label: '라벨·분석 작업물' },
  { icon: '⌁', label: '오늘 처리 작업' },
  { icon: '◷', label: '총 활동 기록' },
]

export default function StatGrid() {
  const [cards, setCards] = useState(null) // null = 로딩

  useEffect(() => {
    let alive = true
    ;(async () => {
      await syncOnce()
      let data = await fetchServerStats()
      if (!data) data = await fetchRealStats()
      if (alive && data) setCards(data)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!cards) {
    return (
      <section className="stat-grid">
        {PLACEHOLDER.map((c) => (
          <article className="card stat-card" key={c.label}>
            <span className="icon-box">{c.icon}</span>
            <strong>—</strong>
            <p>{c.label}</p>
            <small>불러오는 중</small>
          </article>
        ))}
      </section>
    )
  }

  return (
    <section className="stat-grid">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </section>
  )
}
