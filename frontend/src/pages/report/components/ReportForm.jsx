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

// 입력 폼 패널 — 보고서 유형·기간·첨부 예정 자료 칩 + 초안 만들기. 분할 레이아웃의 오른쪽 사이드.
export default function ReportForm({
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
  )
}
