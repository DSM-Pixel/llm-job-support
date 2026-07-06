// 관리자 승인 대기(슈퍼 어드민 전용) — 기존 loadRequests 렌더 이식.
export function RequestList({ requests, onResolve }) {
  return (
    <section className="ad-requests">
      <h3 className="ad-req-title">
        관리자 승인 대기 <span className="ad-req-count">{requests.length}</span>
      </h3>
      <div className="ad-req-list">
        {requests.length === 0 ? (
          <p className="ad-req-empty">대기 중인 관리자 신청이 없습니다.</p>
        ) : (
          requests.map((r) => (
            <div className="ad-req-card" key={r.id}>
              <div className="ad-req-info">
                <b>{r.name}</b>
                <small>
                  {r.email} · {r.company || '회사 미지정'}
                  {r.team ? ' · ' + r.team : ''}
                </small>
              </div>
              <div className="ad-req-btns">
                <button className="ad-btn ok" onClick={() => onResolve(r.id, true)}>
                  승인
                </button>
                <button className="ad-btn danger" onClick={() => onResolve(r.id, false)}>
                  반려
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
