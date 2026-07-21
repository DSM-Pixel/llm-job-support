// AI 백그라운드 작업 클라이언트 — 사이드바(별도 HTML 페이지) 이동에도 안 끊기게.
// 오래 걸리는 AI 호출을 서버 job 으로 돌리고, job_id 를 localStorage 에 둔다.
// 전역 poller(모든 페이지의 AppShell 에서 기동)가 완료를 감지해 결과를 per-kind 슬롯에
// 저장하고 이벤트를 쏜다. 각 페이지는 진입 시 슬롯을 회수하거나 이벤트로 결과를 받는다.
import { api } from './api.js'
import { toast } from './toast.js'

const ACTIVE_KEY = 'gnsoft.aijobs' // 진행 중 job 목록
const resultKey = (kind) => `gnsoft.aijobresult.${kind}` // 완료 결과 슬롯(kind별 최신 1개)
const curPage = () => (location.pathname.split('/').pop() || '').replace('.html', '')

const readActive = () => {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_KEY) || '[]')
  } catch {
    return []
  }
}
const writeActive = (l) => {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(l))
  } catch {
    /* 무시 */
  }
}

// 진행 중 작업 목록(전역 표시기용).
export const activeJobs = () => readActive()

// 완료 결과 회수(페이지 진입/복귀 시 1회). 있으면 반환하고 슬롯을 비운다.
export function takeJobResult(kind) {
  try {
    const raw = localStorage.getItem(resultKey(kind))
    if (!raw) return null
    localStorage.removeItem(resultKey(kind))
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// AI 작업 시작 — 서버 job 으로 돌리고 job_id 를 등록. 폴링은 전역 poller 가 담당.
// 같은 kind 는 최신 하나만 추적한다(재요청 시 이전 추적 대체).
export async function startJob(path, params, { kind, label } = {}) {
  const res = await api('/api/jobs/start', { path, params })
  const jobId = res?.job_id
  if (!jobId) throw new Error(res?.error || 'job start failed')
  const list = readActive().filter((j) => j.kind !== kind)
  list.push({
    jobId,
    path,
    kind: kind || 'ai',
    label: label || 'AI 작업',
    page: curPage(),
    ts: Date.now(),
  })
  writeActive(list)
  ensurePoller()
  window.dispatchEvent(new CustomEvent('aijob:change'))
  return jobId
}

let timer = null

// 전역 poller — 진행 중 job 을 1.5초마다 확인. 완료/실패 시 슬롯 저장 + 이벤트/토스트.
export function ensurePoller() {
  if (timer) return
  const tick = async () => {
    const list = readActive()
    if (!list.length) {
      clearInterval(timer)
      timer = null
      window.dispatchEvent(new CustomEvent('aijob:change'))
      return
    }
    for (const j of list) {
      let st = null
      try {
        // poller 는 api() 대신 raw fetch — 일시적 네트워크 실패에 토스트가 뜨지 않게.
        const r = await fetch(`/api/jobs/${j.jobId}`)
        st = r.ok ? await r.json() : null
      } catch {
        st = null
      }
      if (!st || st.status === 'running') continue // 다음 틱에 재시도
      writeActive(readActive().filter((x) => x.jobId !== j.jobId))
      if (st.status === 'done') {
        try {
          localStorage.setItem(resultKey(j.kind), JSON.stringify(st.result))
        } catch {
          /* 용량 초과 등 무시 — 이벤트로는 전달됨 */
        }
        toast(`✓ ${j.label} 완료`)
        window.dispatchEvent(
          new CustomEvent('aijob:done', { detail: { kind: j.kind, result: st.result } }),
        )
      } else {
        // error 또는 missing(서버 재시작 등)
        if (st.status === 'error') toast(`AI 작업 실패 — ${j.label}`)
        window.dispatchEvent(
          new CustomEvent('aijob:error', { detail: { kind: j.kind, error: st.error || st.status } }),
        )
      }
      window.dispatchEvent(new CustomEvent('aijob:change'))
    }
  }
  timer = setInterval(tick, 1500)
  tick()
}
