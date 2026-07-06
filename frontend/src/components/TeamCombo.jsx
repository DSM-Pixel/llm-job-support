import { useEffect, useRef, useState } from 'react'

const norm = (s) => (s || '').replace(/\s+/g, '').toLowerCase()

// 모달·폼 어디서나 쓰는 팀 선택 콤보박스(스타일은 common.css .field-combo).
// teams 목록에서 고르거나, 없으면 그대로 입력해 새 팀으로 등록(자유 생성+선택).
export default function TeamCombo({ teams = [], value, onChange, placeholder = '팀을 고르거나 입력' }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const q = (value || '').trim()
  const filtered = teams.filter((t) => !q || norm(t).includes(norm(q)))
  const exact = teams.some((t) => norm(t) === norm(q))
  const showNew = !!q && !exact
  const pick = (t) => {
    onChange(t)
    setOpen(false)
  }

  return (
    <div className="field-combo" ref={boxRef}>
      <input
        type="text"
        name="team"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      <div className="field-combo-list" hidden={!open || (!filtered.length && !showNew)}>
        {filtered.map((t) => (
          <button key={t} type="button" className="field-combo-item" onClick={() => pick(t)}>
            {t}
          </button>
        ))}
        {showNew && (
          <button type="button" className="field-combo-item is-new" onClick={() => pick(q)}>
            <b>‘{q}’</b> 새 팀으로 추가
          </button>
        )}
      </div>
    </div>
  )
}
