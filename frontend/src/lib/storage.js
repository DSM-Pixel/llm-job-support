// 기존 바닐라 앱과 '동일한' localStorage 키를 공유한다.
// (이관 중 두 구현이 공존해도 로그인·프로젝트·설정 상태가 호환되도록)

const SETTINGS_KEY = 'gnsoft.settings'
const PROJECT_KEY = 'gnsoft.currentProject'
const AUTH_KEY = 'gnsoft.auth'

const DEFAULT_SETTINGS = {
  engine: 'Gemini',
  name: '사용자',
  team: '',
  notify: true,
  theme: 'light',
}

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
  } catch {
    return null
  }
}

export const authToken = () => getAuth()?.token || ''

export function getProject() {
  try {
    return JSON.parse(localStorage.getItem(PROJECT_KEY) || 'null')
  } catch {
    return null
  }
}

export function setProject(p) {
  localStorage.setItem(PROJECT_KEY, JSON.stringify({ id: p.id, name: p.name, emoji: p.emoji }))
}

export function clearProject() {
  localStorage.removeItem(PROJECT_KEY)
}
