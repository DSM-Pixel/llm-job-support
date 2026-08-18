import { useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { toast } from '../../lib/toast.js'
import WorkflowHero from './components/WorkflowHero.jsx'
import WorkflowPipeline from './components/WorkflowPipeline.jsx'
import { STEPS } from './steps.js'

// 업무 절차(파이프라인) — 포트홀 신고 처리 5단계를 이어붙여 보여주는 데모 화면.
// 절차 설계 API가 따로 없어 고정 시나리오를 MOCK 으로 구성하고, "전 단계 한 번에 실행"만
// 단계를 순서대로 완료 처리하는 시뮬레이션으로 흉내 낸다(서버 job 없이 setTimeout 체이닝).
function WorkflowContent() {
  const [goal, setGoal] = useState('')
  const [done, setDone] = useState(() => STEPS.map(() => false))
  const [runBusy, setRunBusy] = useState(false)

  // 목표 입력 → 이 데모에선 실제 재설계 대신 진행 상태만 초기화한다.
  const doPlan = (value) => {
    const g = (value ?? goal).trim()
    if (!g) {
      toast('처리할 업무를 한 줄로 적어주세요')
      return
    }
    setGoal(g)
    setDone(STEPS.map(() => false))
    toast('절차를 다시 계획했습니다')
  }

  // 전 단계 한 번에 실행 — 단계를 하나씩 완료 처리(각 550ms 간격, MOCK).
  const runAll = () => {
    if (runBusy) return
    setRunBusy(true)
    let i = 0
    const step = () => {
      if (i >= STEPS.length) {
        setRunBusy(false)
        toast('전 단계 실행을 완료했습니다')
        return
      }
      const idx = i
      setTimeout(() => {
        setDone((prev) => {
          const next = [...prev]
          next[idx] = true
          return next
        })
        i += 1
        step()
      }, 550)
    }
    step()
  }

  return (
    <section className="content workflow">
      <WorkflowHero goal={goal} setGoal={setGoal} onPlan={doPlan} />
      <WorkflowPipeline
        done={done}
        runBusy={runBusy}
        onRunAll={runAll}
        onStart={(route) => (location.href = route)}
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
