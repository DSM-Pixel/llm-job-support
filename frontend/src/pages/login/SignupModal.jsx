import { useEffect, useState } from 'react'
import { api, enter } from './authApi.js'
import DocModal from './DocModal.jsx'
import CompanyCombobox from './components/CompanyCombobox.jsx'
import TeamCombobox from './components/TeamCombobox.jsx'
import ConsentSection from './components/ConsentSection.jsx'
import EmailVerifyModal from './components/EmailVerifyModal.jsx'

// 회원가입 모달 — 이메일 옆 '인증하기'로 이메일 단독 인증(모달) 후, 나머지 입력하고 가입.
export default function SignupModal({ open, onClose }) {
  const [signupAlert, setSignupAlert] = useState(null) // { msg, ok }

  // 입력 폼 필드
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [team, setTeam] = useState('')

  // 동의
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)

  // 회사 선택 결과(콤보박스가 알려준다)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')

  // 약관 전문 모달
  const [docModal, setDocModal] = useState(null) // null | 'terms' | 'privacy'

  // 이메일 인증(모달)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('') // 인증 진행 중인 이메일
  const [verifiedEmail, setVerifiedEmail] = useState('') // 인증 완료된 이메일(소문자)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyAlert, setVerifyAlert] = useState(null)
  const [devCode, setDevCode] = useState('')
  const [verifyBusy, setVerifyBusy] = useState(false)

  // 현재 입력한 이메일이 인증 완료 상태인가.
  const emailVerified = !!verifiedEmail && email.trim().toLowerCase() === verifiedEmail

  // 열 때 이전 알림 제거.
  useEffect(() => {
    if (open) setSignupAlert(null)
  }, [open])

  // ── 동의(전체 동의 연동) ──
  const toggleAll = (v) => {
    setTerms(v)
    setPrivacy(v)
    setMarketing(v)
  }
  const agreeDoc = (doc) => {
    if (doc === 'terms') setTerms(true)
    else if (doc === 'privacy') setPrivacy(true)
    setDocModal(null)
  }

  // ── 이메일 인증 코드 발송(인증하기 버튼) ──
  const sendCode = async () => {
    const em = email.trim()
    if (!em) return setSignupAlert({ msg: '이메일을 먼저 입력해주세요' })
    setVerifyBusy(true)
    setSignupAlert(null)
    try {
      const r = await api('/api/auth/email/send', { email: em })
      if (!r.ok) return setSignupAlert({ msg: r.error || '인증 코드 발송에 실패했습니다' })
      setVerifyEmail(em)
      setVerifyCode('')
      setVerifyAlert(null)
      setDevCode(r.dev_code || '')
      setVerifyOpen(true)
    } catch {
      setSignupAlert({ msg: '서버 연결에 실패했습니다' })
    } finally {
      setVerifyBusy(false)
    }
  }

  // ── 인증 코드 확인(모달) ──
  const confirmCode = async () => {
    const c = verifyCode.trim()
    if (c.length !== 6) return setVerifyAlert({ msg: '6자리 인증 코드를 입력해주세요' })
    try {
      const r = await api('/api/auth/email/confirm', { email: verifyEmail, code: c })
      if (!r.ok) return setVerifyAlert({ msg: r.error || '인증에 실패했습니다' })
      setVerifiedEmail(verifyEmail.toLowerCase())
      setVerifyOpen(false)
    } catch {
      setVerifyAlert({ msg: '서버 연결에 실패했습니다' })
    }
  }

  const resendCode = async () => {
    try {
      const r = await api('/api/auth/email/send', { email: verifyEmail })
      if (!r.ok) return setVerifyAlert({ msg: r.error || '재전송에 실패했습니다' })
      if (r.dev_code) setDevCode(r.dev_code) // 쿨다운이면 기존 코드 유지
      setVerifyAlert({ msg: r.message || '인증 코드를 다시 보냈습니다.', ok: true })
    } catch {
      setVerifyAlert({ msg: '서버 연결에 실패했습니다' })
    }
  }

  // ── 최종 회원가입 ──
  const submitSignup = async (e) => {
    e.preventDefault()
    setSignupAlert(null)
    if (!emailVerified) {
      return setSignupAlert({ msg: '이메일 인증을 먼저 완료해주세요 (이메일 옆 ‘인증하기’)' })
    }
    if (password !== password2) return setSignupAlert({ msg: '비밀번호가 서로 다릅니다' })
    if (!terms || !privacy) {
      return setSignupAlert({ msg: '필수 약관(이용약관·개인정보 수집이용)에 동의해주세요' })
    }
    const companyPayload = {}
    if (selectedCompanyId) {
      companyPayload.company_id = selectedCompanyId
    } else if (newCompanyName) {
      companyPayload.company = newCompanyName
      companyPayload.admin_request = true
    } else {
      return setSignupAlert({
        msg: '회사를 검색해 선택하거나, 목록에 없으면 ‘새 회사로 등록’을 선택해주세요',
      })
    }
    try {
      const r = await api('/api/auth/register', {
        email: email.trim(),
        password,
        name: name.trim(),
        team: team.trim(),
        agree_terms: terms,
        agree_privacy: privacy,
        agree_marketing: marketing,
        ...companyPayload,
      })
      if (!r.ok) return setSignupAlert({ msg: r.error || '가입에 실패했습니다' })
      enter(r) // 세션 저장 + 프로젝트 화면으로
    } catch {
      setSignupAlert({ msg: '서버 연결에 실패했습니다' })
    }
  }

  return (
    <>
      <div className="modal-overlay" id="signup-modal" hidden={!open}>
        <div className="modal lg-signup-modal" role="dialog" aria-modal="true">
          <header className="modal-head">
            <h3>회원가입</h3>
            <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
              ✕
            </button>
          </header>
          <div className="modal-body">
            <form className="lg-form" data-form="signup" onSubmit={submitSignup}>
              <div className={'lg-alert' + (signupAlert?.ok ? ' ok' : '')} hidden={!signupAlert}>
                {signupAlert?.msg}
              </div>
              <div className="lg-grid">
                <label className="field">
                  <span className="field-cap">
                    이름 <span className="req">*</span>
                  </span>
                  <input
                    type="text"
                    name="name"
                    placeholder="홍길동"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-cap">
                    이메일 <span className="req">*</span>
                  </span>
                  <div className="lg-email-row">
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <button
                      type="button"
                      className={'btn lg-verify-btn' + (emailVerified ? ' done' : '')}
                      disabled={emailVerified || verifyBusy}
                      onClick={sendCode}
                    >
                      {emailVerified ? '✓ 인증됨' : verifyBusy ? '…' : '인증하기'}
                    </button>
                  </div>
                </label>
                <label className="field">
                  <span className="field-cap">
                    비밀번호 <span className="req">*</span>
                  </span>
                  <input
                    type="password"
                    name="password"
                    placeholder="8자 이상"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-cap">
                    비밀번호 확인 <span className="req">*</span>
                  </span>
                  <input
                    type="password"
                    name="password2"
                    placeholder="다시 입력"
                    autoComplete="new-password"
                    required
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                  />
                </label>
                <CompanyCombobox
                  onSelectExisting={(id) => {
                    setSelectedCompanyId(id)
                    setNewCompanyName('')
                  }}
                  onSelectNew={(companyName) => {
                    setNewCompanyName(companyName)
                    setSelectedCompanyId('')
                  }}
                  onClear={() => {
                    setSelectedCompanyId('')
                    setNewCompanyName('')
                  }}
                />
                <TeamCombobox companyId={selectedCompanyId} value={team} onChange={setTeam} />
              </div>

              <ConsentSection
                terms={terms}
                privacy={privacy}
                marketing={marketing}
                onToggleAll={toggleAll}
                onTerms={setTerms}
                onPrivacy={setPrivacy}
                onMarketing={setMarketing}
                onView={setDocModal}
              />

              <button className="btn primary lg-submit" type="submit">
                가입하기
              </button>
              <p className="lg-hint">
                이미 계정이 있으신가요?{' '}
                <button className="lg-switch" type="button" onClick={onClose}>
                  로그인
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>

      <EmailVerifyModal
        open={verifyOpen}
        email={verifyEmail}
        code={verifyCode}
        alert={verifyAlert}
        devCode={devCode}
        onCode={setVerifyCode}
        onConfirm={confirmCode}
        onResend={resendCode}
        onClose={() => setVerifyOpen(false)}
      />

      <DocModal doc={docModal} onClose={() => setDocModal(null)} onAgree={agreeDoc} />
    </>
  )
}
