import IntroMessage from './IntroMessage.jsx'

// 대화 모드 화면 — 새 대화 툴바 + 대화 로그(인사말 + 메시지 + 타이핑).
// 바닐라 ensureChat/addMessage 가 만들던 DOM 을 그대로 재현한다.
export default function ChatStage({ messages, busy, logRef, onPick, onNewChat }) {
  return (
    <>
      <div className="chat-toolbar">
        <button type="button" className="new-chat" title="대화를 비우고 새로 시작" onClick={onNewChat}>
          ＋ 새 대화
        </button>
      </div>
      <div className="chat-log" aria-live="polite" ref={logRef}>
        <IntroMessage onPick={onPick} />
        {messages.map((m, i) => (
          <div className={`message ${m.role}`} key={i}>
            <div className="message-avatar">{m.role === 'user' ? '김연' : 'AI'}</div>
            <div className="message-body" dangerouslySetInnerHTML={{ __html: m.html }} />
          </div>
        ))}
        {busy && (
          <div className="message assistant">
            <div className="message-avatar">AI</div>
            <div className="message-body">
              <div className="typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
