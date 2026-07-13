// 이메일 인증 모달 — 가입 폼의 '인증하기' 버튼으로 열린다. 6자리 코드 확인·재전송.
export default function EmailVerifyModal({
  open,
  email,
  code,
  alert,
  devCode,
  onCode,
  onConfirm,
  onResend,
  onClose,
}) {
  if (!open) return null
  return (
    <div className="modal-overlay lg-verify-overlay">
      <div className="modal" role="dialog" aria-modal="true">
        <header className="modal-head">
          <h3>이메일 인증</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="lg-verify">
            <div className={'lg-alert' + (alert?.ok ? ' ok' : '')} hidden={!alert}>
              {alert?.msg}
            </div>
            <p className="lg-verify-desc">
              <b>{email}</b> 로 6자리 인증 코드를 보냈습니다.
              <br />
              메일함(스팸함 포함)을 확인해 코드를 입력해주세요.
            </p>
            <div className="lg-alert ok lg-devcode" hidden={!devCode}>
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
                value={code}
                onChange={(e) => onCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
                autoFocus
              />
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button className="lg-switch" type="button" onClick={onResend}>
            코드 재전송
          </button>
          <span className="foot-spacer" />
          <button className="btn modal-cancel" type="button" onClick={onClose}>
            취소
          </button>
          <button className="btn primary" type="button" onClick={onConfirm}>
            인증 완료
          </button>
        </div>
      </div>
    </div>
  )
}
