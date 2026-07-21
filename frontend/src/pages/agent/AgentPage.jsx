import { useEffect, useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { toast } from '../../lib/toast.js'
import { getProject } from '../../lib/storage.js'
import { logActivity } from '../../lib/activity.js'
import { startJob, takeJobResult } from '../../lib/aijob.js'
import AgentIntro from './components/AgentIntro.jsx'
import PlanSteps from './components/PlanSteps.jsx'
import RunResult from './components/RunResult.jsx'

// 업무 자동화 — 자연어 목표 → AI 에이전트가 업무 절차를 설계하고 기능에 연결.
// 바닐라 web/assets/js/agent.js 의 동작을 그대로 재현(bug-for-bug).
function AgentContent() {
  const [goal, setGoal] = useState('')
  const [plan, setPlan] = useState(null) // { backend, summary, steps }
  const [run, setRun] = useState(null) // null | { loading: true } | 실행 데이터
  const [planBusy, setPlanBusy] = useState(false)
  const [runBusy, setRunBusy] = useState(false)

  // plan/run 을 사이드바 이동 사이에도 유지하려고 sessionStorage 에 보관(같은 탭 내 지속).
  const persistPlan = (p) => {
    try {
      sessionStorage.setItem('gnsoft.agent.lastplan', JSON.stringify(p))
      sessionStorage.removeItem('gnsoft.agent.lastrun')
    } catch {
      /* 무시 */
    }
  }
  const persistRun = (r) => {
    try {
      sessionStorage.setItem('gnsoft.agent.lastrun', JSON.stringify(r))
    } catch {
      /* 무시 */
    }
  }

  // 절차 설계 — 버튼/칩/Enter/?q= 모두 여기로. 서버 job 으로 돌려 사이드바를 옮겨도 안 끊긴다.
  const doPlan = async (value) => {
    const g = (value ?? goal).trim()
    if (!g) {
      toast('목표를 입력해주세요')
      return
    }
    setGoal(g)
    setPlanBusy(true)
    try {
      sessionStorage.setItem('gnsoft.agent.lastgoal', g)
    } catch {
      /* 무시 */
    }
    try {
      await startJob('/api/agent/plan', { goal: g }, { kind: 'agent_plan', label: '업무 절차 설계' })
    } catch {
      setPlanBusy(false)
    }
  }

  // 원클릭 실행 — 각 단계 실행 + 결과물 종합(서버 job).
  const doRunAll = async () => {
    const g = goal.trim()
    if (!g) {
      toast('목표를 입력해주세요')
      return
    }
    const proj = getProject() ? getProject().id : ''
    setRunBusy(true)
    setRun({ loading: true })
    try {
      await startJob(
        '/api/agent/run',
        { goal: g, project: proj },
        { kind: 'agent_run', label: '업무 자동 실행' },
      )
    } catch {
      setRunBusy(false)
      setRun({ loading: false, failed: true })
    }
  }

  // job 결과 수신 + 진입/복귀 시 상태 복원.
  useEffect(() => {
    const lastGoal = () => {
      try {
        return sessionStorage.getItem('gnsoft.agent.lastgoal') || ''
      } catch {
        return ''
      }
    }
    const onDone = (e) => {
      const k = e.detail?.kind
      if (k === 'agent_plan') {
        takeJobResult('agent_plan')
        setPlan(e.detail.result)
        persistPlan(e.detail.result)
        setRun(null)
        setPlanBusy(false)
        if (lastGoal()) logActivity('업무 자동화', lastGoal())
      } else if (k === 'agent_run') {
        takeJobResult('agent_run')
        setRun(e.detail.result)
        persistRun(e.detail.result)
        setRunBusy(false)
        if (lastGoal()) logActivity('업무 자동화', `${lastGoal()} (원클릭 실행)`)
      }
    }
    const onErr = (e) => {
      const k = e.detail?.kind
      if (k === 'agent_plan') setPlanBusy(false)
      else if (k === 'agent_run') {
        setRunBusy(false)
        setRun({ loading: false, failed: true })
      }
    }
    window.addEventListener('aijob:done', onDone)
    window.addEventListener('aijob:error', onErr)

    // 진입: 직전 plan/run 복원 → 자리 비운 사이 완료된 결과가 있으면 덮어씀 → ?q= 면 새 설계.
    try {
      const lp = sessionStorage.getItem('gnsoft.agent.lastplan')
      if (lp) setPlan(JSON.parse(lp))
      const lr = sessionStorage.getItem('gnsoft.agent.lastrun')
      if (lr) setRun(JSON.parse(lr))
    } catch {
      /* 무시 */
    }
    const pendingPlan = takeJobResult('agent_plan')
    if (pendingPlan) {
      setPlan(pendingPlan)
      persistPlan(pendingPlan)
      setRun(null)
    }
    const pendingRun = takeJobResult('agent_run')
    if (pendingRun) {
      setRun(pendingRun)
      persistRun(pendingRun)
    }
    const q = new URLSearchParams(location.search).get('q')
    if (q) doPlan(q)
    return () => {
      window.removeEventListener('aijob:done', onDone)
      window.removeEventListener('aijob:error', onErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="ag-layout">
      <AgentIntro goal={goal} setGoal={setGoal} onPlan={doPlan} busy={planBusy} />

      {plan && (
        <div className="ag-result">
          <PlanSteps
            plan={plan}
            onRunAll={doRunAll}
            onStart={(route) => (location.href = route)}
            runBusy={runBusy}
          />
          {run && <RunResult run={run} />}
        </div>
      )}
    </section>
  )
}

export default function AgentPage() {
  return (
    <AppShell title="업무 자동화" activeNav="agent">
      <AgentContent />
    </AppShell>
  )
}
