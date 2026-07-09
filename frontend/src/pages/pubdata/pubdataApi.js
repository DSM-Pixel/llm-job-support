import { api } from '../../lib/api.js'
import { saveArtifact } from '../../lib/activity.js'
import { toast } from '../../lib/toast.js'

// 키워드로 공공데이터 검색 — POST /api/pubdata/search (바닐라 동일 엔드포인트).
export function searchPubdata(keyword) {
  return api('/api/pubdata/search', { keyword })
}

// 등록된 데이터셋 현황 — GET /api/pubdata/catalog.
export function fetchCatalog() {
  return api('/api/pubdata/catalog')
}

// 카탈로그 응답 → 안내 문구(바닐라 loadCatalog 동일).
export function catalogText(c) {
  const domains = new Set(c.datasets.map((d) => d.domain)).size
  const mode = c.live ? '실데이터 연계' : '샘플(키 미등록)'
  return `▤ 현재 ${c.total}개 공공데이터셋 · ${domains}개 도메인 연동 중 (${c.loaded}개 적재 · ${mode}). 데이터셋은 레지스트리에 설정만 추가하면 늘어납니다.`
}

// 통계 요약을 보고서 '내 작업에서 가져오기'로 넘긴다 — 바닐라 sendToReport 동일.
export function sendToReport(data) {
  if (!data) return
  saveArtifact({
    kind: 'rag',
    cat: '공공데이터',
    title: `공공데이터 · ${data.domain}`,
    question: `${data.keyword} 관련 공공데이터 통계`,
    answer: data.summary,
    source: data.datasets[0]?.title || 'data.go.kr',
    snippet: (data.insights && data.insights[0]) || `${data.domain} 관련 공공데이터`,
  })
  toast('보고서 자료로 저장했습니다')
  window.setTimeout(() => (location.href = 'report.html'), 500)
}
