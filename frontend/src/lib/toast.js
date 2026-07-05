import { getSettings } from './storage.js'

// 기존 common.js 의 toast 를 그대로 이식 — 같은 .toast 클래스/타이밍(1.8s).
export function toast(message) {
  if (getSettings().notify === false) return // 알림 끄기 설정 존중
  let el = document.querySelector('.toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = message
  el.classList.add('show')
  clearTimeout(el._timer)
  el._timer = setTimeout(() => el.classList.remove('show'), 1800)
}
