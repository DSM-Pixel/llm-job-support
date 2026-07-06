import { useEffect } from 'react'

const fmtTs = (ts) => {
  try {
    return new Date(ts).toLocaleString('ko-KR')
  } catch {
    return ''
  }
}

// 아티팩트 상세 모달 — 사진 크게 보기 + 일시·결과·근거 등. 기존 report.js openArtDetail 재현.
export default function ArtifactModal({ art, onClose, onAdd }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const rows = [{ k: '일시', v: fmtTs(art.ts) }]
  if (art.page) rows.push({ k: '출처 화면', v: art.page })
  if (art.image && art.caption) rows.push({ k: '결과', v: art.caption })
  if (art.kind === 'rag') {
    if (art.question) rows.push({ k: '질문', v: art.question })
    if (art.answer) rows.push({ k: '도출', v: art.answer })
    if (art.source) rows.push({ k: '근거', v: art.source + (art.snippet ? ` — ${art.snippet}` : '') })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal art-modal">
        <header className="modal-head">
          <h3 className="art-title">{art.title || '자료'}</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="art-detail">
            {art.image && (
              <div className="art-image">
                <img src={art.image} alt={art.title || ''} />
              </div>
            )}
            <div className="art-rows">
              {rows.map((r, i) => (
                <div className="art-row" key={i}>
                  <span>{r.k}</span>
                  <b>{r.v}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn modal-cancel" type="button" onClick={onClose}>
            닫기
          </button>
          <button className="btn primary art-add" type="button" onClick={() => onAdd(art)}>
            보고서에 추가
          </button>
        </div>
      </div>
    </div>
  )
}
