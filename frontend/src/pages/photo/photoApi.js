// 사진 분석(VLM) 페이지 전용 헬퍼 — 기존 라벨링 페이지의 분석 호출(labelingApi.js)을 그대로 재사용한다.
// 업로드 이미지가 있으면 실제 Vision 분석(자유 서술), 없으면 프리셋 예시 분석(구조화 라벨)을 돌려주는데
// 두 응답 모양이 달라, 화면에서 한 가지 모양으로 다루기 쉽게 정규화해서 돌려준다.
import { analyzeImage, analyzePreset } from '../labeling/labelingApi.js'
import { isRealAI } from '../../lib/aiBackend.js'

// 4개 분석 모드 — 상단 모드 카드 순서 고정. preset 은 backend/services.py _PRESET_FINDINGS 의 키와 동일.
export const MODES = [
  { key: 'damage', title: '파손 찾기', sub: '어디가 깨졌나요?', preset: '도로 파손/포트홀 찾기', icon: '⌖' },
  { key: 'describe', title: '전체 설명', sub: '무엇이 찍혔나요?', preset: '이미지 전체 설명', icon: '▦' },
  { key: 'objects', title: '객체 목록', sub: '무엇이 몇 개인가요?', preset: '객체 목록 뽑기', icon: '☰' },
  { key: 'risk', title: '이상 상황', sub: '무엇이 위험한가요?', preset: '이상 상황 탐지', icon: '⚠' },
]

// 모드별 결과 요약 꼬리말 — 큰 숫자(count) 뒤에 붙는다. 예: "3" + "곳을 찾았어요".
export const resultSuffix = (modeKey) => {
  if (modeKey === 'objects') return '개를 찾았어요'
  if (modeKey === 'describe') return '가지를 정리했어요'
  if (modeKey === 'risk') return '건을 확인했어요'
  return '곳을 찾았어요'
}

// 등급(grade)+톤(tone) → 목록의 오른쪽 상태 표시. 위험도가 높은(red) 항목만 배지로 강조.
const toneToStatus = (tone) => {
  if (tone === 'red') return { badge: true, text: '보수 급함' }
  if (tone === 'orange') return { badge: false, text: '지켜보기' }
  return { badge: false, text: '경미' }
}

// 활성 사진 분석 — 업로드 파일이 있으면 실제 Vision(자유 서술), 없으면 프리셋 예시(구조화 라벨).
export const analyzePhoto = async (active, preset, customPrompt) => {
  if (active.file) {
    const result = await analyzeImage(active.file, preset, customPrompt)
    const lines = (result.description || '')
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => line.replace(/^[-*•]\s*/, ''))
    const isAi = isRealAI(result.backend)
    const engineName = result.backend === 'OPENAI' ? 'GPT Vision' : 'Gemini Vision'
    return {
      mode: 'text',
      lines,
      count: lines.length,
      engineText: isAi ? engineName : 'MOCK 분석',
      isAi,
    }
  }
  const result = await analyzePreset(preset, customPrompt, active.name)
  const items = (result.labels || []).map((l) => ({ ...l, status: toneToStatus(l.tone) }))
  return {
    mode: 'labels',
    items,
    count: items.length,
    engineText: '예시(MOCK)',
    isAi: false,
  }
}
