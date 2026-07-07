import { useEffect, useRef, useState } from 'react'

const norm = (s) => (s || '').replace(/\s+/g, '').toLowerCase()

// 팀 선택 콤보박스 — 회사 콤보박스(CompanyCombobox)와 동일한 .lg-combo UI로 맞춤.
// 회사(companyId)에 등록된 팀은 목록에서 고르고, 없으면 그대로 입력해 새 팀으로 등록.
export default function TeamCombobox({ companyId, value, onChange, label = '부서·팀' }) {
  const [teams, setTeams] = useState([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  // 선택한 회사의 기존 팀 목록을 불러온다(회사 바뀌면 갱신).
  useEffect(() => {
    let alive = true
    const cid = (companyId || '').trim()
    if (!cid) {
      setTeams([])
      return
    }
    fetch(`/api/companies/teams?company_id=${encodeURIComponent(cid)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setTeams(d.teams || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [companyId])

  // 바깥 클릭 시 목록 닫기.
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
  const hasCompany = !!(companyId || '').trim()

  const pick = (t) => {
    onChange(t)
    setOpen(false)
  }

  return (
    <label className="field lg-span2">
      {label}
      <div className="lg-combo" ref={boxRef}>
        <input
          type="text"
          name="gnsoft-team"
          placeholder={hasCompany ? '회사 팀을 고르거나 새로 입력' : '예: 점검분석팀'}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          role="combobox"
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        <div className="lg-combo-list" hidden={!open || (!filtered.length && !showNew)}>
          {filtered.map((t) => (
            <button key={t} type="button" className="lg-combo-item" onClick={() => pick(t)}>
              {t}
            </button>
          ))}
          {showNew && (
            <button type="button" className="lg-combo-item lg-combo-new" onClick={() => pick(q)}>
              <b>‘{q}’</b> 새 팀으로 추가
            </button>
          )}
        </div>
      </div>
      <small className="field-hint">
        {teams.length
          ? '등록된 팀에서 고르거나, 없으면 새 팀명을 입력하세요.'
          : '같은 팀끼리 이름을 똑같이 맞춰야 프로젝트가 함께 보입니다.'}
      </small>
    </label>
  )
}
