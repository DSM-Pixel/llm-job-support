import { useEffect, useRef, useState } from 'react'
import { api, enter } from './authApi.js'
import DocModal from './DocModal.jsx'

const norm = (s) => (s || '').replace(/\s+/g, '').toLowerCase()

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
  const allChecked = terms && privacy && marketing

  // 회사 검색 콤보박스
  const [compQuery, setCompQuery] = useState('')
  const [comboItems, setComboItems] = useState([])
  const [comboOpen, setComboOpen] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [hintMode, setHintMode] = useState('default') // 'default' | 'new' | 'selected'
  const comboRef = useRef(null)
  const timerRef = useRef(null)

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

  // 콤보 리스트 바깥 클릭 시 닫기.
  useEffect(() => {
    const onDoc = (e) => {
      if (comboRef.current && !comboRef.current.contains(e.target)) setComboOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  // ── 회사 검색 ── 편집하면 이전 선택은 무효화(정확히 고른 것만 유효).
  const runSearch = async (q) => {
    setSelectedCompanyId('')
    setNewCompanyName('')
    setHintMode('default')
    try {
      const res = await fetch(`/api/companies?q=${encodeURIComponent((q || '').trim())}`)
      const d = await res.json()
      const items = d.companies || []
      const query = (q || '').trim()
      const exact = items.some((x) => norm(x.name) === norm(query))
      setComboItems(items)
      // 입력값과 (정규화) 일치하는 회사가 없으면 '새로 등록' 항목을 준다.
      setComboOpen(items.length > 0 || (!!query && !exact))
    } catch {
      setComboOpen(false)
    }
  }

  const onCompInput = (v) => {
    setCompQuery(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => runSearch(v), 160)
  }

  const pickExisting = (x) => {
    setSelectedCompanyId(String(x.id))
    setNewCompanyName('')
    setCompQuery(x.name)
    setHintMode('selected')
    setComboOpen(false)
  }

  const pickNew = () => {
    // 새 회사 등록 = 관리자 신청.
    setNewCompanyName(compQuery.trim())
    setSelectedCompanyId('')
    setHintMode('new')
    setComboOpen(false)
  }

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

  // 회사 힌트 렌더링.
  const hint = () => {
    if (hintMode === 'selected') return '✓ 회사를 선택했습니다.'
    if (hintMode === 'new') {
      return (
        <>
          ✓ 새 회사 <b>‘{newCompanyName}’</b> 등록 — 승인 후 관리자 권한이 활성화됩니다.
        </>
      )
    }
    return (
      <>
        회사를 검색해 선택하세요. 목록에 없으면 <b>새로 등록</b>해 관리자로 신청할 수 있습니다.
      </>
    )
  }

  const q = compQuery.trim()
  const exactMatch = comboItems.some((x) => norm(x.name) === norm(q))
  const showNew = !!q && !exactMatch

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
                <label className="field lg-span2">
                  <span className="field-cap">
                    회사·기관 <span className="req">*</span>
                  </span>
                  <div className="lg-combo" ref={comboRef}>
                    <input
                      type="text"
                      name="company_search"
                      placeholder="회사 이름을 검색하세요"
                      autoComplete="off"
                      value={compQuery}
                      onChange={(e) => onCompInput(e.target.value)}
                      onFocus={() => runSearch(compQuery)}
                    />
                    <div className="lg-combo-list" hidden={!comboOpen}>
                      {comboItems.map((x) => (
                        <button
                          key={x.id}
                          type="button"
                          className="lg-combo-item"
                          onClick={() => pickExisting(x)}
                        >
                          {x.name}
                        </button>
                      ))}
                      {showNew && (
                        <button
                          type="button"
                          className="lg-combo-item lg-combo-new"
                          onClick={pickNew}
                        >
                          <b>‘{q}’</b> 새 회사로 등록 <span>· 관리자 신청</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <small className="field-hint" data-role="company-hint">
                    {hint()}
                  </small>
                </label>
                <label className="field lg-span2">
                  부서·직함
                  <input
                    type="text"
                    name="team"
                    placeholder="예: 도로관리처 · 점검분석팀"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                  />
                </label>
              </div>

              <div className="lg-consent">
                <label className="lg-check all">
                  <input
                    type="checkbox"
                    data-consent="all"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  <span>
                    <b>전체 동의</b> (선택 항목 포함)
                  </span>
                </label>
                <hr />
                <label className="lg-check">
                  <input
                    type="checkbox"
                    data-consent="terms"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                  />
                  <span>
                    <em className="req-tag">[필수]</em> 서비스 이용약관 동의
                  </span>
                  <button className="lg-view" type="button" onClick={() => setDocModal('terms')}>
                    보기
                  </button>
                </label>
                <label className="lg-check">
                  <input
                    type="checkbox"
                    data-consent="privacy"
                    checked={privacy}
                    onChange={(e) => setPrivacy(e.target.checked)}
                  />
                  <span>
                    <em className="req-tag">[필수]</em> 개인정보 수집·이용 동의
                  </span>
                  <button className="lg-view" type="button" onClick={() => setDocModal('privacy')}>
                    보기
                  </button>
                </label>
                <label className="lg-check">
                  <input
                    type="checkbox"
                    data-consent="marketing"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                  />
                  <span>
                    <em className="opt-tag">[선택]</em> 서비스 소식·알림 수신 동의
                  </span>
                </label>
              </div>

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
            <div className="lg-verify" data-role="verify" hidden={panel !== 'verify'}>
              <div
                className={'lg-alert' + (verifyAlert?.ok ? ' ok' : '')}
                data-role="verify-alert"
                hidden={!verifyAlert}
              >
                {verifyAlert?.msg}
              </div>
              <p className="lg-verify-desc">
                입력하신 이메일 <b data-role="verify-email">{pendingEmail}</b> 로 6자리 인증 코드를
                보냈습니다.
                <br />
                메일함(스팸함 포함)을 확인해 코드를 입력해주세요.
              </p>
              <div className="lg-alert ok lg-devcode" data-role="devcode" hidden={!devCode}>
                데모용 코드(메일 미설정): {devCode}
              </div>
              <label className="field">
                <span className="field-cap">인증 코드</span>
                <input
                  type="text"
                  name="verify_code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6자리 숫자"
                  autoComplete="one-time-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitVerify()}
                />
              </label>
              <button
                className="btn primary lg-submit"
                type="button"
                data-role="verify-btn"
                onClick={submitVerify}
              >
                인증하고 가입 완료
              </button>
              <p className="lg-hint">
                <button className="lg-switch" type="button" data-role="resend" onClick={resendCode}>
                  코드 재전송
                </button>
                <span className="lg-dot">·</span>
                <button
                  className="lg-switch"
                  type="button"
                  data-role="verify-back"
                  onClick={() => setPanel('form')}
                >
                  이메일 다시 입력
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <DocModal doc={docModal} onClose={() => setDocModal(null)} onAgree={agreeDoc} />
    </>
  )
}
