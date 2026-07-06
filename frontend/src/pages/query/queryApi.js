// 자연어 질의 페이지 전용 로직 — 답변 HTML 조립 + 세션 대화 저장/복원.
// 바닐라 web/assets/js/query.js 를 1:1 재현한다(bug-for-bug).

// 대화 기록 저장소(세션 단위) 키 — 바닐라와 동일.
export const CHAT_KEY = 'gnsoft.query.chat'

// HTML 이스케이프 — 바닐라 ABC.escapeHtml 동일.
export const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

// 답변 텍스트(여러 문단 + '- ' 불릿)를 HTML 로 — 바닐라 renderText 동일.
export const renderText = (text) => {
  const lines = String(text || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  let html = ''
  let inList = false
  for (const ln of lines) {
    if (/^[-*•]\s+/.test(ln)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${escapeHtml(ln.replace(/^[-*•]\s+/, ''))}</li>`
    } else {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<p>${escapeHtml(ln)}</p>`
    }
  }
  if (inList) html += '</ul>'
  return html || '<p></p>'
}

// 서버 응답(answer/sources/actions)을 답변 HTML 로 조립 — 바닐라 renderAnswer 동일.
export const renderAnswer = (data) => {
  let html = renderText(data.answer)
  if (data.sources && data.sources.length) {
    const links = data.sources
      .map((s) =>
        s && typeof s === 'object'
          ? `<a class="pill src-link" href="${s.url}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a>`
          : `<span class="pill">${escapeHtml(s)}</span>`,
      )
      .join('')
    html += `<div class="msg-sources"><b>참고</b>${links}</div>`
  }
  if (data.actions && data.actions.length) {
    const buttons = data.actions
      .map((a) => `<a class="btn${a.primary ? ' primary' : ''}" href="${a.href}">${escapeHtml(a.label)}</a>`)
      .join('')
    html += `<div class="message-actions">${buttons}</div>`
  }
  return html
}

// 내비게이션 타입(navigate | reload | back_forward) — 바닐라 navType IIFE 동일.
export const getNavType = () => {
  try {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav && nav.type) return nav.type
  } catch {
    /* 구형 브라우저 폴백 */
  }
  return performance.navigation && performance.navigation.type === 1 ? 'reload' : 'navigate'
}

// 세션에 저장된 대화 복원(손상된 기록은 무시).
export const loadSavedChat = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]')
    if (Array.isArray(saved)) return saved
  } catch {
    /* 손상된 기록 무시 */
  }
  return []
}
