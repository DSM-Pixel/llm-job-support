import AppShell from '../../shell/AppShell.jsx'
import { useQueryChat } from './useQueryChat.js'
import EmptyState from './components/EmptyState.jsx'
import ChatStage from './components/ChatStage.jsx'
import ChatDock from './components/ChatDock.jsx'

// 자연어 질의 본문 — 대화 상태(useQueryChat)를 스테이지/도크에 배선한다.
function QueryContent() {
  const chat = useQueryChat()
  return (
    <>
      <section className={'query-stage' + (chat.started ? ' chat-mode' : '')}>
        {chat.started ? (
          <ChatStage
            messages={chat.messages}
            busy={chat.busy}
            logRef={chat.logRef}
            onPick={chat.pick}
            onNewChat={chat.newChat}
          />
        ) : (
          <EmptyState onPick={chat.pick} />
        )}
      </section>
      <ChatDock
        text={chat.text}
        setText={chat.setText}
        busy={chat.busy}
        inputRef={chat.inputRef}
        onSubmit={chat.submit}
        onPick={chat.pick}
      />
    </>
  )
}

export default function QueryPage() {
  return (
    <AppShell title="자연어 질의" activeNav="query">
      <QueryContent />
    </AppShell>
  )
}
