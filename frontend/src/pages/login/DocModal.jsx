import { DOCS } from './docs.js'

// ── 약관·개인정보 전문 모달 ──
// doc: null | 'terms' | 'privacy'. '동의하고 닫기' → 해당 동의 체크박스를 켠다.
export default function DocModal({ doc, onClose, onAgree }) {
  if (!doc) return null
  const d = DOCS[doc]
  return (
    <div
      className="modal-overlay"
      id="doc-modal"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal lg-doc-modal" role="dialog" aria-modal="true">
        <header className="modal-head">
          <h3 className="doc-title">{d.title}</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="doc-body">{d.body}</div>
        </div>
        <div className="modal-foot">
          <button className="btn primary doc-agree" type="button" onClick={() => onAgree(doc)}>
            동의하고 닫기
          </button>
        </div>
      </div>
    </div>
  )
}
