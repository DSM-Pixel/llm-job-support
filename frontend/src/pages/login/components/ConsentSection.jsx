// 동의 섹션 — 전체 동의 + 이용약관/개인정보(필수) + 마케팅(선택) 체크박스.
export default function ConsentSection({
  terms,
  privacy,
  marketing,
  onToggleAll,
  onTerms,
  onPrivacy,
  onMarketing,
  onView,
}) {
  const allChecked = terms && privacy && marketing
  return (
    <div className="lg-consent">
      <label className="lg-check all">
        <input
          type="checkbox"
          data-consent="all"
          checked={allChecked}
          onChange={(e) => onToggleAll(e.target.checked)}
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
          onChange={(e) => onTerms(e.target.checked)}
        />
        <span>
          <em className="req-tag">[필수]</em> 서비스 이용약관 동의
        </span>
        <button className="lg-view" type="button" onClick={() => onView('terms')}>
          보기
        </button>
      </label>
      <label className="lg-check">
        <input
          type="checkbox"
          data-consent="privacy"
          checked={privacy}
          onChange={(e) => onPrivacy(e.target.checked)}
        />
        <span>
          <em className="req-tag">[필수]</em> 개인정보 수집·이용 동의
        </span>
        <button className="lg-view" type="button" onClick={() => onView('privacy')}>
          보기
        </button>
      </label>
      <label className="lg-check">
        <input
          type="checkbox"
          data-consent="marketing"
          checked={marketing}
          onChange={(e) => onMarketing(e.target.checked)}
        />
        <span>
          <em className="opt-tag">[선택]</em> 서비스 소식·알림 수신 동의
        </span>
      </label>
    </div>
  )
}
