import { getAuth, getProject } from '../lib/storage.js'
import { useShell } from './ShellContext.js'
import BrandMark from '../components/BrandMark.jsx'

// 상단 가로 내비 — Pixel 브랜드 + 7개 메뉴 + 우상단 프로젝트 선택기 + 아바타.
// 디자인(도로 점검) 목업의 공통 헤더를 그대로 재현한다.
// activeNav 가 item.page 와 같으면 active 밑줄이 붙는다.
const NAV = [
  { text: '홈', href: 'dashboard.html', page: 'dashboard' },
  { text: '라벨링', href: 'labeling.html', page: 'labeling' },
  { text: '사진 설명', href: 'photo.html', page: 'photo' },
  { text: '문서 검색', href: 'rag.html', page: 'rag' },
  { text: '공공데이터', href: 'pubdata.html', page: 'pubdata' },
  { text: '업무 절차', href: 'workflow.html', page: 'workflow' },
  { text: '보고서', href: 'report.html', page: 'report' },
]

export default function TopNav({ activeNav }) {
  const { settings, openSettings } = useShell()
  const proj = getProject()
  const auth = getAuth()
  // 권한 분기 — 로그인 시 저장된 역할(is_admin/is_super)로 '관리' 진입을 노출한다.
  // (회사 대빵·슈퍼 어드민만. 서버 재확인은 admin 페이지 진입 시 /api/auth/me 로 한 번 더 한다)
  const canManage = !!(auth && (auth.is_admin || auth.is_super))
  const name = settings.name || '사용자'

  return (
    <header className="topnav">
      <a className="topnav-brand" href="dashboard.html">
        <BrandMark />
        Pixel
      </a>

      <nav className="topnav-menu">
        {NAV.map((it) => (
          <a
            key={it.page}
            className={'topnav-item' + (it.page === activeNav ? ' active' : '')}
            href={it.href}
          >
            {it.text}
          </a>
        ))}
      </nav>

      <div className="topnav-right">
        {canManage && (
          <a className="topnav-manage" href="admin.html" title="회사 관리">
            관리
          </a>
        )}
        <button
          className="proj-chip"
          type="button"
          title="프로젝트 전환"
          onClick={() => (location.href = 'projects.html')}
        >
          <span className="proj-name">{(proj && proj.name) || '도로 점검 2026-08'}</span>
          <span className="proj-caret">▾</span>
        </button>
        <button
          className="topnav-avatar"
          type="button"
          title="설정"
          onClick={openSettings}
        >
          {name.slice(-2)}
        </button>
      </div>
    </header>
  )
}
