import { num } from '../adminApi.js'

// 요약 칩 — 전체 멤버 수는 total(모든 페이지), 활성/오늘은 현재 페이지 기준. 기존 renderSummary 이식.
export function SummaryChips({ members, total }) {
  const active = members.filter((m) => m.active).length
  const todaySum = members.reduce((s, m) => s + (m.today || 0), 0)
  return (
    <div className="ad-summary">
      <span className="ad-chip">
        <b>{num(total)}</b>전체 멤버
      </span>
      <span className="ad-chip">
        <b>{num(active)}</b>이 페이지 활성
      </span>
      <span className="ad-chip">
        <b>{num(todaySum)}</b>이 페이지 오늘
      </span>
    </div>
  )
}
