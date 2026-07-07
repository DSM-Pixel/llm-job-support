import { useState } from 'react'
import { api, enter } from './authApi.js'
import SignupModal from './SignupModal.jsx'

// 로그인·비밀번호 찾기 카드 + 회원가입 모달 — 기존 web/pages/login.html + login.js 이관.
export default function LoginPage() {
  const [card, setCard] = useState('login') // 'login' | 'reset'
  const [signupOpen, setSignupOpen] = useState(false)
  const [loginAlert, setLoginAlert] = useState(null) // { msg, ok }
  const [resetAlert, setResetAlert] = useState(null)

  // 로그인 폼
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false) // 비밀번호 보기(눈 아이콘)
  // 재설정 폼
  const [resetEmail, setResetEmail] = useState('')

  // ── 로그인 ↔ 비밀번호 찾기 — 모달 없이 카드 안에서 전환 ──
  const showView = (name) => {
    setLoginAlert(null)
    setResetAlert(null)
    setCard(name)
  }

  // ── 회원가입 모달 열기 ──
  const openSignup = () => {
    setLoginAlert(null)
    setResetAlert(null)
    setSignupOpen(true)
  }

  // ── 로그인 ──
  const submitLogin = async (e) => {
    e.preventDefault()
    setLoginAlert(null)
    try {
      const r = await api('/api/auth/login', { email: email.trim(), password })
      if (!r.ok) return setLoginAlert({ msg: r.error || '로그인에 실패했습니다' })
      enter(r)
    } catch {
      setLoginAlert({ msg: '서버 연결에 실패했습니다' })
    }
  }

  // ── 비밀번호 찾기 — 이메일로 재설정 링크 요청 ──
  const submitReset = async (e) => {
    e.preventDefault()
    setResetAlert(null)
    try {
      const r = await api('/api/auth/reset-request', { email: resetEmail.trim() })
      if (!r.ok) return setResetAlert({ msg: r.error || '요청에 실패했습니다' })
      // 데모: 메일러가 없어 백엔드가 재설정 링크(dev_link)를 함께 준다 → 화면에 노출.
      const msg = r.dev_link
        ? `재설정 링크(데모): ${location.origin}${r.dev_link}`
        : r.message || '재설정 링크를 이메일로 보냈습니다. 메일함을 확인해주세요.'
      setResetAlert({ msg, ok: true })
      setResetEmail('')
    } catch {
      setResetAlert({ msg: '서버 연결에 실패했습니다' })
    }
  }

  return (
    <div className="lg-page">
      <header className="lg-top">
        <span className="lg-logo">
          <img className="logo-img" src="/assets/img/logomark-transparent.png" alt="" />
          GNSoft AI 플랫폼
        </span>
      </header>

      <main className="lg-main">
        <div className="lg-card">
          {/* 브랜드: 로고 + 서비스명 */}
          <div className="lg-brand">
            <img className="lg-brand-mark" src="/assets/img/logomark-transparent.png" alt="" />
            <h1 className="lg-brand-name">GNSoft AI 플랫폼</h1>
            <p className="lg-brand-sub">로그인하고 프로젝트를 시작하세요</p>
          </div>

          {/* 로그인 */}
          <form className="lg-form" data-form="login" hidden={card !== 'login'} onSubmit={submitLogin}>
            <div className={'lg-alert' + (loginAlert?.ok ? ' ok' : '')} hidden={!loginAlert}>
              {loginAlert?.msg}
            </div>
            <label className="field">
              이메일
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              비밀번호
              <div className="pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="비밀번호"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="pw-toggle"
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  aria-pressed={showPw}
                  title={showPw ? '숨기기' : '보기'}
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? (
                    // 눈에 빗금(숨기기)
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    // 눈(보기)
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
            <button className="btn primary lg-submit" type="submit">
              로그인
            </button>
            <p className="lg-hint">
              <button className="lg-switch" type="button" onClick={() => showView('reset')}>
                비밀번호 찾기
              </button>
              <span className="lg-dot">·</span>
              <button className="lg-switch" type="button" onClick={openSignup}>
                회원가입
              </button>
            </p>
          </form>

          {/* 비밀번호 찾기 — 모달 없이 카드 안에서 로그인 폼과 전환 */}
          <form className="lg-form" data-form="reset" hidden={card !== 'reset'} onSubmit={submitReset}>
            <div className={'lg-alert' + (resetAlert?.ok ? ' ok' : '')} hidden={!resetAlert}>
              {resetAlert?.msg}
            </div>
            <p className="lg-reset-desc">
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </p>
            <label className="field">
              이메일
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </label>
            <button className="btn primary lg-submit" type="submit">
              재설정 링크 보내기
            </button>
            <p className="lg-hint">
              <button className="lg-switch" type="button" onClick={() => showView('login')}>
                ← 로그인으로 돌아가기
              </button>
            </p>
          </form>
        </div>
        <p className="lg-foot">지엔소프트(주) × 유클리드소프트 · 프로젝트형 일경험 데모 플랫폼</p>
      </main>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} />
    </div>
  )
}
