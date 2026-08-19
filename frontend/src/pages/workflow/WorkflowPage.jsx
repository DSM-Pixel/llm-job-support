import { useEffect, useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { toast } from '../../lib/toast.js'
import { getProject } from '../../lib/storage.js'
import { logActivity } from '../../lib/activity.js'
import { startJob, takeJobResult } from '../../lib/aijob.js'
import WorkflowHero from './components/WorkflowHero.jsx'
import WorkflowPipeline from './components/WorkflowPipeline.jsx'
import { EXAMPLE_STEPS, EXAMPLE_TITLE } from './steps.js'

// 업무 절차 — 자연어 목표를 AI 에이전트가 절차로 설계(/api/agent/plan)하고,
// "전 단계 한 번에 실행"으로 각 단계를 실행·종합한다(/api/agent/run).
// 서버 job 으로 돌려 페이지를 옮겨도 끊기지 않으며(aijob), 결과는 sessionStorage 로 복원한다.
// (기존 업무 자동화 agent 페이지와 동일한 엔진을 새 디자인에 배선.)
const SS = { goal: 'gnsoft.wf.goal', plan: 'gnsoft.wf.plan', run: 'gnsoft.wf.run' }

function WorkflowContent() {
  const [goal, setGoal] = useState('')
  const [plan, setPlan] = useState(null) // { backend, summary, steps }
  const [run, setRun] = useState(null) // null | { loading } | { backend, steps, deliverable }
  const [planBusy, setPlanBusy] = useState(false)
  const [runBusy, setRunBusy] = useState(false)

  // 목표 → 절차 설계(서버 job).
  const doPlan = async (value) => {
    const g = (value ?? goal).trim()
    if (!g) {
      toast('처리할 업무를 한 줄로 적어주세요')
      return
    }
    setGoal(g)
    setPlanBusy(true)
    try {
      sessionStorage.setItem(SS.goal, g)
    } catch {
      /* 무시 */
    }
    try {
      await startJob('/api/agent/plan', { goal: g }, { kind: 'agent_plan', label: '업무 절차 설계' })
    } catch {
      setPlanBusy(false)
    }
  }

  // 전 단계 한 번에 실행 — 현재 프로젝트를 스코프로 넘겨 실행·종합(서버 job).
  const runAll = async () => {
    const g = goal.trim()
    if (!g) {
      toast('먼저 목표를 적고 계획을 만들어주세요')
      return
    }
    const proj = getProject()?.id || ''
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

  // job 결과 수신 + 진입/복귀 시 상태 복원 (agent 페이지와 동일 패턴).
  useEffect(() => {
    const lastGoal = () => {
      try {
        return sessionStorage.getItem(SS.goal) || ''
      } catch {
        return ''
      }
    }
    const onDone = (e) => {
      const k = e.detail?.kind
      if (k === 'agent_plan') {
        takeJobResult('agent_plan')
        setPlan(e.detail.result)
        setRun(null)
        setPlanBusy(false)
        try {
          sessionStorage.setItem(SS.plan, JSON.stringify(e.detail.result))
          sessionStorage.removeItem(SS.run)
        } catch {
          /* 무시 */
        }
        if (lastGoal()) logActivity('업무 자동화', lastGoal())
      } else if (k === 'agent_run') {
        takeJobResult('agent_run')
        setRun(e.detail.result)
        setRunBusy(false)
        try {
          sessionStorage.setItem(SS.run, JSON.stringify(e.detail.result))
        } catch {
          /* 무시 */
        }
        if (lastGoal()) logActivity('업무 자동화', `${lastGoal()} (전 단계 실행)`)
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

    try {
      const lg = sessionStorage.getItem(SS.goal)
      if (lg) setGoal(lg)
      const lp = sessionStorage.getItem(SS.plan)
      if (lp) setPlan(JSON.parse(lp))
      const lr = sessionStorage.getItem(SS.run)
      if (lr) setRun(JSON.parse(lr))
    } catch {
      /* 무시 */
    }
    const pendingPlan = takeJobResult('agent_plan')
    if (pendingPlan) {
      setPlan(pendingPlan)
      setRun(null)
    }
    const pendingRun = takeJobResult('agent_run')
    if (pendingRun) setRun(pendingRun)

    return () => {
      window.removeEventListener('aijob:done', onDone)
      window.removeEventListener('aijob:error', onErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 계획이 있으면 실제 단계, 없으면 예시 시나리오를 보여준다.
  const isReal = !!plan
  const steps = isReal
    ? (plan.steps || []).map((s) => ({
        n: s.n,
        title: s.title,
        desc: s.why || '',
        tag: s.tool_label || 'AI',
        route: s.route || '',
        actionLabel: '열기',
      }))
    : EXAMPLE_STEPS
  const pipelineTitle = isReal ? plan.summary || '설계한 업무 절차' : EXAMPLE_TITLE

  // 완료 표시 — 실행 결과의 각 단계 status 로 채운다.
  const runSteps = (run && !run.loading && !run.failed && run.steps) || []
  const done = steps.map((_, i) => {
    const rs = runSteps[i]
    return !!rs && (rs.status === 'done' || rs.status === 'synth')
  })

  return (
    <section className="content workflow">
      <WorkflowHero goal={goal} setGoal={setGoal} onPlan={doPlan} busy={planBusy} />
      <WorkflowPipeline
        steps={steps}
        title={pipelineTitle}
        done={done}
        isReal={isReal}
        planBackend={plan?.backend}
        run={run}
        runBusy={runBusy}
        onRunAll={runAll}
        onStart={(route) => route && (location.href = route)}
      />
    </section>
  )
}

export default function WorkflowPage() {
  return (
    <AppShell title="" activeNav="workflow">
      <WorkflowContent />
    </AppShell>
  )
}
