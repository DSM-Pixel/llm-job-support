// 데이터 관리 페이지 전용 순수 헬퍼 — 기존 web/assets/js/data.js 로직을 그대로 이식.

// 유형별 이름 앞 아이콘(바닐라 ICONS 동일).
export const ICONS = { 라벨: '⬡', 원본: '⊡', 공공데이터: '▱', 문서: '☰' }

// 필터 칩(바닐라 마크업 순서 그대로).
export const CHIPS = ['전체', '원본 이미지', '라벨', '문서', '공공데이터']

// 업로드 파일명 확장자로 유형 추정(바닐라 guessKind 동일).
export function guessKind(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png', 'bmp', 'mp4'].includes(ext)) return '원본'
  if (['json', 'coco', 'xml'].includes(ext)) return '라벨'
  if (['csv'].includes(ext)) return '공공데이터'
  if (['md', 'txt', 'pdf'].includes(ext)) return '문서'
  return '원본'
}

// 표에 표시할 형식 라벨(바닐라와 동일한 대문자 확장자).
export function fileExtUpper(name) {
  return (name.split('.').pop() || 'FILE').toUpperCase()
}

// 상단 통계 카드 값 — 유형별 개수(바닐라 updateStats 동일).
export function computeStats(rows) {
  const by = (k) => rows.filter((r) => r.kind === k).length
  return { 원본: by('원본'), 라벨: by('라벨'), 문서: by('문서'), 공공데이터: by('공공데이터') }
}
