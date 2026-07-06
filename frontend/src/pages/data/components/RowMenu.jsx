import { useEffect } from 'react'
import { createPortal } from 'react-dom'

// ⋮ 행 메뉴 팝오버 — 바닐라 .row-pop 을 body 에 절대좌표로 띄운다.
// 바깥(팝오버·⋮버튼 밖) 클릭 시 닫힘. data-act 는 CSS(삭제=빨강)가 참조하므로 유지.
export default function RowMenu({ x, y, onAction, onClose }) {
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest('.row-pop') && !e.target.closest('.row-menu')) onClose()
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [onClose])

  return createPortal(
    <div className="row-pop" style={{ left: x, top: y }}>
      <button type="button" data-act="preview" onClick={() => onAction('preview')}>
        미리보기
      </button>
      <button type="button" data-act="edit" onClick={() => onAction('edit')}>
        이름 수정
      </button>
      <button type="button" data-act="delete" onClick={() => onAction('delete')}>
        삭제
      </button>
    </div>,
    document.body,
  )
}
