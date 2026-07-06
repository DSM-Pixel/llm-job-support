import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'
import { CHAT_KEY, escapeHtml, renderAnswer, getNavType, loadSavedChat } from './queryApi.js'

// 저장된 role 정규화 — 바닐라와 동일(user 아니면 assistant).
const norm = (role) => (role === 'user' ? 'user' : 'assistant')

// 자연어 질의 대화 상태·동작 — 바닐라 query.js 의 submit/ensureChat/new-chat/복원 로직 이식.
export function useQueryChat() {
  const [messages, setMessages] = useState([]) // { role, html }
  const [started, setStarted] = useState(false) // chat-mode 진입 여부
  const [busy, setBusy] = useState(false) // 전송 중(타이핑 인디케이터 + 버튼 잠금)
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const logRef = useRef(null)
  const inited = useRef(false)

  // 프롬프트 카드/칩/도구 클릭 → 입력창에 넣고 포커스(바닐라 동일).
  const pick = (value) => {
    setText(value)
    inputRef.current?.focus()
  }

  // 질의 전송 — 바닐라 submit 1:1.
  const submit = async (override) => {
    const question = (override ?? text).trim()
    if (!question) {
      toast('질문을 입력해주세요')
      inputRef.current?.focus()
      return
    }
    setStarted(true)
    setMessages((m) => [...m, { role: 'user', html: `<p>${escapeHtml(question)}</p>` }])
    setText('')
    setBusy(true)
    try {
      const data = await api('/api/query', { question })
      setMessages((m) => [...m, { role: 'assistant', html: renderAnswer(data) }])
      logActivity('자연어 질의', question)
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', html: '<p>답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.</p>' },
      ])
    } finally {
      setBusy(false)
    }
  }

  // 새 대화 — 저장 기록을 비우고 인사말만 남긴다(바닐라 new-chat 동일).
  const newChat = () => {
    try {
      sessionStorage.removeItem(CHAT_KEY)
    } catch {
      /* 무시 */
    }
    setMessages([])
    if (logRef.current) logRef.current.scrollTop = 0
    inputRef.current?.focus()
  }

  // 진입 처리 — 새로고침이면 기록 초기화, 그 외(탭 이동·뒤로가기)면 복원.
  // ?q= 로 넘어온 질문은 바로 질의(바닐라 동일). 최초 1회만 실행.
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    if (getNavType() === 'reload') {
      try {
        sessionStorage.removeItem(CHAT_KEY)
      } catch {
        /* 무시 */
      }
    } else {
      const saved = loadSavedChat()
      if (saved.length) {
        setMessages(saved.map((m) => ({ role: norm(m.role), html: m.html })))
        setStarted(true)
      }
    }
    const incomingQ = new URLSearchParams(location.search).get('q')
    if (incomingQ) {
      setText(incomingQ)
      submit(incomingQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 대화가 바뀌면 세션에 저장(바닐라 saveChat) + 맨 아래로 스크롤.
  useEffect(() => {
    if (!inited.current) return
    try {
      sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages))
    } catch {
      /* 무시 */
    }
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [messages, busy])

  return { messages, started, busy, text, setText, inputRef, logRef, pick, submit, newChat }
}
