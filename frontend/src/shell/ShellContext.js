import { createContext, useContext } from 'react'

// 앱 셸 컨텍스트 — 사이드바/자식 페이지가 설정과 모달 열기 콜백을 공유한다.
// value: { settings, openSettings, openHistory, toggleAi, aiOpen }
export const ShellContext = createContext(null)

export const useShell = () => useContext(ShellContext)
