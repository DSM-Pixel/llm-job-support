import { relTime } from '../../../lib/time.js'

const REVIEW_TONE = { 대기: 'wait', 승인: 'ok', 반려: 'no' }

// ── 상세(소스 + 검수) ──
// canReview: 관리자(상사)일 때만 승인·반려·대기 버튼을 노출. 일반 사용자는 상태만 본다.
export default function DetailView({ project, onBack, onEnter, onAddSource, onReview, canReview }) {
  const p = project
  return (
    <section className="pj-detail">
      <div className="pj-detail-bar">
        <button className="pj-back" type="button" onClick={onBack}>
          ← 프로젝트 목록
        </button>
        <button className="btn primary pj-enter" type="button" onClick={() => onEnter(p)}>
          이 프로젝트로 들어가기 →
        </button>
      </div>
      <div className="pj-detail-head">
        <div className="pj-detail-title">
          <span className="pj-emoji">{p.emoji}</span>
          <h2>{p.name}</h2>
        </div>
        <div className="pj-progress-wrap">
          <span className="pj-progress-label">
            검수 {p.approved}/{p.source_count} · {p.progress}%
          </span>
          <div className="pj-progress">
            <span style={{ width: `${p.progress}%` }} />
          </div>
        </div>
      </div>
      <div className="pj-src-toolbar">
        <h3>소스 · 검수</h3>
        <button className="btn primary pj-add-src" type="button" onClick={onAddSource}>
          + 소스 추가
        </button>
      </div>
      <div className="pj-src-list">
        {(p.sources || []).length === 0 ? (
          <p className="pj-empty">아직 소스가 없습니다. ‘+ 소스 추가’로 데이터를 넣어보세요.</p>
        ) : (
          p.sources.map((s) => {
            const tone = REVIEW_TONE[s.review] || 'wait'
            const who = s.reviewer ? `${s.reviewer} · ${relTime(s.reviewed_at)}` : '미검수'
            const rvBtn = (st, label, cls) => (
              <button
                className={`pj-rv-btn ${cls}${s.review === st ? ' on' : ''}`}
                onClick={() => onReview(s.id, st)}
              >
                {label}
              </button>
            )
            return (
              <div className="pj-src" key={s.id}>
                <span className="pj-src-kind">{s.kind}</span>
                <div className="pj-src-main">
                  <b>{s.name}</b>
                  <small>검수자 {who}</small>
                </div>
                <span className={`pj-badge ${tone}`}>{s.review}</span>
                {canReview ? (
                  <div className="pj-rv-btns">
                    {rvBtn('승인', '승인', 'ok')}
                    {rvBtn('반려', '반려', 'no')}
                    {rvBtn('대기', '대기', 'wait')}
                  </div>
                ) : (
                  <span className="pj-rv-locked" title="검수는 관리자(상사)만 할 수 있습니다">
                    🔒 관리자 검수
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
