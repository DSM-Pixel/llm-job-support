// 어드민 전용 API 호출/포매팅 — 기존 admin.js 의 /api/admin/* 규약을 그대로 따른다.
import { api } from '../../lib/api.js'
import { authToken } from '../../lib/storage.js'

// 멤버 목록(페이지네이션). 서버가 권한을 재검증하고 {ok, me, is_super, company, members, total, page, pages} 반환.
export function fetchMembers(page, pageSize) {
  return api('/api/admin/members', { token: authToken(), page, page_size: pageSize })
}

// 관리자 승인 대기 목록(슈퍼 어드민 전용).
export function fetchRequests() {
  return api('/api/admin/requests', { token: authToken() })
}

// 관리자 신청 승인/반려.
export function resolveRequest(userId, approve) {
  return api('/api/admin/request/resolve', { token: authToken(), user_id: userId, approve })
}

// 멤버 상세(프로필·통계·최근 활동).
export function fetchMember(userId) {
  return api('/api/admin/member', { token: authToken(), user_id: userId })
}

// 계정 활성/비활성 전환.
export function setMemberStatus(userId, active) {
  return api('/api/admin/member/status', { token: authToken(), user_id: userId, active })
}

// 검수자(팀장) 지정/해제 — 대표(대빵)·슈퍼만, 동일 회사 팀원 대상.
export function setMemberReviewer(userId, isReviewer) {
  return api('/api/admin/member/reviewer', {
    token: authToken(),
    user_id: userId,
    is_reviewer: isReviewer,
  })
}

// 가입일 등 초 단위 타임스탬프 → 'YYYY.M.D'. 기존 admin.js fmtDate 이식.
export function fmtDate(sec) {
  if (!sec) return '—'
  const d = new Date(sec * 1000)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

// 숫자 천단위 구분 — 기존 admin.js num 이식.
export const num = (n) => Number(n || 0).toLocaleString('ko-KR')
