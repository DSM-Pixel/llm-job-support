import { useEffect, useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { toast } from '../../lib/toast.js'
import { getProject } from '../../lib/storage.js'
import { logActivity } from '../../lib/activity.js'
import { fetchPlan, fetchRun } from './agentApi.js'
import AgentIntro from './components/AgentIntro.jsx'
import PlanSteps from './components/PlanSteps.jsx'
import RunResult from './components/RunResult.jsx'

// 업무 자동화 — 자연어 목표 → AI 에이전트가 업무 절차를 설계하고 기능에 연결.
// 바닐라 web/assets/js/agent.js 의 동작을 그대로 재현(bug-for-bug).
function AgentContent() {
  const [goal, setGoal] = useState('포트홀 신고가 접수됐는데 어떻게 처리하지?')
  const [plan, setPlan] = useState(null) // { backend, summary, steps }
  const [run, setRun] = useState(null) // null | { loading: true } | 실행 데이터
  const [planBusy, setPlanBusy] = useState(false)
  const [runBusy, setRunBusy] = useState(false)

  // 절차 설계 — 버튼/칩/Enter/?q= 모두 여기로. value 없으면 현재 입력값 사용.
  const doPlan = async (value) => {
    const g = (value ?? goal).trim()
    if (!g) {
      toast('목표를 입력해주세요')
      return
    }
    setGoal(g)
    setPlanBusy(true)
    try {
      const data = await fetchPlan(g)
      setPlan(data)
      setRun(null) // 새 계획이면 이전 실행 결과 감춤
      logActivity('업무 자동화', g)
    } catch {
      /* api() 가 이미 토스트 */
    } finally {
      setPlanBusy(false)
    }
  }

  // 원클릭 실행 — 각 단계 실행 + 결과물 종합.
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
      const d = await fetchRun(g, proj)
      setRun(d)
      logActivity('업무 자동화', `${g} (원클릭 실행)`)
    } catch {
      // api()가 토스트로 알림 — 스피너가 영원히 돌지 않도록 실패 상태로 전환.
      setRun({ loading: false, failed: true })
    } finally {
      setRunBusy(false)
    }
  }

  // 다른 화면에서 ?q= 로 넘어온 경우(명시적 의도)에만 자동 설계.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q')
    if (q) doPlan(q)
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
