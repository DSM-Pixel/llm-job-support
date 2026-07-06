// 회사 대표(대빵) 승인 대기(슈퍼 어드민 전용) — 승인 시 회사당 1명, 기존 대표 자동 이임.
export function RequestList({ requests, onResolve }) {
  return (
    <section className="ad-requests">
      <h3 className="ad-req-title">
        회사 대표 승인 대기 <span className="ad-req-count">{requests.length}</span>
      </h3>
      <p className="ad-req-note">
        승인하면 그 회사의 대표가 됩니다. 회사당 대표는 1명이라 기존 대표는 자동 이임됩니다.
      </p>
      <div className="ad-req-list">
        {requests.length === 0 ? (
          <p className="ad-req-empty">대기 중인 대표 신청이 없습니다.</p>
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
