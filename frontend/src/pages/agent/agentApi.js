import { api } from '../../lib/api.js'

// 이 페이지 전용 데이터 호출 — 바닐라 agent.js 와 동일 엔드포인트/페이로드.

// 목표(goal) → AI 에이전트가 업무 절차를 설계.
export const fetchPlan = (goal) => api('/api/agent/plan', { goal })

// 목표(goal) + 프로젝트 → 원클릭 실행(각 단계 실행 + 결과물 종합).
export const fetchRun = (goal, project) => api('/api/agent/run', { goal, project })
