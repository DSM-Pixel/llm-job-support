import { useEffect, useState } from 'react'
import { getSettings, getProject, saveSettings, clearProject, getAuth } from '../lib/storage.js'
import { toast } from '../lib/toast.js'

// 설정 모달 — 기존 common.js buildSettingsModal/openSettings/저장 로직 이식.
// 이미지 탐지 모델은 프로젝트 안(작업 화면)에서만 노출, 슈퍼 어드민은 소속·직함 숨김.
export default function SettingsModal({ open, onClose, onSaved }) {
  // 프로젝트 안일 때만 모델 선택 노출(바닐라 _needsProject 게이트와 동일한 의미).
  const showModel = !!getProject()
  // 슈퍼 어드민(순수 운영자)은 소속·직함이 없다.
  const isSuper = !!(getAuth() || {}).is_super

  const [engine, setEngine] = useState('Gemini')
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const [theme, setTheme] = useState('light')

  // 열 때마다 저장된 설정으로 폼을 채운다(바닐라 overlay._fill 과 동일).
  useEffect(() => {
    if (!open) return
    const s = getSettings()
    setEngine(s.engine)
    setName(s.name || '')
    setTeam(s.team || '')
    setTheme(s.theme || 'light')
  }, [open])

  // Escape 로 닫기.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 로그아웃 — 세션·현재 프로젝트를 비우고 로그인 화면으로.
  const logout = async () => {
    try {
      const auth = getAuth()
      if (auth?.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: auth.token }),
        }).catch(() => {})
      }
    } catch {
      /* 무시 */
    }
    localStorage.removeItem('gnsoft.auth')
    clearProject()
    location.replace('login.html')
  }

  const save = () => {
    const merged = saveSettings({
      ...(showModel ? { engine } : {}),
      name: name.trim() || '사용자',
      ...(isSuper ? {} : { team: team.trim() }),
      theme,
    })
    onSaved(merged) // 사이드바 프로필·인사말 즉시 갱신 + 테마 적용은 saveSettings 가 처리
    onClose()
    toast('설정을 저장했습니다')
  }

  return (
    <div
      className="modal-overlay"
      id="settings-modal"
      hidden={!open}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="설정">
        <header className="modal-head">
          <h3>내 프로필 · 설정</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="modal-form">
            {showModel && (
              <label className="field">
                이미지 탐지 모델
                <select name="engine" value={engine} onChange={(e) => setEngine(e.target.value)}>
                  <option value="Gemini">gemini-2.5-flash · 멀티모달 VLM</option>
                  <option value="YOLO-World">yolo-world · 탐지 전용</option>
                </select>
                <small className="field-hint">
                  자연어 질의·RAG·보고서는 항상 gemini-2.5-flash(LLM)를 사용합니다.
                </small>
              </label>
            )}
            <label className="field">
              이름
              <input
                type="text"
                name="name"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {!isSuper && (
              <label className="field">
                직함 · 소속
                <input
                  type="text"
                  name="team"
                  placeholder="예: 도로관리처 · 점검분석팀"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              화면 테마
              <select name="theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="light">라이트 모드</option>
                <option value="dark">다크 모드</option>
              </select>
            </label>
          </div>
        </div>
        <div className="modal-foot settings-foot">
          <button
            className="btn modal-logout"
            type="button"
            title="로그아웃하고 로그인 화면으로"
            onClick={logout}
          >
            로그아웃
          </button>
          <span className="foot-spacer"></span>
          <button className="btn modal-cancel" type="button" onClick={onClose}>
            취소
          </button>
          <button className="btn primary modal-save-settings" type="button" onClick={save}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
