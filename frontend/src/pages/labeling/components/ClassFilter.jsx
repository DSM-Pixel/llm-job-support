import { useMemo, useState } from 'react'
import { toast } from '../../../lib/toast.js'

// 전체 객체 탐지 결과 → 클래스 필터. 원하는 클래스만 체크해 라벨 추가.
// 바닐라 detect-filter / renderFilterChips 재현.
export default function ClassFilter({ pendingBoxes, isMock, onCancel, onApply }) {
  // 클래스별 개수(내림차순).
  const rows = useMemo(() => {
    const counts = {}
    pendingBoxes.forEach((b) => {
      counts[b.label] = (counts[b.label] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [pendingBoxes])

  // 각 클래스 체크 상태 — 처음엔 전부 체크.
  const [checked, setChecked] = useState(() => Object.fromEntries(rows.map(([l]) => [l, true])))
  const allChecked = rows.every(([l]) => checked[l])

  const toggleAll = (v) => setChecked(Object.fromEntries(rows.map(([l]) => [l, v])))
  const toggleOne = (label, v) => setChecked((prev) => ({ ...prev, [label]: v }))

  const apply = () => {
    const picked = rows.filter(([l]) => checked[l]).map(([l]) => l)
    if (!picked.length) return toast('추가할 클래스를 선택하세요')
    onApply(picked)
  }

  return (
    <div className="detect-filter">
      <h4>
        탐지된 객체 <small>원하는 클래스만 체크해 추가</small>
      </h4>
      <div className="filter-chips">
        {isMock && (
          <p className="filter-note">
            ⚠ 지금은 예시 데이터입니다(탐지 모델·AI 한도 없음) — 실제 사진 위치와 무관합니다.
          </p>
        )}
        <label className="filter-row filter-all">
          <input
            type="checkbox"
            className="filter-check-all"
            checked={allChecked}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <span className="filter-name">전체 선택</span>
        </label>
        {rows.map(([label, n]) => (
          <label className="filter-row" key={label}>
            <input
              type="checkbox"
              value={label}
              checked={!!checked[label]}
              onChange={(e) => toggleOne(label, e.target.checked)}
            />
            <span className="filter-name">{label}</span>
            <span className="filter-count">{n}개</span>
          </label>
        ))}
      </div>
      <div className="filter-actions">
        <button className="btn flat filter-cancel" type="button" onClick={onCancel}>
          취소
        </button>
        <button className="btn primary filter-apply" type="button" onClick={apply}>
          선택 객체만 라벨 추가
        </button>
      </div>
    </div>
  )
}
