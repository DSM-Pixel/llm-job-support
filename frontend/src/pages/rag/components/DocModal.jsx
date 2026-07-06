import { useEffect } from 'react'

// 참고중인 파일 클릭 → 문서 내용 열람(모달). 바닐라 docModal 마크업/동작 재현.
export default function DocModal({ open, title, chunks, found, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header className="modal-head">
          <h3 className="doc-title">{title}</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="doc-body">
            {found ? (
              chunks.map((c, i) => (
                <p className="doc-chunk" key={i}>
                  <span className="doc-no">청크 {i + 1}</span>
                  {c}
                </p>
              ))
            ) : (
              <p className="doc-empty">이 문서는 본문이 색인되지 않았습니다(이름만 등록).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
