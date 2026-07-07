import { useEffect, useState } from 'react'
import { getSettings, getProject, saveSettings, clearProject, getAuth } from '../lib/storage.js'
import { toast } from '../lib/toast.js'
import TeamCombo from '../components/TeamCombo.jsx'

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
  const [teamList, setTeamList] = useState([]) // 회사 팀 목록(선택지)
  const [theme, setTheme] = useState('light')
  const [confirmWithdraw, setConfirmWithdraw] = useState(false) // 회원 탈퇴 확인

  // 열 때마다 폼을 채운다 — 팀은 로컬 표시값이 아니라 '계정' 값(스코프 기준)으로.
  useEffect(() => {
    if (!open) return
    const s = getSettings()
    const a = getAuth() || {}
    setEngine(s.engine)
    setName(a.name || s.name || '')
    setTeam(a.team || '')
    setTheme(s.theme || 'light')
    setConfirmWithdraw(false)
    // 회사 팀 목록을 불러와 datalist 선택지로(오타·불일치 방지).
    setTeamList([])
    if (!a.is_super && a.token) {
      fetch(`/api/companies/teams?token=${encodeURIComponent(a.token)}`)
        .then((r) => r.json())
        .then((d) => setTeamList(d.teams || []))
        .catch(() => {})
    }
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

  // 회원 탈퇴 — 계정+세션 영구 삭제 후 로그인 화면으로.
  const withdraw = async () => {
    const a = getAuth() || {}
    try {
      const res = await fetch('/api/auth/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: a.token }),
      })
      const d = await res.json().catch(() => ({}))
      if (!d.ok) {
        toast(d.error || '탈퇴에 실패했습니다')
        return
      }
      localStorage.removeItem('gnsoft.auth')
      clearProject()
      location.replace('login.html')
    } catch {
      toast('서버 연결에 실패했습니다')
    }
  }

  const save = async () => {
    const a = getAuth() || {}
    // 계정(서버) 이름·팀 갱신 — 팀은 프로젝트 팀 공유 스코프의 기준값이라 서버에 저장한다.
    let user = null
    if (a.token) {
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: a.token,
            name: name.trim(),
            team: isSuper ? '' : team.trim(),
          }),
        })
        const d = await res.json()
        if (d.ok && d.user) {
          user = d.user
          localStorage.setItem('gnsoft.auth', JSON.stringify({ ...a, ...d.user }))
        }
      } catch {
        /* 서버 실패 시 로컬 표시라도 저장 */
      }
    }
    // 사이드바 표시용은 '회사 · 팀' 조합(기존과 동일).
    const displayTeam = isSuper
      ? ''
      : [user?.company ?? a.company, (user?.team ?? team).trim()].filter(Boolean).join(' · ')
    const merged = saveSettings({
      ...(showModel ? { engine } : {}),
      name: user?.name || name.trim() || '사용자',
      ...(isSuper ? {} : { team: displayTeam }),
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
                팀
                <TeamCombo
                  teams={teamList}
                  value={team}
                  onChange={setTeam}
                  placeholder="회사 팀을 고르거나 새로 입력"
                />
                <small className="field-hint">
                  프로젝트 ‘팀 공유’는 이 팀 기준입니다. 같은 팀끼리 이름을 똑같이 맞춰주세요.
                </small>
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
          {!isSuper && (
            <div className="settings-danger">
              {!confirmWithdraw ? (
                <button
                  type="button"
                  className="settings-withdraw"
                  onClick={() => setConfirmWithdraw(true)}
                >
                  회원 탈퇴
                </button>
              ) : (
                <div className="settings-withdraw-confirm">
                  <p>정말 탈퇴하시겠어요? 계정이 영구 삭제되며 되돌릴 수 없습니다.</p>
                  <div className="settings-withdraw-btns">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setConfirmWithdraw(false)}
                    >
                      취소
                    </button>
                    <button type="button" className="btn danger" onClick={withdraw}>
                      탈퇴하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
