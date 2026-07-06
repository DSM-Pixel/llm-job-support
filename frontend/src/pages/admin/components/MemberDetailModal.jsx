import { relTime } from '../../../lib/time.js'
import { fmtDate, num } from '../adminApi.js'

// 활동 유형별 아이콘 — 기존 admin.js ACT_ICON 그대로.
const ACT_ICON = {
  '자연어 질의': '☰',
  'RAG 검색': '⌕',
  '문서 색인': '▱',
  '이미지 분석': '⌗',
  '라벨 저장': '⌗',
  '데이터 업로드': '▱',
  검수: '✓',
  '업무 자동화': '✦',
}

// 멤버 상세 모달 — 기존 openDetail 마크업/클래스(ad-modal 등) 이식.
export function MemberDetailModal({ detail, onClose }) {
  const m = detail.member
  const s = detail.stats
  const recent = detail.recent || []
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal ad-modal">
        <header className="modal-head">
          <h3>{m.name} · 멤버 상세</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="ad-detail-grid">
            <div className="ad-dl">
              <span>이메일</span>
              <b>{m.email}</b>
            </div>
            <div className="ad-dl">
              <span>소속</span>
              <b>{[m.company, m.team].filter(Boolean).join(' · ') || '—'}</b>
            </div>
            <div className="ad-dl">
              <span>가입일</span>
              <b>{fmtDate(m.created)}</b>
            </div>
            <div className="ad-dl">
              <span>권한</span>
              <b>
                {m.is_admin ? '관리자' : '일반'} · {m.active ? '활성' : '비활성'}
              </b>
            </div>
            <div className="ad-dl">
              <span>동의</span>
              <b>
                {m.consent ? '필수 약관 동의 완료' : '미동의'}
                {m.marketing ? ' · 마케팅 수신' : ''}
              </b>
            </div>
          </div>
          <div className="ad-stat-row">
            <div className="ad-stat">
              <b>{num(s.today)}</b>
              <small>오늘</small>
            </div>
            <div className="ad-stat">
              <b>{num(s.week)}</b>
              <small>최근 7일</small>
            </div>
            <div className="ad-stat">
              <b>{num(s.total)}</b>
              <small>총 활동</small>
            </div>
            <div className="ad-stat">
              <b>{num(s.artifacts)}</b>
              <small>작업물</small>
            </div>
            <div className="ad-stat">
              <b>{num(s.projects)}</b>
              <small>프로젝트</small>
            </div>
          </div>
          <h4 className="ad-rec-title">최근 활동</h4>
          <ul className="ad-rec">
            {recent.length === 0 ? (
              <li className="ad-rec-empty">아직 활동 기록이 없습니다.</li>
            ) : (
              recent.map((r, i) => {
                const icon = ACT_ICON[r.type] || '•'
                const label = r.label ? ` — ${r.label}` : ''
                return (
                  <li key={i}>
                    <span className="ad-rec-ic">{icon}</span>
                    <div>
                      <b>{r.type + label}</b>
                      <small>
                        {r.project || ''} · {relTime(r.ts)}
                      </small>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
