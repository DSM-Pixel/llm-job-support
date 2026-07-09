import { useCallback, useEffect, useState } from 'react'
import { api, del } from '../../lib/api.js'
import { toast } from '../../lib/toast.js'
import { getSettings, setProject } from '../../lib/storage.js'
import { Pager } from '../../components/Pager.jsx'
import { ConfirmModal, InputModal } from '../../components/Modal.jsx'
import ProjectCard from './components/ProjectCard.jsx'
import DetailView from './components/DetailView.jsx'
import SettingsModal from '../../shell/SettingsModal.jsx'

const PAGE_SIZE = 24
const EMOJIS = ['📁', '🛣️', '🏗️', '📹', '📊', '🚧', '🧭', '🗂️']

// 로그인 세션 토큰(검수 등 권한 필요한 요청에 첨부).
const authToken = () => {
  try {
    return (JSON.parse(localStorage.getItem('gnsoft.auth') || 'null') || {}).token || ''
  } catch {
    return ''
  }
}

export default function ProjectsPage() {
  const [view, setView] = useState('gallery') // 'gallery' | 'detail'
  const [gallery, setGallery] = useState({ projects: [], total: 0, pages: 1, page: 1 })
  const [curPage, setCurPage] = useState(1)
  const [detail, setDetail] = useState(null) // 상세 프로젝트(소스 포함)
  const [modal, setModal] = useState(null) // { kind: 'new' | 'source' | 'delete', pid? }
  const [adminLink, setAdminLink] = useState(false)
  const [canReview, setCanReview] = useState(false) // 검수(승인/반려) 권한 = 대표 ∨ 검수자
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, bumpProfile] = useState(0) // 설정 저장 후 아바타 이니셜 갱신용 리렌더

  // ── 갤러리 로드(페이지네이션) ──
  const loadGallery = useCallback(async (page = 1) => {
    const p = Math.max(1, page)
    try {
      const data = await api(
        `/api/projects?page=${p}&page_size=${PAGE_SIZE}&token=${encodeURIComponent(authToken())}`,
      )
      // 마지막 페이지에서 전부 삭제돼 빈 페이지가 되면 한 페이지 앞으로.
      if (p > (data.pages || 1)) return loadGallery(data.pages || 1)
      setCurPage(p)
      setGallery({
        projects: data.projects || [],
        total: data.total || 0,
        pages: data.pages || 1,
        page: data.page || p,
      })
    } catch {
      /* toast in api() */
    }
  }, [])

  // ── 상세 열기 ──
  const openProject = useCallback(async (pid) => {
    try {
      const p = await api(`/api/projects/${pid}?token=${encodeURIComponent(authToken())}`)
      if (p.error) return showGallery()
      setDetail(p)
      setView('detail')
      history.replaceState(null, '', `?p=${pid}`)
    } catch {
      /* toast */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showGallery = useCallback(() => {
    setView('gallery')
    history.replaceState(null, '', location.pathname)
    loadGallery(curPage)
  }, [curPage, loadGallery])

  // 프로젝트로 '진입' — 현재 프로젝트로 설정하고 작업 공간(대시보드)으로.
  const enterProject = (p) => {
    if (!p) return
    // 편집 가능(내 개인·우리 팀 공유)만 작업공간 진입 — 그 외는 소스 검수만.
    if (!p.editable) {
      toast('내 팀 프로젝트만 작업공간에 들어갈 수 있어요 (소스 검수만 가능)')
      return
    }
    setProject({ id: p.id, name: p.name, emoji: p.emoji })
    toast(`‘${p.name}’ 프로젝트로 전환`)
    location.href = 'dashboard.html'
  }

  // ── 생성/소스/검수/삭제 ──
  const createProject = async ({ name, emoji, visibility }) => {
    setModal(null)
    if (!name) return
    // 셀렉트 라벨('팀 공유 …' / '개인 …') → 서버 값('team' | 'private').
    const vis = String(visibility || '').startsWith('팀') ? 'team' : 'private'
    try {
      const p = await api('/api/projects', {
        token: authToken(),
        name,
        emoji: emoji || '📁',
        visibility: vis,
      })
      if (!p || p.error || !p.id) {
        toast('프로젝트 생성에 실패했습니다')
        return
      }
      toast(vis === 'team' ? '팀 공유 프로젝트를 만들었습니다' : '개인 프로젝트를 만들었습니다')
      openProject(p.id)
    } catch {
      toast('프로젝트 생성에 실패했습니다')
    }
  }

  // 검수(승인·반려·대기) — 관리자만 가능. 서버가 토큰으로 권한을 재검증한다.
  const setReview = async (sourceId, status) => {
    try {
      const p = await api('/api/review', { token: authToken(), source_id: sourceId, status })
      if (p.error) {
        toast(p.error)
        return
      }
      setDetail(p)
    } catch {
      /* toast */
    }
  }

  const deleteProject = async (pid) => {
    setModal(null)
    try {
      const res = await del(`/api/projects/${pid}?token=${encodeURIComponent(authToken())}`)
      const body = await res.json().catch(() => ({}))
      // 서버가 HTTP 200 으로 {error:...} 를 줄 수 있어 성공을 낙관하지 않는다.
      if (!res.ok || body.error) {
        toast(
          body.error === 'forbidden'
            ? '삭제 권한이 없습니다 (만든 본인·대표만 삭제 가능)'
            : '삭제에 실패했습니다',
        )
        return
      }
    } catch {
      toast('삭제에 실패했습니다')
      return
    }
    toast('프로젝트를 삭제했습니다')
    loadGallery(curPage)
  }

  // ── 최초 진입: 딥링크(?p=) + 어드민 권한 확인 ──
  useEffect(() => {
    const pid = new URLSearchParams(location.search).get('p')
    if (pid) openProject(pid)
    else loadGallery(1)

    // 어드민이면 '회사 관리' 노출 — 서버(/api/auth/me) 기준으로 권한 재확인.
    ;(async () => {
      let auth
      try {
        auth = JSON.parse(localStorage.getItem('gnsoft.auth') || 'null')
      } catch {
        auth = null
      }
      if (!auth?.token) return
      try {
        const me = await api('/api/auth/me', { token: auth.token })
        if (me.code === 'deactivated') {
          localStorage.removeItem('gnsoft.auth')
          location.replace('login.html')
          return
        }
        if (me.ok && me.user) {
          localStorage.setItem('gnsoft.auth', JSON.stringify({ ...auth, ...me.user }))
          if (me.user.is_super) {
            location.replace('admin.html') // 슈퍼는 관리 콘솔로.
            return
          }
          setAdminLink(!!me.user.is_admin)
          setCanReview(!!me.user.is_admin || !!me.user.is_reviewer)
        }
      } catch {
        /* 서버 미연결 시 버튼 숨김 유지 */
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pj-landing">
      <header className="pj-top">
        <span className="pj-logo" onClick={showGallery} style={{ cursor: 'pointer' }}>
          <img className="logo-img" src="/assets/img/logomark-transparent.png" alt="" />
          GNSoft AI 플랫폼
        </span>
        <div className="pj-top-right">
          {adminLink && (
            <a className="pj-admin-link" href="admin.html">
              👥 회사 관리
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
        {view === 'gallery' ? (
          <section className="pj-gallery">
            <div className="pj-gallery-head">
              <h2>프로젝트를 선택하세요</h2>
              <p>
                작업은 프로젝트(노트북) 단위로 나뉩니다. 프로젝트를 열면 그 안에서
                질의·검색·라벨링·보고서·기록이 따로 관리됩니다.
              </p>
            </div>
            {/* '편집 가능' 제목은 열람만 구역이 있을 때(대표 등)만 — 일반 유저는 편집 가능만
                있으므로 제목 없이 프로젝트만 보여준다. */}
            {gallery.projects.some((p) => !p.editable) && (
              <h3 className="pj-group-title">✏️ 내가 편집할 수 있는 프로젝트</h3>
            )}
            <div className="pj-grid">
              <button className="pj-card pj-new" onClick={() => setModal({ kind: 'new' })}>
                <span className="pj-new-plus">+</span>새 프로젝트 만들기
              </button>
              {gallery.projects
                .filter((p) => p.editable)
                .map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    editable
                    onEnter={enterProject}
                    onDelete={(pid) => setModal({ kind: 'delete', pid })}
                    onOpen={openProject}
                  />
                ))}
            </div>
            {gallery.projects.some((p) => !p.editable) && (
              <>
                <h3 className="pj-group-title">👁 열람만 가능한 프로젝트 · 소스 검수</h3>
                <p className="pj-group-sub">
                  내 팀이 아닌 프로젝트입니다. 작업공간에는 들어갈 수 없고, 소스 검수만 할 수
                  있습니다.
                </p>
                <div className="pj-grid">
                  {gallery.projects
                    .filter((p) => !p.editable)
                    .map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        editable={false}
                        onEnter={enterProject}
                        onDelete={(pid) => setModal({ kind: 'delete', pid })}
                        onOpen={openProject}
                      />
                    ))}
                </div>
              </>
            )}
            <Pager
              page={gallery.page}
              pages={gallery.pages}
              total={gallery.total}
              onGo={loadGallery}
              info={`프로젝트 ${gallery.total.toLocaleString('ko-KR')}개`}
            />
          </section>
        ) : (
          detail && <DetailView project={detail} onBack={showGallery} onEnter={enterProject}
            onReview={setReview}
            canReview={canReview} editable={!!detail.editable} />
        )}
      </main>

      {modal?.kind === 'new' && (
        <InputModal
          title="새 프로젝트"
          fields={[
            { name: 'name', label: '이름', placeholder: '예: CCTV 이상행동 검색', autoFocus: true },
            { name: 'emoji', label: '아이콘', type: 'select', options: EMOJIS },
            {
              name: 'visibility',
              label: '공개 범위',
              type: 'select',
              options: ['팀 공유 — 같은 팀이 함께 봄', '개인 — 검수자·대표만 열람'],
            },
          ]}
          onSubmit={createProject}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmModal
          messageHtml="이 프로젝트를 삭제할까요?<br />소스·검수 기록이 함께 사라집니다."
          onConfirm={() => deleteProject(modal.pid)}
          onClose={() => setModal(null)}
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
