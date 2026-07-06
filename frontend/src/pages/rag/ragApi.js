// RAG 페이지 전용 데이터 로직 — 기존 web/assets/js/rag.js 의 API 호출을 그대로 이식.
// 지식이 프로젝트별로 분리되도록 모든 호출에 현재 프로젝트 id 를 실어 보낸다.
import { api } from '../../lib/api.js'
import { getProject } from '../../lib/storage.js'

// 현재 프로젝트 id — 바닐라 PID() 와 동일.
export const pid = () => (getProject() || {}).id || ''

// 질의 → 하이브리드 RAG 검색
export const searchRag = (query) => api('/api/rag/search', { query, project: pid() })

// 참고중인 파일 목록(실제 청크 수)
export const ragFiles = () => api(`/api/rag/files?project=${encodeURIComponent(pid())}`)

// 문서 열람(청크 단위)
export const ragDoc = (name) =>
  api(`/api/rag/doc?source=${encodeURIComponent(name)}&project=${encodeURIComponent(pid())}`)

// 색인에서 파일 삭제
export const removeSource = (name) => api('/api/rag/remove', { source: name, project: pid() })

// 문서 색인(스테이징/웹 결과)
export const indexDocs = (docs, useSamples) =>
  api('/api/rag/index', { docs, use_samples: useSamples, project: pid() })

// 웹에서 찾아 넣기
export const webSearch = (keyword) => api('/api/rag/web-search', { keyword })

// 샘플 점검 문서 포함/제외
export const setSamples = (on) => api('/api/rag/samples', { on, project: pid() })

// 참고 파일 전체 초기화
export const resetRag = () => api('/api/rag/reset', { project: pid() })

// 텍스트 문서만 본문을 읽어 검색에 활용(그 외는 이름만 색인).
export const readText = (file) =>
  new Promise((resolve) => {
    if (!/\.(txt|md|csv|json)$/i.test(file.name)) return resolve('')
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').slice(0, 4000))
    reader.onerror = () => resolve('')
    reader.readAsText(file)
  })
