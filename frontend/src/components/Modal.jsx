import { useState } from 'react'

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
      <div className="modal">
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
                  <select value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
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
