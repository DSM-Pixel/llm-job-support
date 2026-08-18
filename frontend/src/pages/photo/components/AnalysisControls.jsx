import { MODES } from '../photoApi.js'

// 상단 모드 카드 4개 + 프롬프트 입력 줄 — 무엇을(preset) 어떻게(직접 질문) 분석할지 고른다.
export default function AnalysisControls({ modeIdx, onSelectMode, prompt, onPrompt, busy, onAnalyze }) {
  return (
    <>
      <div className="px-taskgrid">
        {MODES.map((m, i) => (
          <button
            key={m.key}
            type="button"
            className={'px-taskcard' + (i === modeIdx ? ' feature' : '')}
            onClick={() => onSelectMode(i)}
          >
            <span className="px-taskcard-ic">{m.icon}</span>
            <h4>{m.title}</h4>
            <p>{m.sub}</p>
          </button>
        ))}
      </div>

      <div className="px-promptrow">
        <input
          className="px-prompt-input"
          type="text"
          placeholder="보수가 급한 곳부터 알려줘"
          value={prompt}
          onChange={(e) => onPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAnalyze()}
        />
        <button
          className={'btn primary px-prompt-go' + (busy ? ' is-loading' : '')}
          type="button"
          disabled={busy}
          onClick={onAnalyze}
        >
          {busy ? '분석 중' : '분석하기'}
        </button>
      </div>
    </>
  )
}
