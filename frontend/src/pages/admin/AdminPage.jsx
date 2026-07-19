import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/toast.js'
import { getSettings } from '../../lib/storage.js'
import { ConfirmModal } from '../../components/Modal.jsx'
import { Pager } from '../../components/Pager.jsx'
import { SummaryChips } from './components/SummaryChips.jsx'
import { RequestList } from './components/RequestList.jsx'
import DataKeyCard from './components/DataKeyCard.jsx'
import { MemberTable } from './components/MemberTable.jsx'
import { MemberDetailModal } from './components/MemberDetailModal.jsx'
import SettingsModal from '../../shell/SettingsModal.jsx'
import {
  fetchMembers,
  fetchRequests,
  resolveRequest as apiResolveRequest,
  fetchMember,
  setMemberStatus,
  setMemberReviewer,
} from './adminApi.js'

const PAGE_SIZE = 20

// 어드민 — 같은 회사(슈퍼는 전체) 멤버의 활동·기록·상태 관리.
// 권한은 서버가 모든 /api/admin/* 요청에서 재검증한다(여긴 화면 제어만).
export default function AdminPage() {
  const [data, setData] = useState(null) // 멤버 목록 응답(권한 있을 때만)
  const [denied, setDenied] = useState(false)
  const [requests, setRequests] = useState(null) // 슈퍼 전용 승인 대기(null=숨김)
  const [detail, setDetail] = useState(null) // 상세 모달 응답
  const [confirmUid, setConfirmUid] = useState(null) // 비활성화 확인 대상
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, bumpProfile] = useState(0) // 설정 저장 후 아바타 갱신용 리렌더
  const pageRef = useRef(1) // 현재 페이지(토글/승인 후 같은 페이지 유지)

  const isSuper = !!data?.is_super

  // ── 관리자 승인 대기(슈퍼 어드민) ──
  const loadRequests = useCallback(async () => {
    try {
      const d = await fetchRequests()
      if (!d.ok) return setRequests(null)
      setRequests(d.requests || [])
    } catch {
      setRequests(null)
    }
  }, [])

  // ── 멤버 목록 로드(페이지네이션) ──
  const load = useCallback(
    async (page = pageRef.current) => {
      const p = Math.max(1, page)
      pageRef.current = p
      try {
        const d = await fetchMembers(p, PAGE_SIZE)
        if (!d.ok) {
          setData(null)
          setDenied(true)
          return
        }
        setDenied(false)
        setData(d)
        // 슈퍼 어드민: 승인 대기 패널 로드. 그 외엔 숨김.
        if (d.is_super) loadRequests()
        else setRequests(null)
      } catch {
        setData(null)
        setDenied(true)
      }
    },
    [loadRequests],
  )

  useEffect(() => {
    load(1)
  }, [load])

  // ── 상세 모달 ──
  const openDetail = useCallback(async (uid) => {
    try {
      const d = await fetchMember(uid)
      if (!d.ok) return toast('상세를 불러오지 못했습니다')
      setDetail(d)
    } catch {
      /* toast in api() */
    }
  }, [])

  // ── 활성/비활성 전환 ──
  const runStatus = useCallback(
    async (uid, active) => {
      try {
        const r = await setMemberStatus(uid, active)
        if (!r.ok) return toast(r.error || '변경에 실패했습니다')
        toast(active ? '계정을 활성화했습니다' : '계정을 비활성화했습니다')
        load()
      } catch {
        /* toast in api() */
      }
    },
    [load],
  )

  const toggleActive = useCallback(
    (uid, currentlyActive) => {
      const act = !currentlyActive
      // 활성화는 즉시, 비활성화는 확인 후(로그인 즉시 차단됨).
      if (act) runStatus(uid, true)
      else setConfirmUid(uid)
    },
    [runStatus],
  )

  // ── 검수자(팀장) 지정/해제 ──
  const setReviewer = useCallback(
    async (uid, makeReviewer, name = '') => {
      try {
        const r = await setMemberReviewer(uid, makeReviewer)
        if (!r.ok) return toast(r.error || '변경에 실패했습니다')
        toast(makeReviewer ? `${name} 님을 검수자로 지정했습니다` : `${name} 님의 검수자 권한을 해제했습니다`)
        load()
      } catch {
        /* toast in api() */
      }
    },
    [load],
  )

  // ── 승인/반려 ──
  const resolveRequest = useCallback(
    async (uid, approve) => {
      try {
        const r = await apiResolveRequest(uid, approve)
        if (!r.ok) return toast(r.error || '처리에 실패했습니다')
        toast(approve ? '관리자 신청을 승인했습니다' : '관리자 신청을 반려했습니다')
        loadRequests()
        load()
      } catch {
        /* toast in api() */
      }
    },
    [load, loadRequests],
  )

  // 로고 → 회사 어드민은 프로젝트 목록, 슈퍼(운영자)는 콘솔 유지.
  const goLogo = () => {
    location.href = isSuper ? 'admin.html' : 'projects.html'
  }

  // 제목·부제는 역할에 맞게: 슈퍼=전체 회원, 회사 어드민=자기 회사.
  const title = isSuper ? '회원 관리' : '회사 멤버 관리'
  const subtitle = isSuper
    ? '전체 회원의 활동·기록·상태를 관리하고, 관리자 신청을 승인합니다.'
    : `${data?.company || '우리 회사'} 멤버의 활동·기록·상태를 관리합니다.`

  return (
    <div className="pj-landing">
      <header className="pj-top">
        <span className="pj-logo" onClick={goLogo} style={{ cursor: 'pointer' }}>
          <img className="logo-img" src="/assets/img/logomark-transparent.png" alt="" />
          GNSoft AI 플랫폼
        </span>
        <div className="pj-top-right">
          {/* 슈퍼는 서비스(프로젝트)를 쓰지 않으므로 '프로젝트 목록' 링크를 숨긴다. */}
          {!isSuper && (
            <a className="ad-back-link" href="projects.html">
              ← 프로젝트 목록
            </a>
          )}
          <div className="user-box">
            <span
              className="avatar"
              title="내 프로필"
              role="button"
              tabIndex={0}
              onClick={() => setSettingsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSettingsOpen(true)
                }
              }}
            >
              {(getSettings().name || '사용자').slice(-2)}
            </span>
          </div>
        </div>
      </header>

      <main className="pj-main">
        {denied ? (
          <section className="ad-denied">
            <h2>접근 권한이 없습니다</h2>
            <p>이 페이지는 관리자만 열 수 있습니다.</p>
            <a className="btn primary" href="projects.html">
              프로젝트 목록으로
            </a>
          </section>
        ) : data ? (
          <section className="ad-wrap">
            <div className="ad-head">
              <div>
                <h2>{title}</h2>
                <p className="ad-sub">{subtitle}</p>
              </div>
              <SummaryChips members={data.members} total={data.total} />
            </div>

            {isSuper && requests && (
              <RequestList requests={requests} onResolve={resolveRequest} />
            )}

            {isSuper && <DataKeyCard />}

            <MemberTable
              members={data.members}
              meId={data.me || ''}
              isSuper={isSuper}
              onDetail={openDetail}
              onToggle={toggleActive}
              onReviewer={setReviewer}
            />
            <Pager
              page={data.page || 1}
              pages={data.pages || 1}
              total={data.total}
              onGo={load}
              info={`${(data.total || 0).toLocaleString('ko-KR')}명`}
            />
          </section>
        ) : null}
      </main>

      {detail && <MemberDetailModal detail={detail} onClose={() => setDetail(null)} />}
      {confirmUid && (
        <ConfirmModal
          messageHtml="이 계정을 비활성화할까요?<br />해당 멤버는 즉시 로그아웃되고 로그인할 수 없습니다."
          onConfirm={() => {
            const uid = confirmUid
            setConfirmUid(null)
            runStatus(uid, false)
          }}
          onClose={() => setConfirmUid(null)}
        />
      )}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => bumpProfile((v) => v + 1)}
      />
    </div>
  )
}
