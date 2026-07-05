import { Fragment } from 'react'
import { getProject } from '../lib/storage.js'
import { useShell } from './ShellContext.js'

// 사이드바 네비게이션 — 기존 dashboard.html 의 .nav-group 마크업을 그대로 재현.
// page 값이 activeNav 와 같은 항목이 active( + nav-chevron )가 된다.
const NAV = [
  {
    label: '홈',
    items: [{ icon: '⊞', text: '메인 대시보드', href: 'dashboard.html', page: 'dashboard' }],
  },
  {
    label: '질문 · 검색',
    items: [
      { icon: '☰', text: '자연어 질의', href: 'query.html', page: 'query' },
      { icon: '⌕', text: '문서 지식 검색', href: 'rag.html', page: 'rag' },
      { icon: '◫', text: '공공데이터 통계', href: 'pubdata.html', page: 'pubdata' },
    ],
  },
  {
    label: '데이터 작업',
    items: [
      { icon: '⌗', text: '이미지 분석·라벨링', href: 'labeling.html', page: 'labeling' },
      { icon: '▱', text: '데이터 관리', href: 'data.html', page: 'data' },
    ],
  },
  {
    label: '자동화 · 보고서',
    items: [
      { icon: '✦', text: '업무 자동화', href: 'agent.html', page: 'agent' },
      { icon: '⇱', text: '요약·보고서 생성', href: 'report.html', page: 'report' },
    ],
  },
]

export default function Sidebar({ activeNav }) {
  const { settings, openSettings, openHistory, toggleAi, aiOpen } = useShell()
  const proj = getProject()
  const name = settings.name || '사용자'

  return (
    <aside className="sidebar">
      <a className="logo" href="dashboard.html">
        <img className="logo-img" src="/assets/img/logomark-transparent.png" alt="" />
        GNSoft
      </a>

      {/* 프로젝트 칩 — 현재 프로젝트 이모지·이름, 클릭 시 프로젝트 선택으로. */}
      {proj && (
        <button
          className="project-switch"
          type="button"
          title="프로젝트 전환"
          onClick={() => (location.href = 'projects.html')}
        >
          <span className="ps-emoji">{proj.emoji || '📁'}</span>
          <span className="ps-name">{proj.name || '프로젝트'}</span>
          <span className="ps-swap">전환 ⇄</span>
        </button>
      )}

      <nav className="nav-group">
        {NAV.map((group) => (
          <Fragment key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map((it) => {
              const active = it.page === activeNav
              return (
                <a
                  key={it.page}
                  className={'nav-item' + (active ? ' active' : '')}
                  data-icon={it.icon}
                  href={it.href}
                >
                  {it.text}
                  {active && (
                    <>
                      {' '}
                      <span className="nav-chevron">›</span>
                    </>
                  )}
                </a>
              )
            })}
          </Fragment>
        ))}
      </nav>

      <button
        className={'ai-open' + (aiOpen ? ' is-on' : '')}
        type="button"
        onClick={toggleAi}
      >
        ✦ AI와 대화하기
      </button>
      <button
        className="history-open"
        type="button"
        title="내 질의·검색·이미지 작업 기록을 보고 삭제"
        onClick={openHistory}
      >
        기록 관리
      </button>

      <div className="user-box">
        <span className="avatar">{name.slice(-2)}</span>
        <div>
          <div className="user-name">{name}</div>
          <div className="user-team">{settings.team || ''}</div>
        </div>
        <span
          className="gear"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={openSettings}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openSettings()
            }
          }}
        >
          ⚙
        </span>
      </div>
    </aside>
  )
}
