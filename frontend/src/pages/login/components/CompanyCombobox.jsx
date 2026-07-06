import { useEffect, useRef, useState } from 'react'

const norm = (s) => (s || '').replace(/\s+/g, '').toLowerCase()

// 회사 검색·신규등록 콤보박스 — /api/companies 검색, 기존 회사 선택 또는 목록에 없으면 새로 등록(관리자 신청).
// 검색·힌트 등 UI 상태는 내부에서 관리하고, 선택 결과만 부모에 알린다.
export default function CompanyCombobox({ onSelectExisting, onSelectNew, onClear }) {
  const [compQuery, setCompQuery] = useState('')
  const [comboItems, setComboItems] = useState([])
  const [comboOpen, setComboOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [hintMode, setHintMode] = useState('default') // 'default' | 'new' | 'selected'
  const comboRef = useRef(null)
  const timerRef = useRef(null)

  // 콤보 리스트 바깥 클릭 시 닫기.
  useEffect(() => {
    const onDoc = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) setComboOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  // ── 회사 검색 ── 편집하면 이전 선택은 무효화(정확히 고른 것만 유효).
  const runSearch = async (q) => {
    onClear()
    setNewCompanyName('')
    setHintMode('default')
    try {
      const res = await fetch(`/api/companies?q=${encodeURIComponent((q || '').trim())}`)
      const d = await res.json()
      const items = d.companies || []
      const query = (q || '').trim()
      const exact = items.some((x) => norm(x.name) === norm(query))
      setComboItems(items)
      // 입력값과 (정규화) 일치하는 회사가 없으면 '새로 등록' 항목을 준다.
      setComboOpen(items.length > 0 || (!!query && !exact))
    } catch {
      setComboOpen(false)
    }
  }

  const onCompInput = (v) => {
    setCompQuery(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => runSearch(v), 160)
  }

  const pickExisting = (x) => {
    onSelectExisting(String(x.id))
    setNewCompanyName('')
    setCompQuery(x.name)
    setHintMode('selected')
    setComboOpen(false)
  }

  const pickNew = () => {
    // 새 회사 등록 = 관리자 신청.
    const name = compQuery.trim()
    setNewCompanyName(name)
    onSelectNew(name)
    setHintMode('new')
    setComboOpen(false)
  }

  // 회사 힌트 렌더링.
  const hint = () => {
    if (hintMode === 'selected') return '✓ 회사를 선택했습니다.'
    if (hintMode === 'new') {
      return (
        <>
          ✓ 새 회사 <b>‘{newCompanyName}’</b> 등록 — 승인 후 관리자 권한이 활성화됩니다.
        </>
      )
    }
    return (
      <>
        회사를 검색해 선택하세요. 목록에 없으면 <b>새로 등록</b>해 관리자로 신청할 수 있습니다.
      </>
    )
  }

  const q = compQuery.trim()
  const exactMatch = comboItems.some((x) => norm(x.name) === norm(q))
  const showNew = !!q && !exactMatch

  return (
    <label className="field lg-span2">
      <span className="field-cap">
        회사·기관 <span className="req">*</span>
      </span>
      <div className="lg-combo" ref={comboRef}>
        <input
          type="text"
          name="company_search"
          placeholder="회사 이름을 검색하세요"
          autoComplete="off"
          value={compQuery}
          onChange={(e) => onCompInput(e.target.value)}
          onFocus={() => runSearch(compQuery)}
        />
        <div className="lg-combo-list" hidden={!comboOpen}>
          {comboItems.map((x) => (
            <button
              key={x.id}
              type="button"
              className="lg-combo-item"
              onClick={() => pickExisting(x)}
            >
              {x.name}
            </button>
          ))}
          {showNew && (
            <button type="button" className="lg-combo-item lg-combo-new" onClick={pickNew}>
              <b>‘{q}’</b> 새 회사로 등록 <span>· 관리자 신청</span>
            </button>
          )}
        </div>
      </div>
      <small className="field-hint" data-role="company-hint">
        {hint()}
      </small>
    </label>
  )
}
