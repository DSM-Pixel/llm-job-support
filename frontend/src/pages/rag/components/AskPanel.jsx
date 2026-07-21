import { useEffect, useState } from 'react'
import { toast } from '../../../lib/toast.js'
import { logActivity, saveArtifact } from '../../../lib/activity.js'
import { searchRag } from '../ragApi.js'

// 질문하기 + AI 답변 + 검색된 근거 — 바닐라 rag.js 검색 흐름 재현.
// 검색 전(result=null)에는 예시 답변·근거를 보여주지 않고 빈 안내 상태로 둔다.
export default function AskPanel() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null) // null = 검색 전(정적 화면)
  const [busy, setBusy] = useState(false)

  const runSearch = async (raw) => {
    const q = (raw ?? query).trim()
    if (!q) {
      toast('질문을 입력해주세요')
      return
    }
    setBusy(true)
    try {
      const res = await searchRag(q)
      setResult(res)
      logActivity('RAG 검색', q)
      // 근거를 찾았으면 보고서에 넣을 산출물로 저장(질문·근거파일·도출 결과).
      if (res.found) {
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
      toast(res.found ? '검색 결과가 갱신되었습니다' : '참고 문서에 관련 정보가 없습니다')
    } catch {
      /* api()가 이미 toast 표시 */
    } finally {
      setBusy(false)
    }
  }

  // 자연어 질의에서 ?q=로 연계돼 넘어오면 그 질문을 색인 데이터에서 바로 검색.
  useEffect(() => {
    const incomingQ = new URLSearchParams(location.search).get('q')
    if (incomingQ) {
      setQuery(incomingQ)
      runSearch(incomingQ)
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
