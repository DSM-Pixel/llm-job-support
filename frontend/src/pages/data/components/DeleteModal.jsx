import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ICONS } from '../dataApi.js'

// 데이터셋 삭제 확인 모달 — 삭제 전 한 번 더 묻는다(바닐라 confirmModal 그대로).
// Esc·오버레이·취소·✕ 로 닫히고, 삭제 버튼만 실제로 지운다.
export default function DeleteModal({ row, onConfirm, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const name = `${ICONS[row.kind] || '▱'}${row.name}`

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal">
        <header className="modal-head">
          <h3>데이터셋 삭제</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <p className="confirm-text">
            <b>{name}</b> 을(를) 삭제할까요?
            <br />이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn modal-cancel" type="button" onClick={onClose}>
            취소
          </button>
          <button className="btn danger confirm-delete" type="button" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
