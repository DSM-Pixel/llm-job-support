// 하단 입력 도크 — 입력창 + 전송 버튼 + 추천 칩. 바닐라 .chat-dock 동일(항상 표시).
const SUGGESTIONS = [
  '포트홀 영역을 찾아줘',
  '공공데이터포털 기반으로 도로 파손 통계를 보여줘',
  '검색 결과를 요약해서 보고서로 만들어줘',
  '심각한 포트홀 대응 절차를 자동으로 추천해줘',
]

export default function ChatDock({ text, setText, busy, inputRef, onSubmit, onPick }) {
  return (
    <section className="chat-dock">
      <div className="input-wrap">
        <input
          type="text"
          placeholder="자연어로 질문하세요 — 예: 포트홀 영역을 찾아줘"
          value={text}
          ref={inputRef}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        />
        <button
          className={'btn primary' + (busy ? ' is-loading' : '')}
          type="button"
          disabled={busy}
          onClick={() => onSubmit()}
        >
          {busy ? '...' : '→'}
        </button>
      </div>
      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <span className="pill" key={s} onClick={() => onPick(s)}>
            {s}
          </span>
        ))}
      </div>
    </section>
  )
}
