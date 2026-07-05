// 상대 시간 — 기존 common.js relTime 을 그대로 이식(동작 패리티 유지).
export function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return '방금'
  const mi = Math.floor(s / 60)
  if (mi < 60) return `${mi}분 전`
  const h = Math.floor(mi / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}
