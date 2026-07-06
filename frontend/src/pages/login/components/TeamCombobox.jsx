import { useEffect, useState } from 'react'

// 팀 입력 — 회사에 이미 있는 팀은 목록에서 고르고, 없으면 그대로 입력해 새 팀으로 등록(자유 생성+선택).
// datalist 라 브라우저가 등록된 팀을 제안하되 자유 입력도 허용한다. 목록은 선택한 회사(companyId) 기준.
export default function TeamCombobox({
  companyId,
  value,
  onChange,
  label = '부서·팀',
  id = 'team-options',
}) {
  const [teams, setTeams] = useState([])

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
      .catch(() => {
        if (alive) setTeams([])
      })
    return () => {
      alive = false
    }
  }, [companyId])

  const hasCompany = !!(companyId || '').trim()
  return (
    <label className="field lg-span2">
      {label}
      <input
        type="text"
        name="team"
        list={id}
        placeholder={hasCompany ? '회사 팀을 고르거나 새로 입력' : '예: 점검분석팀'}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={id}>
        {teams.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <small className="field-hint">
        {teams.length
          ? '등록된 팀에서 고르거나, 없으면 새 팀명을 입력하세요.'
          : '같은 팀끼리 이름을 똑같이 맞춰야 프로젝트가 함께 보입니다.'}
      </small>
    </label>
  )
}
