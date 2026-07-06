// 계획 요약 + 단계 카드 + 하단 실행 버튼 — 바닐라 render/renderSteps 재현.
// React가 텍스트를 자동 이스케이프하므로 바닐라의 escapeHtml 은 불필요.

// props: plan{ backend, summary, steps }, onRunAll, onStart, runBusy
export default function PlanSteps({ plan, onRunAll, onStart, runBusy }) {
  const steps = plan.steps || []
  return (
    <>
      <div className="ag-summary card">
        <div className="ag-summary-head">
          <h3>
            ✦ 에이전트 업무 계획{' '}
            <span className="ag-badge">{plan.backend === 'GEMINI' ? 'AI 생성' : '기본 절차'}</span>
          </h3>
        </div>
        <p className="ag-summary-text">{plan.summary}</p>
      </div>

      <ol className="ag-steps">
        {steps.map((s) => (
          <li className="ag-step card" key={s.n}>
            <div className="ag-step-num">{s.n}</div>
            <div className="ag-step-body">
              <div className="ag-step-top">
                <b>{s.title}</b>
                <span className="ag-tool">
                  <span className="ag-tool-ic">{s.icon}</span>
                  {s.tool_label}
                </span>
              </div>
              {s.why && <p className="ag-why">{s.why}</p>}
            </div>
            <a className="btn ag-step-go" href={s.route}>
              이 단계 실행 →
            </a>
          </li>
        ))}
      </ol>

      <div className="ag-foot">
        {steps.length > 0 && (
          <button
            className={'btn primary ag-run-all' + (runBusy ? ' is-loading' : '')}
            type="button"
            disabled={runBusy}
            onClick={onRunAll}
          >
            {runBusy ? '실행 중…' : '▶ 원클릭 실행 — 결과물까지 도출'}
          </button>
        )}
        {steps.length > 0 && (
          <button className="btn ag-start" type="button" onClick={() => onStart(steps[0].route)}>
            단계별로 직접 실행 →
          </button>
        )}
      </div>
    </>
  )
}
