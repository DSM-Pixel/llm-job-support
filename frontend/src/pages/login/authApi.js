// 로그인/회원가입 전용 API — 기존 login.js 의 api() 그대로.
// !ok 면 throw(토스트 없음). 인라인 .lg-alert 이 에러 표면이라 src/lib/api.js 대신 로컬 헬퍼를 쓴다.
export const api = async (path, body) => {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── 성공 처리: 세션 저장 + 프로필 설정 동기화 → 프로젝트 선택 ──
export const enter = (data) => {
  try {
    localStorage.setItem('gnsoft.auth', JSON.stringify({ token: data.token, ...data.user }))
    // 사이드바 프로필(이름·소속)을 계정 정보로 동기화.
    const s = JSON.parse(localStorage.getItem('gnsoft.settings') || '{}')
    s.name = data.user.name
    // 슈퍼 어드민(순수 운영자)은 소속·직함이 없다.
    s.team = data.user.is_super
      ? ''
      : [data.user.company, data.user.team].filter(Boolean).join(' · ')
    localStorage.setItem('gnsoft.settings', JSON.stringify(s))
  } catch {
    /* 무시 */
  }
  // 슈퍼 어드민(순수 운영자)은 관리 전용 콘솔로, 그 외에는 프로젝트 선택으로.
  location.replace(data.user && data.user.is_super ? 'admin.html' : 'projects.html')
}
