// 파이프라인 본문 — 스탯 행 + 단계 목록 + (실행 시)결과 + 하단 실행 CTA.
// steps 는 실제 설계(agent plan) 또는 예시 시나리오. done 은 실행 결과의 단계 완료 여부.
import { isRealAI } from '../../../lib/aiBackend.js'

// props: steps[], title, done(bool[]), isReal, planBackend, run, runBusy, onRunAll, onStart
export default function WorkflowPipeline({
  steps,
  title,
  done,
  isReal,
  planBackend,
  run,
  runBusy,
  onRunAll,
  onStart,
}) {
  const completed = done.filter(Boolean).length
  const featureCount = new Set(steps.map((s) => s.tag).filter(Boolean)).size
  const runLabel = runBusy ? '실행 중…' : '전 단계 한 번에 실행'
  const deliverable = run && !run.loading && !run.failed ? run.deliverable : null
  const badge = isReal ? (isRealAI(planBackend) ? 'AI가 설계했어요' : '기본 절차') : '예시 절차'

  return (
    <>
      <div className="px-stats wf-stats">
        <div className="px-stat">
          <p className="px-stat-label">단계</p>
          <p className="px-stat-value">{steps.length}</p>
        </div>
        <div className="px-stat">
          <p className="px-stat-label">완료</p>
          <p className="px-stat-value accent">{completed}</p>
        </div>
        <div className="px-stat">
          <p className="px-stat-label">쓰이는 기능</p>
          <p className="px-stat-value">{featureCount}</p>
        </div>
        <div className="wf-stats-action">
          <button
            className={'btn' + (runBusy ? ' is-loading' : '')}
            type="button"
            disabled={runBusy || !steps.length}
            onClick={onRunAll}
          >
            {runLabel}
          </button>
        </div>
      </div>

      <div className="px-section-head">
        <h3>
          {title} <span className="count">{steps.length}단계 · {completed}개 완료</span>
        </h3>
        <span className="px-section-aside">{badge}</span>
      </div>

      <ol className="wf-steps">
        {steps.map((s, i) => (
          <li className="wf-step" key={s.n ?? i}>
            <div className={'wf-step-num' + (done[i] ? ' done' : '')}>
              {done[i] ? '✓' : (s.n ?? i + 1)}
            </div>
            <div className="wf-step-body">
              <h4>{s.title}</h4>
              {s.desc && <p>{s.desc}</p>}
            </div>
            <div className="wf-step-actions">
              {s.tag && <span className="px-badge v">{s.tag}</span>}
              {s.route && (
                <button className="btn" type="button" onClick={() => onStart(s.route)}>
                  {s.actionLabel || '열기'} →
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {run && (run.loading || run.failed || deliverable) && (
        <div className="wf-result card">
          {run.loading ? (
            <p className="wf-result-status">단계를 실행하고 결과를 종합하는 중…</p>
          ) : run.failed ? (
            <p className="wf-result-status">실행에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
          ) : (
            <>
              <div className="wf-result-head">
                <h4>📄 {deliverable.title}</h4>
                <span className="px-badge v">{isRealAI(run.backend) ? 'AI 실행' : '기본 실행'}</span>
              </div>
              <div className="wf-result-body">{deliverable.content}</div>
            </>
          )}
        </div>
      )}

      <div className="px-bottomcta">
        <button
          className={'btn' + (runBusy ? ' is-loading' : '')}
          type="button"
          disabled={runBusy || !steps.length}
          onClick={onRunAll}
        >
          {runLabel}
        </button>
        <button
          className="btn primary grow"
          type="button"
          disabled={!steps.length}
          onClick={() => onStart(steps[0]?.route)}
        >
          1단계부터 시작하기
        </button>
      </div>
    </>
  )
}
