import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import AppShell from '../../shell/AppShell.jsx'
import { useShell } from '../../shell/ShellContext.js'
import { relTime } from '../../lib/time.js'
import { getActivity } from '../../lib/activity.js'
import { activeJobs, ensurePoller } from '../../lib/aijob.js'
import { DEMO_FIXTURES } from '../../lib/demo.js'

// 홈 상단 KPI — 시연용 예시 수치(DEMO_FIXTURES=true)일 때만 값을 채우고,
// 꺼져 있으면 실데이터가 붙기 전까지 '—' 로 비워 둔다(가짜 수치 노출 방지).
const STATS = DEMO_FIXTURES
  ? [
      { label: '올린 사진', value: '128' },
      { label: '만든 라벨', value: '341' },
      { label: '검수 남은 사진', value: '49' },
      { label: '검수 진행률', value: '62%', accent: true, bar: 62 },
    ]
  : [
      { label: '올린 사진', value: '—' },
      { label: '만든 라벨', value: '—' },
      { label: '검수 남은 사진', value: '—' },
      { label: '검수 진행률', value: '—', accent: true },
    ]

// 도로 파손 클래스 칩 — 목업의 색 리듬(진하게/바이올렛/뮤트)을 그대로 반복.
const CLASS_CHIPS = [
  { label: '포트홀', cls: 'on' },
  { label: '균열', cls: 'v' },
  { label: '침하' },
  { label: '단차', cls: 'on' },
  { label: '마모', cls: 'v' },
  { label: '박리' },
  { label: '파임', cls: 'on' },
  { label: '융기', cls: 'v' },
  { label: '표지판' },
  { label: '차선' },
  { label: '맨홀', cls: 'v' },
  { label: '배수구' },
  { label: '가드레일' },
  { label: '중앙선', cls: 'v' },
  { label: '보도블록' },
  { label: '이물질' },
  { label: '노면' },
]

// 이어서 하던 작업 — 진행 중이던 라벨링/검수/보고서 초안(데모 고정값).
const CONTINUE_ITEMS = [
  { icon: '⌘', v: true, title: 'IMG_0421.jpg', sub: '라벨 5개 중 1개를 검수했어요', time: '12분 전' },
  { icon: '▥', title: 'IMG_0398.jpg', sub: '라벨 3개가 검수를 기다려요', time: '1시간 전' },
  { icon: '▢', title: '8월 활동 요약', sub: '초안 2개 섹션까지 썼어요', time: '3시간 전' },
]

// 다양한 작업 시작하기 — 기존 QUICK/업무 자동화 카드가 하던 이동 역할을 이어받는다.
const TASKS = [
  { icon: '⌘', title: '사진 라벨링', desc: '한국어로 지시하면 AI가 박스를 그려요', route: 'labeling.html', feature: true },
  { icon: '▥', title: '사진 설명 받기', desc: '무엇이 위험한지 문장으로 알려줘요', route: 'photo.html' },
  { icon: '⌕', title: '문서에 물어보기', desc: '근거가 없으면 없다고 답해요', route: 'rag.html' },
  { icon: '▦', title: '공공데이터 보기', desc: '표를 뒤지지 않고 물어서 확인해요', route: 'pubdata.html' },
  { icon: '⛓', title: '업무 절차 만들기', desc: '목표만 적으면 순서를 세워줘요', route: 'workflow.html' },
  { icon: '▢', title: '보고서 만들기', desc: '기간만 고르면 초안이 나와요', route: 'report.html' },
]

// 진행 중 AI 작업이 없을 때 보여줄 데모 행(목업 그대로) — 실제 작업이 있으면 그걸 우선한다.
const DEMO_JOBS = [
  { label: '폴더 일괄 라벨링 128장', sub: '도로 점검 · 사진 라벨링', pct: 64 },
  { label: '데이터셋 내보내기', sub: '도로 점검 · YOLO 형식', pct: 100 },
]

const ACT_ICON_TEXT = {
  '자연어 질의': 'IMG_0421.jpg 라벨 5개 저장',
  'RAG 검색': '보수 기준 문서 검색',
}

// 대시보드 본문 — 셸 컨텍스트가 필요해 AppShell 안쪽(자식)에서 렌더한다.
function DashboardContent() {
  const { openHistory } = useShell()
  const [serverActivity, setServerActivity] = useState([])
  const [jobs, setJobs] = useState(() => activeJobs())
  const [jobProgress, setJobProgress] = useState({})

  // /api/dashboard — 서버 활동(최근 활동 카드). 실패해도 localStorage 기록으로 대체된다.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await api('/api/dashboard')
        if (alive && data.activity && data.activity.length) setServerActivity(data.activity)
      } catch {
        /* 서버 미연결 시 로컬 기록만 사용 */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 진행 중 AI 작업 — 전역 poller(aijob.js) 이벤트를 구독해 실시간으로 반영.
  useEffect(() => {
    ensurePoller()
    const refresh = () => setJobs(activeJobs())
    const onProgress = (e) => {
      const { kind, progress } = e.detail || {}
      if (kind && progress != null) setJobProgress((p) => ({ ...p, [kind]: progress }))
    }
    window.addEventListener('aijob:change', refresh)
    window.addEventListener('aijob:done', refresh)
    window.addEventListener('aijob:error', refresh)
    window.addEventListener('aijob:progress', onProgress)
    return () => {
      window.removeEventListener('aijob:change', refresh)
      window.removeEventListener('aijob:done', refresh)
      window.removeEventListener('aijob:error', refresh)
      window.removeEventListener('aijob:progress', onProgress)
    }
  }, [])

  const go = (route) => {
    window.location.href = route
  }

  // 최근 활동 — 실제 기록(localStorage) 우선, 없으면 서버 활동, 둘 다 없으면 데모 3건.
  const localActs = getActivity()
  let activityRows
  if (localActs.length) {
    activityRows = localActs
      .slice(-4)
      .reverse()
      .map((a) => ({
        text: (ACT_ICON_TEXT[a.type] || a.type) + (a.label ? ` — ${a.label}` : ''),
        sub: a.page || '',
        time: relTime(a.ts),
      }))
  } else if (serverActivity.length) {
    activityRows = serverActivity.slice(0, 4).map((a) => ({ text: a.text, sub: a.page || '', time: a.meta }))
  } else if (DEMO_FIXTURES) {
    activityRows = [
      { text: 'IMG_0421.jpg 라벨 5개 저장', sub: '사진 라벨링', time: '12분 전' },
      { text: '폴더 일괄 라벨링 128장 시작', sub: '사진 라벨링', time: '1시간 전' },
      { text: '보수 기준 문서 검색', sub: '문서 검색', time: '3시간 전' },
    ]
  } else {
    activityRows = []
  }

  const jobRows = jobs.length
    ? jobs.map((j) => ({ label: j.label, sub: j.page || '', pct: jobProgress[j.kind] ?? 50 }))
    : DEMO_FIXTURES
      ? DEMO_JOBS
      : []

  return (
    <section className="content dashboard">
      <div className="px-hero">
        <div>
          <h2>
            더 안전한 도로
            <br />
            <span className="accent">데이터</span>로 만듭니다
          </h2>
          <p className="px-hero-sub">자연어 질의로 이미지를 라벨링하는 멀티모달 AI 서비스입니다.</p>
          <div className="px-hero-actions">
            <button className="btn primary lg" type="button" onClick={() => go('labeling.html')}>
              라벨링 시작하기 →
            </button>
            <button className="btn lg" type="button" onClick={() => go('report.html')}>
              보고서 만들기
            </button>
          </div>
        </div>
        <div className="px-gradient px-hero-preview">
          <div className="px-hero-preview-center">
            <span className="px-hero-preview-mark">+</span>
            <b>드래그해서 박스를 그려보세요</b>
            <span>AI가 무엇인지 알아맞혀요</span>
          </div>
          <div className="px-hero-preview-foot">
            <span className="px-hero-preview-hint">작업 해보세요</span>
            <div className="px-hero-preview-bars">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>

      <div className="px-classchips">
        {CLASS_CHIPS.map((c) => (
          <span className={'cc' + (c.cls ? ` ${c.cls}` : '')} key={c.label}>
            {c.label}
          </span>
        ))}
      </div>

      <div className="px-stats">
        {STATS.map((s) => (
          <div className="px-stat" key={s.label}>
            <p className="px-stat-label">{s.label}</p>
            <div className={'px-stat-value' + (s.accent ? ' accent' : '')}>{s.value}</div>
            {s.bar != null && (
              <div className="px-stat-bar">
                <span style={{ width: `${s.bar}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* "이어서 하던 작업"은 시연용 예시 데이터라 DEMO_FIXTURES 일 때만 노출한다. */}
      {DEMO_FIXTURES && (
        <>
          <div className="px-section-head">
            <h3>
              이어서 하던 작업 <span className="count">{CONTINUE_ITEMS.length}개</span>
            </h3>
          </div>
          <div className="px-continue">
            {CONTINUE_ITEMS.map((it) => (
              <div className="px-continue-row" key={it.title}>
                <span className={'px-continue-ic' + (it.v ? ' v' : '')}>{it.icon}</span>
                <div className="px-continue-body">
                  <b>{it.title}</b>
                  <span>{it.sub}</span>
                </div>
                <span className="px-continue-time">{it.time}</span>
                <span className="px-continue-go">↗</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="px-section-head">
        <h3>다양한 작업 시작하기</h3>
      </div>
      <div className="px-taskgrid">
        {TASKS.map((t) => (
          <button
            key={t.route}
            type="button"
            className={'px-taskcard' + (t.feature ? ' feature' : '')}
            onClick={() => go(t.route)}
          >
            <span className="px-taskcard-ic">{t.icon}</span>
            <span className="px-taskcard-go">↗</span>
            <h4>{t.title}</h4>
            <p>{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="px-2col">
        <section>
          <div className="px-section-head">
            <h3>진행 중인 AI 작업</h3>
          </div>
          <div className="px-joblist">
            {jobRows.length === 0 ? (
              <p className="px-empty">진행 중인 AI 작업이 없어요.</p>
            ) : (
              jobRows.map((j, i) => (
                <div className="px-job" key={i}>
                  <div className="px-job-top">
                    <b>{j.label}</b>
                    <span className={j.pct >= 100 ? 'done' : undefined}>
                      {j.pct >= 100 ? '완료' : `${j.pct}%`}
                    </span>
                  </div>
                  <div className="px-job-bar">
                    <span style={{ width: `${Math.min(100, j.pct)}%` }} />
                  </div>
                  {j.sub && <p className="px-job-sub">{j.sub}</p>}
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="px-section-head">
            <h3>최근 활동</h3>
            <button className="px-section-aside" type="button" onClick={openHistory}>
              전체 기록 →
            </button>
          </div>
          {activityRows.length === 0 ? (
            <p className="px-empty">최근 활동이 아직 없어요.</p>
          ) : (
            <ul className="px-actlist">
              {activityRows.map((a, i) => (
                <li className="px-act-row" key={i}>
                  <span className="px-act-dot" />
                  <div className="px-act-body">
                    <b>{a.text}</b>
                    <span>{a.sub}</span>
                  </div>
                  <span className="px-act-time">{a.time}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="px-bottomcta">
        <button className="btn primary grow" type="button" onClick={() => go('labeling.html')}>
          사진 올려서 라벨링 시작하기
        </button>
      </div>
    </section>
  )
}

export default function DashboardPage() {
  return (
    <AppShell activeNav="dashboard">
      <DashboardContent />
    </AppShell>
  )
}
