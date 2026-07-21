import { useEffect, useState } from 'react'
import { toast } from '../../../lib/toast.js'
import { logActivity, saveArtifact } from '../../../lib/activity.js'
import { pid } from '../ragApi.js'
import { startJob, takeJobResult } from '../../../lib/aijob.js'

// 질문하기 + AI 답변 + 검색된 근거 — 바닐라 rag.js 검색 흐름 재현.
// 검색 전(result=null)에는 예시 답변·근거를 보여주지 않고 빈 안내 상태로 둔다.
export default function AskPanel() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null) // null = 검색 전(정적 화면)
  const [busy, setBusy] = useState(false)

  // 검색을 서버 백그라운드 job 으로 — 사이드바를 옮겨도 안 끊긴다. 결과는 아래 useEffect 에서 수신.
  const runSearch = async (raw) => {
    const q = (raw ?? query).trim()
    if (!q) {
      toast('질문을 입력해주세요')
      return
    }
    setQuery(q)
    setBusy(true)
    try {
      sessionStorage.setItem('gnsoft.rag.lastq', q) // 완료 시 활동 로그·산출물 저장에 사용
    } catch {
      /* 무시 */
    }
    try {
      await startJob('/api/rag/search', { query: q, project: pid() }, { kind: 'rag', label: '문서 검색' })
    } catch {
      setBusy(false)
    }
  }

  // RAG job 결과 수신 — 현재 페이지에 있으면 이벤트로, 자리를 비운 사이 끝났으면 진입 시 회수.
  useEffect(() => {
    // 방금 완료된 결과 반영 — 화면 + 활동 로그 + 산출물 저장 + sessionStorage 보관(복귀 복원용).
    const applyResult = (res) => {
      setResult(res)
      setBusy(false)
      try {
        sessionStorage.setItem('gnsoft.rag.lastresult', JSON.stringify(res))
      } catch {
        /* 무시 */
      }
      let q = ''
      try {
        q = sessionStorage.getItem('gnsoft.rag.lastq') || ''
      } catch {
        /* 무시 */
      }
      if (q) logActivity('RAG 검색', q)
      // 근거를 찾았으면 보고서에 넣을 산출물로 저장(질문·근거파일·도출 결과).
      if (res?.found) {
        const top = res.sources?.[0] || {}
        saveArtifact({
          kind: 'rag',
          cat: '문서',
          title: 'RAG 검색 결과',
          question: q,
          answer: String(res.answer || '')
            .replace(/<[^>]+>/g, '')
            .slice(0, 300),
          source: top.source || '',
          snippet: String(top.text || '').slice(0, 160),
        })
      }
    }
    const onDone = (e) => {
      if (e.detail?.kind !== 'rag') return
      takeJobResult('rag') // 슬롯 비움
      applyResult(e.detail.result)
    }
    const onErr = (e) => {
      if (e.detail?.kind === 'rag') setBusy(false)
    }
    window.addEventListener('aijob:done', onDone)
    window.addEventListener('aijob:error', onErr)
    // 진입 시: ?q= 로 넘어왔으면 검색 시작, 아니면 자리 비운 사이 끝난 결과 회수.
    const incomingQ = new URLSearchParams(location.search).get('q')
    const pending = takeJobResult('rag')
    if (incomingQ) {
      setQuery(incomingQ)
      runSearch(incomingQ)
    } else if (pending) {
      applyResult(pending) // 자리 비운 사이 완료 → 저장 포함
    } else {
      // 복귀: 직전 검색 결과가 있으면 화면만 복원(재저장·재로그는 하지 않음).
      try {
        const last = sessionStorage.getItem('gnsoft.rag.lastresult')
        if (last) setResult(JSON.parse(last))
      } catch {
        /* 무시 */
      }
    }
    return () => {
      window.removeEventListener('aijob:done', onDone)
      window.removeEventListener('aijob:error', onErr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 검색 전에는 예시 수치/문구를 보여주지 않는다(빈 상태).
  const method = result ? result.method : ''
  const confidence = result ? (result.found ? `연관도 ${result.confidence}%` : '근거 없음') : ''
  const meta = result ? `top-K ${result.top_k} · ${result.chunks} chunks · ${result.elapsed}` : ''
  const sectionSmall = result ? `${result.sources.length}개 근거 · 연관도순` : ''

  return (
    <section className="rag-content">
      <div className="ask-box">
        <label>
          <span>2</span>질문하기
        </label>
        <div className="ask-line">
          <input
            value={query}
            placeholder="예: 심각한 포트홀은 며칠 안에 보수해야 해?"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
          <button
            className={'btn primary' + (busy ? ' is-loading' : '')}
            disabled={busy}
            onClick={() => runSearch()}
          >
            {busy ? '검색 중' : '→ 질문하기'}
          </button>
        </div>
      </div>

      <article className="card answer">
        <div className="answer-head">
          <h3>✣ AI 답변 {method && <span className="status green">{method}</span>}</h3>
          {confidence && <span className="status green">{confidence}</span>}
        </div>
        {result ? (
          <p dangerouslySetInnerHTML={{ __html: result.answer }} />
        ) : (
          <p style={{ opacity: 0.6 }}>
            질문을 입력하면 참고 문서를 검색해 AI 답변과 근거를 보여줍니다.
          </p>
        )}
        {meta && (
          <div className="answer-actions">
            <small>{meta}</small>
          </div>
        )}
      </article>

      <h2 className="section-title">
        ⌕ 검색된 근거 {sectionSmall && <small>{sectionSmall}</small>}
      </h2>
      <div className="source-list">
        {!result && (
          <p style={{ opacity: 0.6 }}>아직 검색 결과가 없습니다. 질문을 입력해 보세요.</p>
        )}
        {result
          ? result.sources.map((src, i) => {
              const pct = Math.max(0, Math.min(100, src.score)) // 질의 연관도 0~100
              return (
                <article className="card source" key={i}>
                  <div>
                    <b>
                      <span>{i + 1}</span>
                      {src.source}
                    </b>
                    <p>{src.text}</p>
                  </div>
                  <i>
                    <span style={{ width: `${pct}%` }}></span>
                  </i>
                  <em title="이 문서가 질문과 얼마나 관련 있는지(연관도)">{pct}%</em>
                </article>
              )
            })
          : null}
      </div>
    </section>
  )
}
