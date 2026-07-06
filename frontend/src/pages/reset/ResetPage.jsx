import { useState } from 'react'

// 비밀번호 재설정 카드 — 기존 web/pages/reset.html + reset.js 를 bug-for-bug 이관.
// 이메일 링크(?token=...)로 진입해 새 비밀번호를 설정한다.
export default function ResetPage() {
  const token = new URLSearchParams(location.search).get('token') || ''
  // 토큰이 없으면 곧바로 안내하고 입력을 막는다.
  const [alert, setAlert] = useState(
    token
      ? null
      : { msg: '유효하지 않은 접근입니다. 비밀번호 찾기를 다시 요청해주세요.', ok: false },
  )
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')

  const alertIn = (msg, ok = false) => setAlert({ msg, ok })

  const disabled = !token

  const submit = async (e) => {
    e.preventDefault()
    if (password !== password2) return alertIn('비밀번호가 서로 다릅니다')
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const r = await res.json()
      if (!r.ok) return alertIn(r.error || '재설정에 실패했습니다')
      alertIn(r.message || '비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다.', true)
      setTimeout(() => location.replace('login.html'), 900)
    } catch {
      alertIn('서버 연결에 실패했습니다')
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
          <div className="lg-brand">
            <img className="lg-brand-mark" src="/assets/img/logomark-transparent.png" alt="" />
            <h1 className="lg-brand-name">비밀번호 재설정</h1>
            <p className="lg-brand-sub">새로 사용할 비밀번호를 입력하세요</p>
          </div>

          <form className="lg-form" data-form="reset-confirm" onSubmit={submit}>
            <div className={'lg-alert' + (alert?.ok ? ' ok' : '')} hidden={!alert}>
              {alert?.msg}
            </div>
            <label className="field">
              새 비밀번호
              <input
                type="password"
                name="password"
                placeholder="8자 이상"
                autoComplete="new-password"
                minLength="8"
                required
                disabled={disabled}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="field">
              새 비밀번호 확인
              <input
                type="password"
                name="password2"
                placeholder="다시 입력"
                autoComplete="new-password"
                required
                disabled={disabled}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </label>
            <button className="btn primary lg-submit" type="submit" disabled={disabled}>
              비밀번호 변경
            </button>
            <p className="lg-hint">
              <a href="login.html">로그인으로 돌아가기</a>
            </p>
          </form>
        </div>
        <p className="lg-foot">지엔소프트(주) × 유클리드소프트 · 프로젝트형 일경험 데모 플랫폼</p>
      </main>
    </div>
  )
}
