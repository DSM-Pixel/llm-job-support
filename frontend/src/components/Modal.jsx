import { useEffect, useRef, useState } from 'react'

// 커스텀 셀렉트 — 네이티브 <select> 대신 앱 콤보박스(.field-combo)와 동일한 드롭다운을
// 밑으로 띄운다(둥근 모서리·그림자·파란 호버). TeamCombo 와 UI 통일.
function SelectField({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])
  return (
    <div className="field-combo" ref={boxRef}>
      <button
        type="button"
        className="field-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value}</span>
        <svg className="field-select-caret" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="field-combo-list" hidden={!open} role="listbox">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="option"
            aria-selected={o === value}
            className={'field-combo-item' + (o === value ? ' is-sel' : '')}
            onClick={() => {
              onChange(o)
              setOpen(false)
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

// 입력 모달 — 프로젝트/소스 생성 등 공용.
// fields: [{ name, label, type?: 'text'|'select', options?, placeholder?, default?, autoFocus? }]
export function InputModal({ title, fields, onSubmit, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      fields.map((f) => [f.name, f.default ?? (f.type === 'select' ? f.options[0] : '')]),
    ),
  )
  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }))
  const submit = () =>
    onSubmit(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v).trim()])))

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal input-modal">
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="modal-form">
            {fields.map((f) => (
              <label className="field" key={f.name}>
                {f.label}
                {f.type === 'select' ? (
                  <SelectField
                    value={values[f.name]}
                    options={f.options}
                    onChange={(v) => set(f.name, v)}
                  />
                ) : (
                  <input
                    type="text"
                    value={values[f.name]}
                    placeholder={f.placeholder || ''}
                    autoFocus={f.autoFocus}
                    onChange={(e) => set(f.name, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn modal-cancel" type="button" onClick={onClose}>
            취소
          </button>
          <button className="btn primary modal-ok" type="button" onClick={submit}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// 삭제 확인 모달 — 기존 confirmAction 과 동일 마크업/클래스(제목 "영구 삭제", 위험 버튼 "삭제").
export function ConfirmModal({ messageHtml, onConfirm, onClose }) {
  return (
    <div
      className="modal-overlay confirm-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal confirm-modal">
        <header className="modal-head">
          <h3>영구 삭제</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <p className="confirm-text" dangerouslySetInnerHTML={{ __html: messageHtml }} />
        </div>
        <div className="modal-foot">
          <button className="btn modal-cancel" type="button" onClick={onClose}>
            취소
          </button>
          <button className="btn danger confirm-ok" type="button" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
