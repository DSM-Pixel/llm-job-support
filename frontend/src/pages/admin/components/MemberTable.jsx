import { relTime } from '../../../lib/time.js'
import { fmtDate, num } from '../adminApi.js'

// 상태 배지 — 기존 statusBadge 이식.
function StatusBadge({ active }) {
  return active ? (
    <span className="ad-badge ok">활성</span>
  ) : (
    <span className="ad-badge off">비활성</span>
  )
}

// 멤버 표 — 기존 renderRows + 표 헤더/빈 안내 이식. 슈퍼는 회사 컬럼 노출(is-super).
export function MemberTable({ members, meId, isSuper, onDetail, onToggle, onReviewer }) {
  return (
    <>
      <div className="ad-table-wrap">
        <table className={`ad-table${isSuper ? ' is-super' : ''}`}>
          <thead>
            <tr>
              <th>멤버</th>
              <th className="ad-col-company">회사</th>
              <th>소속</th>
              <th className="ad-num">오늘</th>
              <th className="ad-num">최근 7일</th>
              <th className="ad-num">총 활동</th>
              <th className="ad-num">작업물</th>
              <th className="ad-num">프로젝트</th>
              <th>최근 활동</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isMe = m.id === meId
              const last = m.last_active ? relTime(m.last_active) : '없음'
              return (
                <tr key={m.id} className={m.active ? undefined : 'ad-row-off'}>
                  <td>
                    <div className="ad-member">
                      <span className="ad-avatar">{(m.name || '?').slice(-2)}</span>
                      <div className="ad-member-txt">
                        <b>
                          {m.name}{' '}
                          {m.is_super ? (
                            <span className="ad-tag">슈퍼</span>
                          ) : m.is_admin ? (
                            <span className="ad-tag">대표</span>
                          ) : m.is_reviewer ? (
                            <span className="ad-tag rv">검수자</span>
                          ) : null}
                          {isMe && <span className="ad-tag me">나</span>}
                        </b>
                        <small>{m.email}</small>
                      </div>
                    </div>
                  </td>
                  <td className="ad-col-company">{m.company || '—'}</td>
                  <td>
                    {m.team || '—'}
                    <br />
                    <small className="ad-muted">가입 {fmtDate(m.created)}</small>
                  </td>
                  <td className="ad-num">{num(m.today)}</td>
                  <td className="ad-num">{num(m.week)}</td>
                  <td className="ad-num">{num(m.total)}</td>
                  <td className="ad-num">{num(m.artifacts)}</td>
                  <td className="ad-num">{num(m.projects)}</td>
                  <td>
                    <small>{last}</small>
                  </td>
                  <td>
                    <StatusBadge active={m.active} />
                  </td>
                  <td className="ad-actions">
                    <button className="ad-btn" onClick={() => onDetail(m.id)}>
                      상세
                    </button>
                    {/* 검수자 지정/해제 — 팀원 대상만(대표·슈퍼·본인 제외). */}
                    {onReviewer && !isMe && !m.is_admin && !m.is_super && (
                      <button
                        className={`ad-btn ${m.is_reviewer ? 'rv-on' : 'rv'}`}
                        onClick={() => onReviewer(m.id, !m.is_reviewer, m.name)}
                        title="검수(승인/반려) 권한을 주거나 회수합니다"
                      >
                        {m.is_reviewer ? '검수자 해제' : '검수자 지정'}
                      </button>
                    )}
                    {/* 본인은 비활성화 불가 → 토글 숨김. */}
                    {!isMe && (
                      <button
                        className={`ad-btn ${m.active ? 'danger' : 'ok'}`}
                        onClick={() => onToggle(m.id, m.active)}
                      >
                        {m.active ? '비활성화' : '활성화'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {members.length === 0 && <p className="ad-empty">표시할 멤버가 없습니다.</p>}
    </>
  )
}
