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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, bumpProfile] = useState(0) // 설정 저장 후 아바타 이니셜 갱신용 리렌더

  // ── 갤러리 로드(페이지네이션) ──
  const loadGallery = useCallback(async (page = 1) => {
    const p = Math.max(1, page)
    try {
      const data = await api(`/api/projects?page=${p}&page_size=${PAGE_SIZE}`)
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
      const p = await api(`/api/projects/${pid}`)
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
    setProject({ id: p.id, name: p.name, emoji: p.emoji })
    toast(`‘${p.name}’ 프로젝트로 전환`)
    location.href = 'dashboard.html'
  }

  // ── 생성/소스/검수/삭제 ──
  const createProject = async ({ name, emoji }) => {
    setModal(null)
    if (!name) return
    const p = await api('/api/projects', { name, emoji: emoji || '📁' })
    toast('프로젝트를 만들었습니다')
    openProject(p.id)
  }

  const addSource = async ({ name, kind }) => {
    setModal(null)
    if (!name || !detail) return
    const p = await api(`/api/projects/${detail.id}/sources`, { name, kind })
    if (!p.error) {
      toast('소스를 추가했습니다 (검수 대기)')
      setDetail(p)
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
      await del(`/api/projects/${pid}`)
    } catch {
      toast('삭제에 실패했습니다')
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
            <div className="pj-grid">
              <button className="pj-card pj-new" onClick={() => setModal({ kind: 'new' })}>
                <span className="pj-new-plus">+</span>새 프로젝트 만들기
              </button>
              {gallery.projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onEnter={enterProject}
                  onDelete={(pid) => setModal({ kind: 'delete', pid })}
                  onOpen={openProject}
                />
              ))}
            </div>
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
            onAddSource={() => setModal({ kind: 'source' })} onReview={setReview} canReview={adminLink} />
        )}
      </main>

      {modal?.kind === 'new' && (
        <InputModal
          title="새 프로젝트"
          fields={[
            { name: 'name', label: '이름', placeholder: '예: CCTV 이상행동 검색', autoFocus: true },
            { name: 'emoji', label: '아이콘', type: 'select', options: EMOJIS },
          ]}
          onSubmit={createProject}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'source' && (
        <InputModal
          title="소스 추가"
          fields={[
            { name: 'name', label: '소스 이름', placeholder: '예: 2026Q3 포트홀 이미지셋', autoFocus: true },
            { name: 'kind', label: '유형', type: 'select', options: ['이미지셋', '문서', '공공데이터', '보고서'] },
          ]}
          onSubmit={addSource}
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
