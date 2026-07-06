import { useEffect, useState } from 'react'
import { api, enter } from './authApi.js'
import DocModal from './DocModal.jsx'
import CompanyCombobox from './components/CompanyCombobox.jsx'
import TeamCombobox from './components/TeamCombobox.jsx'
import ConsentSection from './components/ConsentSection.jsx'
import VerifyPanel from './components/VerifyPanel.jsx'

// 회원가입 모달 — 입력 폼 ↔ 이메일 인증 단계 전환, 회사 검색 콤보박스, 필수 동의.
export default function SignupModal({ open, onClose }) {
  const [panel, setPanel] = useState('form') // 'form' | 'verify'
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

  // 이메일 인증 단계
  const [pendingEmail, setPendingEmail] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyAlert, setVerifyAlert] = useState(null)
  const [devCode, setDevCode] = useState('')

  // 열 때는 항상 입력 폼부터(이전 인증 단계 상태 초기화) + 이전 알림 제거.
  useEffect(() => {
    if (open) {
      setPanel('form')
      setSignupAlert(null)
    }
  }, [open])

  // ── 동의(전체 동의 연동) ──
  const toggleAll = (v) => {
    setTerms(v)
    setPrivacy(v)
    setMarketing(v)
  }

  // ── 약관 전문 '동의하고 닫기' → 해당 동의 체크 ──
  const agreeDoc = (doc) => {
    if (doc === 'terms') setTerms(true)
    else if (doc === 'privacy') setPrivacy(true)
    setDocModal(null)
  }

  // ── 회원가입 제출 ──
  const submitSignup = async (e) => {
    e.preventDefault()
    setSignupAlert(null)
    if (password !== password2) return setSignupAlert({ msg: '비밀번호가 서로 다릅니다' })
    if (!terms || !privacy) {
      return setSignupAlert({ msg: '필수 약관(이용약관·개인정보 수집이용)에 동의해주세요' })
    }
    // 소속: 기존 회사 선택 → 직원(company_id), 새 회사 등록 → 관리자 신청.
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
      const r = await api('/api/auth/signup', {
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
      // 계정은 아직 안 만들어졌다 — 이메일 인증(코드 입력) 단계로 전환.
      showVerify(email.trim(), r.dev_code)
    } catch {
      setSignupAlert({ msg: '서버 연결에 실패했습니다' })
    }
  }

  // ── 이메일 인증(코드 입력) ──
  const showVerify = (targetEmail, code) => {
    setPendingEmail(targetEmail)
    setVerifyCode('')
    setVerifyAlert(null)
    setDevCode(code || '')
    setPanel('verify')
  }

  const submitVerify = async () => {
    const code = verifyCode.trim()
    if (code.length !== 6) return setVerifyAlert({ msg: '6자리 인증 코드를 입력해주세요' })
    try {
      const r = await api('/api/auth/verify-signup', { email: pendingEmail, code })
      if (!r.ok) return setVerifyAlert({ msg: r.error || '인증에 실패했습니다' })
      setVerifyAlert({ msg: r.message || '인증 완료!', ok: true })
      setTimeout(() => enter(r), 700)
    } catch {
      setVerifyAlert({ msg: '서버 연결에 실패했습니다' })
    }
  }

  const resendCode = async () => {
    try {
      const r = await api('/api/auth/resend-code', { email: pendingEmail })
      if (!r.ok) return setVerifyAlert({ msg: r.error || '재전송에 실패했습니다' })
      setVerifyAlert({ msg: '인증 코드를 다시 보냈습니다. 메일함을 확인해주세요.', ok: true })
      setDevCode(r.dev_code || '')
    } catch {
      setVerifyAlert({ msg: '서버 연결에 실패했습니다' })
    }
  }

  return (
    <>
      <div
        className="modal-overlay"
        id="signup-modal"
        hidden={!open}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal lg-signup-modal" role="dialog" aria-modal="true">
          <header className="modal-head">
            <h3>회원가입</h3>
            <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
              ✕
            </button>
          </header>
          <div className="modal-body">
            {/* 입력 폼 */}
            <form className="lg-form" data-form="signup" hidden={panel !== 'form'} onSubmit={submitSignup}>
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
                동의하고 가입하기
              </button>
              <p className="lg-hint">
                이미 계정이 있으신가요?{' '}
                <button className="lg-switch" type="button" onClick={onClose}>
                  로그인
                </button>
              </p>
            </form>

            {/* 이메일 인증 단계(코드 입력) */}
            <VerifyPanel
              hidden={panel !== 'verify'}
              pendingEmail={pendingEmail}
              verifyCode={verifyCode}
              verifyAlert={verifyAlert}
              devCode={devCode}
              onCodeChange={setVerifyCode}
              onSubmit={submitVerify}
              onResend={resendCode}
              onBack={() => setPanel('form')}
            />
          </div>
        </div>
      </div>

      <DocModal doc={docModal} onClose={() => setDocModal(null)} onAgree={agreeDoc} />
    </>
  )
}
