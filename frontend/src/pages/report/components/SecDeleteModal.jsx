import { useEffect } from 'react'

// 섹션 삭제 확인 모달 — 기존 report.js secConfirm 재현.
// 되돌릴 수 없으니 섹션 이름을 보여주고 한 번 더 묻는다.
export default function SecDeleteModal({ name, onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal confirm-modal">
        <header className="modal-head">
          <h3>섹션 삭제</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onCancel}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <p className="confirm-text">
            ‘{name}’ 섹션을 삭제하시겠습니까?
            <br />이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn modal-cancel" type="button" onClick={onCancel}>
            취소
          </button>
          <button className="btn danger confirm-delete" type="button" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
