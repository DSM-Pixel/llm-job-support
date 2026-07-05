import { useState } from 'react'
import { getSettings } from '../lib/storage.js'
import { ShellContext } from './ShellContext.js'
import Sidebar from './Sidebar.jsx'
import SettingsModal from './SettingsModal.jsx'
import HistoryModal from './HistoryModal.jsx'
import AiDock from './AiDock.jsx'

// 공용 앱 셸 — 8개 내부 페이지의 공통 뼈대(사이드바 + 상단바 + 설정/기록/AI 모달).
// 기존 web/pages/*.html 의 .app > .sidebar + main.main 구조를 그대로 재현한다.
export default function AppShell({ title, activeNav, children }) {
  // 설정을 상태로 들고 있어 저장 시 사이드바 프로필·인사말이 즉시 갱신되도록 한다.
  const [settings, setSettings] = useState(() => getSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const ctx = {
    settings,
    openSettings: () => setSettingsOpen(true),
    openHistory: () => setHistoryOpen(true),
    toggleAi: () => setAiOpen((v) => !v),
    aiOpen,
  }

  return (
    <ShellContext.Provider value={ctx}>
      <div className="app">
        <Sidebar activeNav={activeNav} />
        <main className="main">
          <header className="topbar">
            <h1>{title}</h1>
            <span className="live">LIVE</span>
            <div className="top-actions">
              <span>?</span>
              <span>♧</span>
            </div>
          </header>
          {children}
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(merged) => setSettings(merged)}
      />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <AiDock open={aiOpen} onClose={() => setAiOpen(false)} />
    </ShellContext.Provider>
  )
}
