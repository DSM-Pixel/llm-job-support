// 활동 로그·작업 산출물(아티팩트) — 기존 common.js 의 logActivity/getActivity/
// saveArtifact/getArtifacts/deleteActivities/deleteArtifacts 를 그대로 이식.
// 바닐라와 '동일한' localStorage 키를 공유한다: gnsoft.activity.<pid>, gnsoft.artifacts.<pid>.
import { getProject, authToken } from './storage.js'

// 현재 프로젝트 id(없으면 "none") — 바닐라 _pid 와 동일.
const pid = () => (getProject() || {}).id || 'none'
const actKey = () => `gnsoft.activity.${pid()}`
const artKey = () => `gnsoft.artifacts.${pid()}`

// 현재 페이지 이름(예: dashboard) — 바닐라와 동일하게 경로 마지막 세그먼트에서 .html 제거.
const curPage = () => (location.pathname.split('/').pop() || '').replace('.html', '')

// 서버로 조용히 이중 기록 — 대시보드 서버 통계·Redis 캐시의 원천.
// (로그인 토큰 없으면 생략, 실패는 무시. UI를 절대 막지 않는다.)
const syncToServer = (path, payload) => {
  const token = authToken()
  if (!token) return
  try {
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, project: pid(), ...payload }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* 무시 */
  }
}

// 사용자가 한 행동을 {ts, page, type, label} 로 누적(최근 300개 유지) + 서버 이중 기록.
export function logActivity(type, label = '') {
  const ts = Date.now()
  const page = curPage()
  const clean = String(label).slice(0, 200)
  try {
    const list = JSON.parse(localStorage.getItem(actKey()) || '[]')
    list.push({ ts, page, type, label: clean })
    localStorage.setItem(actKey(), JSON.stringify(list.slice(-300)))
  } catch {
    /* localStorage 불가 시 무시 */
  }
  syncToServer('/api/activity/log', { type, label: clean, page, ts })
}

export function getActivity() {
  try {
    return JSON.parse(localStorage.getItem(actKey()) || '[]')
  } catch {
    return []
  }
}

// 산출물 종류 → 프로젝트 '소스' 유형(이미지셋/문서/공공데이터/보고서) 매핑.
const _sourceKind = (art) => {
  if (art.kind === 'image') return '이미지셋'
  if (art.kind === 'report') return '보고서'
  if (String(art.title || '').includes('공공데이터')) return '공공데이터'
  return '문서'
}

// 실제 산출물(라벨링·보고서·RAG·공공데이터)을 현재 프로젝트의 '소스(검수 대기)'로
// 자동 등록 → 소스 검수를 실데이터와 연결. 서버가 이름·유형으로 중복을 막고(재생성해도
// 안 쌓임) 기존 검수 상태를 보존한다. 프로젝트 미선택 시 생략, 실패는 무시.
const registerSource = (art) => {
  const p = pid()
  const name = art.title || art.name
  if (!p || p === 'none' || !name) return
  try {
    fetch(`/api/projects/${p}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, kind: _sourceKind(art) }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* 무시 */
  }
}

// 한 프로젝트가 보관하는 작업물 개수 상한. 폴더(배치) 라벨링 한 번에 수십 장이
// 들어올 수 있어 24 → 60 으로 상향(그래도 초과분은 용량 한도 안에서 오래된 것부터 밀림).
const MAX_ARTIFACTS = 60

// 작업 산출물 저장 — 같은 id 는 최신 것으로 교체, 최근 MAX_ARTIFACTS개 유지, 용량 초과 시 이미지부터 제거.
export function saveArtifact(art) {
  const page = curPage()
  const entry = { ts: Date.now(), page, ...art }
  // 서버에는 통계용 메타만(이미지 썸네일 등 무거운 값 제외).
  syncToServer('/api/activity/artifact', {
    id: art.id || '',
    kind: art.kind || '',
    title: art.title || art.name || '',
    page,
    ts: entry.ts,
  })
  registerSource(entry) // 산출물을 현재 프로젝트 소스(검수 대기)로 등록
  try {
    let list = JSON.parse(localStorage.getItem(artKey()) || '[]')
    if (art.id) list = list.filter((a) => a.id !== art.id)
    list.push(entry)
    list = list.slice(-MAX_ARTIFACTS)
    // 용량(localStorage) 초과 시 이미지가 있는 오래된 항목부터 하나씩 지우며 재시도.
    // 최대 list 길이만큼 시도해 폴더 대량 저장에서도 마지막엔 반드시 들어가게 한다.
    for (let i = 0; i <= list.length; i++) {
      try {
        localStorage.setItem(artKey(), JSON.stringify(list))
        return
      } catch {
        const idx = list.findIndex((a) => a.image)
        list.splice(idx >= 0 ? idx : 0, 1)
        if (!list.length) return
      }
    }
  } catch {
    /* 무시 */
  }
}

export function getArtifacts() {
  try {
    return JSON.parse(localStorage.getItem(artKey()) || '[]')
  } catch {
    return []
  }
}

// ts 목록에 해당하는 기록을 영구 삭제(기록 관리에서 사용).
const removeRecords = (key, tsSet) => {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]').filter((x) => !tsSet.has(x.ts))
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* 무시 */
  }
}

export const deleteActivities = (tsArr) => removeRecords(actKey(), new Set(tsArr.map(Number)))
export const deleteArtifacts = (tsArr) => removeRecords(artKey(), new Set(tsArr.map(Number)))
