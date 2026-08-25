// 상대 시간 — 기존 common.js relTime 을 그대로 이식(동작 패리티 유지).
export function relTime(ts) {
  if (!ts) return ''
  // 초 단위(1e12 미만) 타임스탬프면 ms 로 보정한다.
  // 백엔드가 검수 시각(reviewed_at)을 time.time()=Unix '초' 로 주는데
  // relTime 은 ms(Date.now()) 기준이라, 보정 없이는 Date.now()-초 ≈ 20669일 전으로 떴다.
  if (ts < 1e12) ts *= 1000
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return '방금'
  const mi = Math.floor(s / 60)
  if (mi < 60) return `${mi}분 전`
  const h = Math.floor(mi / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}
