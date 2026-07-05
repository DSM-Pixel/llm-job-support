import { useEffect, useState } from 'react'

// 모델 상태 카드 — 기존 dashboard.js renderModels/openModelDetail 재현.
// 모델 상태(models)는 부모가 /api/dashboard 로 받아 12초마다 폴링해 내려준다.
// null 이면 로딩 placeholder, 행 클릭 시 사용 현황 상세.

// 사용 현황 상세 모달 — 바닐라 openModelDetail 의 mm-row/mm-bar 마크업 재현.
function ModelDetailModal({ model, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header className="modal-head">
          <h3 className="mm-title">{model.name} · 사용 현황</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="mm-body">
            {(model.detail || []).map((d, i) => {
              if (d.note) return <p className="mm-note" key={i}>{d.note}</p>
              if (typeof d.pct === 'number') {
                const lvl = d.pct >= 90 ? ' crit' : d.pct >= 70 ? ' warn' : ''
                return (
                  <div className="mm-row mm-bar-row" key={i}>
                    <div className="mm-bar-top">
                      <span>{d.k}</span>
                      <b>{d.v}</b>
                    </div>
                    <i className={'mm-bar' + lvl}>
                      <span style={{ width: `${Math.min(100, d.pct)}%` }}></span>
                    </i>
                  </div>
                )
              }
              return (
                <div className="mm-row" key={i}>
                  <span>{d.k}</span>
                  <b>{d.v}</b>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ModelCard({ models }) {
  const [detail, setDetail] = useState(null)

  return (
    <article className="card model-card">
      <div className="card-head">
        <h3>모델 상태</h3>
      </div>
      {models === null ? (
        <p className="model-loading">불러오는 중…</p>
      ) : (
        models.map((m, i) => (
          <div
            className={'model-row' + (m.detail ? ' model-row-click' : '')}
            data-idx={i}
            key={i}
            title={m.detail ? '클릭하면 사용 현황 상세' : undefined}
            onClick={() => m.detail && setDetail(m)}
          >
            <span className={'dot ' + m.tone}></span>
            <div>
              <b>{m.name}</b>
              {m.detail && <small className="model-more">탭하여 사용 현황 보기 ›</small>}
            </div>
            <i className={m.tone === 'orange' ? 'orange' : undefined}>
              <span style={{ width: `${m.load}%` }}></span>
            </i>
            <em className={'status ' + m.tone}>{m.state}</em>
          </div>
        ))
      )}
      {detail && <ModelDetailModal model={detail} onClose={() => setDetail(null)} />}
    </article>
  )
}
