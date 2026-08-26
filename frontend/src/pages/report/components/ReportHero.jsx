import { TYPES } from '../reportTypes.js'

// 로컬 기준 YYYY-MM-DD(ReportPage 의 fmtDate 와 동일 — 기간 프리셋 계산용).
const fmtDate = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

// 기간 빠른 선택 — 눌러도 시작/종료 입력은 그대로 남아 직접 조정할 수 있다.
const PERIODS = [
  { label: '이번주', range: () => [fmtDate(new Date(Date.now() - 7 * 86400000)), fmtDate(new Date())] },
  {
    label: '이번달',
    range: () => {
      const now = new Date()
      return [fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), fmtDate(now)]
    },
  },
  {
    label: '이번분기',
    range: () => {
      const now = new Date()
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3
      return [fmtDate(new Date(now.getFullYear(), qStartMonth, 1)), fmtDate(now)]
    },
  },
]

// 상단 히어로 — 보고서 유형·기간·첨부 예정 자료를 칩으로 고르고 바로 초안을 만든다.
// 자료 추가(내 작업 가져오기·사진 첨부·양식 삽입)는 아래 ReportControls 패널이 맡는다.
export default function ReportHero({
  activeIndex,
  onSelectType,
  start,
  end,
  onStart,
  onEnd,
  reportItems,
  onGenerate,
  busy,
}) {
  const applyPeriod = (range) => {
    const [s, e] = range()
    onStart(s)
    onEnd(e)
  }

  return (
    <>
      {/* 검은 박스에는 설명(제목)만 — 입력 폼·버튼은 아래 밝은 패널로 내렸다. */}
      <div className="px-hero plain rp-hero">
        <p className="rp-eyebrow">REPORT BUILDER</p>
        <h2>
          간단한 명령어로
          <br />
          <span className="accent">보고서 작성하기</span>
        </h2>
        <p className="rp-hero-desc">
          기간과 양식만 고르면, 내 활동·검색 결과·첨부 자료를 모아 AI가 제출용 초안을 자동으로
          작성합니다. 아래에서 옵션을 정하고 <b>‘초안 만들기’</b>를 눌러보세요.
        </p>
        <ul className="rp-hero-points">
          <li>활동 요약·통계 표 자동 집계</li>
          <li>근거 자료(사진·문서 검색) 함께 첨부</li>
          <li>복사 · PDF · DOCX 내보내기</li>
        </ul>
      </div>

      <div className="rp-form card">
        <div className="rp-hero-controls">
        <div className="rp-control-group">
          <span className="rp-control-label">보고서 양식</span>
          <div className="rp-chip-row">
            {TYPES.map((t, i) => (
              <button
                key={t}
                type="button"
                className={'pill' + (i === activeIndex ? ' active' : '')}
                onClick={() => onSelectType(i)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="rp-control-group">
          <span className="rp-control-label">기간</span>
          <div className="rp-chip-row">
            {PERIODS.map((p) => {
              const [s, e] = p.range()
              const active = start === s && end === e
              return (
                <button
                  key={p.label}
                  type="button"
                  className={'pill' + (active ? ' active' : '')}
                  onClick={() => applyPeriod(p.range)}
                >
                  {p.label}
                </button>
              )
            })}
            <input
              type="date"
              className="rp-date-inline"
              value={start}
              onChange={(e) => onStart(e.target.value)}
            />
            <span className="rp-date-sep">~</span>
            <input type="date" className="rp-date-inline" value={end} onChange={(e) => onEnd(e.target.value)} />
          </div>
        </div>

        {reportItems.length > 0 && (
          <div className="rp-control-group">
            <span className="rp-control-label">자동 자료</span>
            <div className="rp-chip-row">
              {reportItems.slice(0, 4).map((it, i) => (
                <span className="pill rp-material-chip" key={i}>
                  {it.type === 'image' ? it.caption || '첨부 사진' : it.question || 'RAG 결과'}
                </span>
              ))}
              {reportItems.length > 4 && <span className="pill rp-material-chip">+{reportItems.length - 4}</span>}
            </div>
          </div>
        )}
      </div>

      <button
        className={'btn primary lg rp-generate' + (busy.active ? ' is-loading' : '')}
        type="button"
        disabled={busy.active}
        onClick={onGenerate}
      >
        {busy.active ? busy.text : '초안 만들기'}
      </button>
      </div>
    </>
  )
}
