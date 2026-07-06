import { api } from '../../lib/api.js'

// 보고서 생성/수정 엔드포인트 — 기존 report.js 가 쓰던 경로 그대로.
// web=false 면 빠른 예시, web=true 면 인터넷 웹 검색(Gemini 그라운딩) 기반.
export const genReport = (body, web) =>
  api(web ? '/api/report/web' : '/api/report', body)

// 내 웹 활동을 날짜 범위로 필터해 분석·통계 보고서 생성.
export const genActivity = (body) => api('/api/report/activity', body)

// RAG 검색 결과를 그대로 이어받아 보고서로 생성.
export const genFromRag = (body) => api('/api/report/from-rag', body)

// AI 대화 패널(보고서 편집기) — 수정 지시/질문 처리.
export const reviseReport = (body) => api('/api/report/revise', body)

// 양식 파일 업로드 → AI가 구조를 분석해 채운 보고서 생성.
// 파일 업로드라 api()(JSON) 를 못 쓰고 FormData 로 직접 fetch. 응답은 /api/report/web 과 동일 스키마.
export const genFromTemplate = (file, period = '', includeChart = true) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('period', period)
  fd.append('include_chart', includeChart ? 'true' : 'false')
  return fetch('/api/report/from-template', { method: 'POST', body: fd }).then((r) => r.json())
}
