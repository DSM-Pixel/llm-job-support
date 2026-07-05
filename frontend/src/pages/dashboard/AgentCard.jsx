import { useState } from 'react'
import { api } from '../../lib/api.js'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'

// 업무 자동화 위젯 — 기존 dashboard.js planAgent 재현.
// 목표 → /api/agent/plan → 절차(단계) 미리보기, 각 단계는 해당 기능 화면으로 딥링크.
export default function AgentCard() {
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [steps, setSteps] = useState(null) // null = 최초(안내), [] = 결과 없음

  const plan = async () => {
    const g = goal.trim()
    if (!g) return toast('목표를 입력해주세요')
    setBusy(true)
    try {
      const d = await api('/api/agent/plan', { goal: g })
      setSteps(d.steps || [])
      logActivity('업무 자동화', g)
    } catch {
      /* api()가 toast */
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card agent-card">
      <div className="card-head">
        <h3>✦ 업무 자동화</h3>
        <a className="agent-more" href="agent.html">
          자세히 →
        </a>
      </div>
      <p className="agent-sub">목표를 적으면 AI가 업무 절차를 설계해 각 기능으로 연결합니다.</p>
      <div className="agent-line">
        <input
          className="agent-goal"
          placeholder="예: 포트홀 신고가 접수됐는데 어떻게 처리하지?"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && plan()}
        />
        <button
          className={'btn primary agent-go' + (busy ? ' is-loading' : '')}
          type="button"
          disabled={busy}
          onClick={plan}
        >
          {busy ? '설계 중' : '절차 설계'}
        </button>
      </div>
      <ol className="agent-steps">
        {steps === null ? (
          <li className="agent-empty">
            목표를 입력하고 ‘절차 설계’를 누르면 단계가 여기 표시됩니다.
          </li>
        ) : steps.length === 0 ? (
          <li className="agent-empty">절차를 만들지 못했습니다. 다시 시도해주세요.</li>
        ) : (
          steps.map((s) => (
            <li key={s.n}>
              <span className="agent-num">{s.n}</span>
              <div className="agent-body">
                <b>{s.title}</b>
                <small>
                  {s.icon} {s.tool_label}
                </small>
              </div>
              <a className="agent-run" href={s.route}>
                실행 →
              </a>
            </li>
          ))
        )}
      </ol>
    </article>
  )
}
