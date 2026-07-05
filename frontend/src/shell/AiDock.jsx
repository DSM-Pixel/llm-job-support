import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'

// AI 대화 패널(오른쪽 슬라이드 바) — 기존 common.js buildAiPanel/openAi/closeAi/send 이식.
// 대화는 프로젝트·페이지별로 localStorage 에 영속(닫았다 켜도 유지, '지우기'로만 비움).

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

// 여러 줄 텍스트를 <p>/<ul> 리치 HTML 로 — 바닐라 renderRich 와 동일.
const renderRich = (text) => {
  const lines = String(text || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  let html = ''
  let inList = false
  for (const ln of lines) {
    if (/^[-*•]\s+/.test(ln)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${escapeHtml(ln.replace(/^[-*•]\s+/, ''))}</li>`
    } else {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<p>${escapeHtml(ln)}</p>`
    }
  }
  if (inList) html += '</ul>'
  return html || '<p></p>'
}

// 화면 컨텍스트와 무관한 '일반 지식' 질문인지 — 자연어 질의로 안내할지 판단(바닐라 동일).
const RE_PAGEREF =
  /이\s*(보고서|문서|이미지|사진|화면|내용|자료|표)|여기|위\s*내용|방금|이거|이걸|요약|핵심|서론|본론|결론|섹션|문단|출처/
const RE_GENERALQ =
  /뭐야|뭐임|무엇|무어|이란|란\s*뭐|왜냐|왜\s|어떻게|방법|종류|원인|차이|날씨|예방|정의|개념|의미/
const looksGeneral = (q) => RE_GENERALQ.test(q) && !RE_PAGEREF.test(q)

const pid = () => {
  try {
    return (JSON.parse(localStorage.getItem('gnsoft.currentProject') || 'null') || {}).id || 'none'
  } catch {
    return 'none'
  }
}
const curPage = () => (location.pathname.split('/').pop() || '').replace('.html', '') || 'page'
const chatKey = () => `gnsoft.chat.${pid()}.${curPage()}`

const loadChat = () => {
  try {
    const raw = localStorage.getItem(chatKey())
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// props: open, onClose, askHandler?(질문→답 Promise), scope?(안내 문구)
export default function AiDock({
  open,
  onClose,
  askHandler = null,
  scope = '웹 검색 기반으로 무엇이든 물어보세요',
}) {
  const [mounted, setMounted] = useState(false) // hidden 여부
  const [slid, setSlid] = useState(false) // open 클래스(슬라이드)
  const [messages, setMessages] = useState(loadChat) // { role, text?, html? }
  const [pending, setPending] = useState(false) // 답변 대기(타이핑 인디케이터)
  const logRef = useRef(null)
  const inputRef = useRef(null)

  // 열기/닫기 애니메이션 — 바닐라 openAi/closeAi 재현(본문 밀기 + 슬라이드).
  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => {
        setSlid(true)
        document.body.classList.add('ai-pushed')
      })
      return () => cancelAnimationFrame(id)
    }
    setSlid(false)
    document.body.classList.remove('ai-pushed')
    const t = setTimeout(() => setMounted(false), 200)
    return () => clearTimeout(t)
  }, [open])

  // 열리면 입력창 포커스.
  useEffect(() => {
    if (slid) inputRef.current?.focus()
  }, [slid])

  // 대화가 바뀔 때마다 영속 + 맨 아래로 스크롤.
  useEffect(() => {
    try {
      localStorage.setItem(chatKey(), JSON.stringify(messages))
    } catch {
      /* 무시 */
    }
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages, pending])

  const send = async () => {
    const q = inputRef.current?.value.trim()
    if (!q) return
    inputRef.current.value = ''
    // 컨텍스트 패널인데 화면과 무관한 일반 질문이면 자연어 질의로 안내.
    if (askHandler && looksGeneral(q)) {
      const routeHtml =
        renderRich(
          `이 대화는 지금 화면 내용에 대한 질문에 답해요. ‘${q}’ 같은 일반 질문은 ‘자연어 질의’에서 답해드릴게요.`,
        ) +
        `<a class="btn primary ai-route" href="query.html?q=${encodeURIComponent(q)}">자연어 질의로 물어보기 →</a>`
      setMessages((m) => [...m, { role: 'user', text: q }, { role: 'assistant', html: routeHtml }])
      return
    }
    setMessages((m) => [...m, { role: 'user', text: q }])
    setPending(true)
    try {
      const ans = askHandler ? await askHandler(q) : (await api('/api/query', { question: q })).answer
      setMessages((m) => [...m, { role: 'assistant', html: renderRich(ans) }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', html: '<p>답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.</p>' },
      ])
    } finally {
      setPending(false)
    }
  }

  // '지우기' → 대화를 비운다(인사말만 남은 빈 상태).
  const clear = () => setMessages([])

  return (
    <aside className={'ai-panel' + (slid ? ' open' : '')} hidden={!mounted}>
      <header className="ai-panel-head">
        <span className="ai-panel-title">
          <span className="ai-ava">AI</span> 어시스턴트
        </span>
        <div className="ai-panel-actions">
          <button className="ai-panel-clear" type="button" onClick={clear}>
            지우기
          </button>
          <button className="ai-panel-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
      </header>
      <p className="ai-panel-scope">{scope}</p>
      <div className="ai-chat-log" ref={logRef}>
        {/* 대화가 없으면 인사말만 표시(영속하지 않음) — 바닐라 GREETING */}
        {messages.length === 0 && (
          <div className="ai-msg assistant">
            <span className="ai-ava sm">AI</span>
            <div className="ai-bubble">
              <p>안녕하세요! 지금 화면 내용에 대해 무엇이든 물어보세요.</p>
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div className="ai-msg user" key={i}>
              <div className="ai-bubble">{m.text}</div>
            </div>
          ) : (
            <div className="ai-msg assistant" key={i}>
              <span className="ai-ava sm">AI</span>
              <div className="ai-bubble" dangerouslySetInnerHTML={{ __html: m.html }} />
            </div>
          ),
        )}
        {pending && (
          <div className="ai-msg assistant">
            <span className="ai-ava sm">AI</span>
            <div className="ai-bubble">
              <div className="ai-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="ai-chat-input">
        <input
          type="text"
          placeholder="메시지를 입력하세요"
          ref={inputRef}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="ai-send btn primary" type="button" aria-label="보내기" onClick={send}>
          ↑
        </button>
      </div>
    </aside>
  )
}
