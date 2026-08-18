// 파이프라인 본문 — 스탯 행 + 단계 목록 + 하단 실행 CTA.
// 백엔드 업무 절차 API가 없어 5단계 고정 시나리오(포트홀 신고 처리)를 MOCK 으로 보여준다.
// "전 단계 한 번에 실행"은 각 단계를 순서대로 완료 처리하는 시뮬레이션(setTimeout 체이닝).
import { STEPS, PIPELINE_TITLE } from '../steps.js'

// props: done(bool[]), runBusy, onRunAll, onStart
export default function WorkflowPipeline({ done, runBusy, onRunAll, onStart }) {
  const completed = done.filter(Boolean).length
  const featureCount = new Set(STEPS.map((s) => s.tag)).size
  const runLabel = runBusy ? '실행 중…' : '전 단계 한 번에 실행'

  return (
    <>
      <div className="px-stats wf-stats">
        <div className="px-stat">
          <p className="px-stat-label">단계</p>
          <p className="px-stat-value">{STEPS.length}</p>
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
            disabled={runBusy}
            onClick={onRunAll}
          >
            {runLabel}
          </button>
        </div>
      </div>

      <div className="px-section-head">
        <h3>
          {PIPELINE_TITLE} <span className="count">{STEPS.length}단계 · {completed}개 완료</span>
        </h3>
      </div>

      <ol className="wf-steps">
        {STEPS.map((s, i) => (
          <li className="wf-step" key={s.n}>
            <div className={'wf-step-num' + (done[i] ? ' done' : '')}>{done[i] ? '✓' : s.n}</div>
            <div className="wf-step-body">
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
            <div className="wf-step-actions">
              <span className="px-badge v">{s.tag}</span>
              <a className="btn" href={s.route}>
                {s.actionLabel} →
              </a>
            </div>
          </li>
        ))}
      </ol>

      <div className="px-bottomcta">
        <button
          className={'btn' + (runBusy ? ' is-loading' : '')}
          type="button"
          disabled={runBusy}
          onClick={onRunAll}
        >
          {runLabel}
        </button>
        <button
          className="btn primary grow"
          type="button"
          onClick={() => onStart(STEPS[0].route)}
        >
          1단계부터 시작하기
        </button>
      </div>
    </>
  )
}
