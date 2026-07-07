// 이메일 인증(코드 입력) 패널 — 6자리 코드 확인, 재전송, 이메일 다시 입력.
export default function VerifyPanel({
  hidden,
  pendingEmail,
  verifyCode,
  verifyAlert,
  devCode,
  onCodeChange,
  onSubmit,
  onResend,
  onBack,
}) {
  return (
    <div className="lg-verify" data-role="verify" hidden={hidden}>
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
          onChange={(e) => onCodeChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        />
      </label>
      <button
        className="btn primary lg-submit"
        type="button"
        data-role="verify-btn"
        onClick={onSubmit}
      >
        인증 완료
      </button>
      <p className="lg-hint">
        <button className="lg-switch" type="button" data-role="resend" onClick={onResend}>
          코드 재전송
        </button>
        <span className="lg-dot">·</span>
        <button className="lg-switch" type="button" data-role="verify-back" onClick={onBack}>
          이메일 다시 입력
        </button>
      </p>
    </div>
  )
}
