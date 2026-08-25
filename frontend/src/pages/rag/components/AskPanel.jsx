import { useEffect, useState } from 'react'
import { toast } from '../../../lib/toast.js'
import { logActivity, saveArtifact } from '../../../lib/activity.js'
import { pid } from '../ragApi.js'
import { startJob, takeJobResult } from '../../../lib/aijob.js'

// 질문 입력칸 아래 예시 칩 — 클릭하면 그 질문으로 바로 검색(목업 재현).
const EXAMPLES = ['포트홀 보수 기준이 뭐야?', '균열은 언제 보수해야 해?', '점검 주기 알려줘']

// 질문하기 + AI 답변(보라 그라데이션 요약) + 근거 리스트 — 바닐라 rag.js 검색 흐름 재현.
// 검색 전(result=null)에는 예시 답변·근거를 보여주지 않고 빈 안내 상태로 둔다.
// docCount: 색인된 문서 수(요약 패널 표시용). onResult: 검색 결과를 상위(RagPage)에도 알려
// '색인한 문서' 카드의 '답변에 쓰임' 배지에 활용한다.
export default function AskPanel({ docCount = 0, onResult }) {
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
      onResult?.(res)
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
        if (last) {
          const parsed = JSON.parse(last)
          setResult(parsed)
          onResult?.(parsed)
        }
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
  const sourceCount = result ? result.sources.length : 0
  // 근거 중 가장 높은 연관도(요약 패널 '최고 연관도') — 근거 리스트가 이미 연관도순이라 첫 항목.
  const topScore = result?.sources?.length
    ? Math.max(0, Math.min(100, Math.round(result.sources[0].score)))
    : null

  return (
    <section className="rag-content">
      <div className="ask-box">
        <label>
          <span>2</span>질문하기
        </label>
        <div className="ask-line">
          <input
            value={query}
            placeholder="예: 포트홀 보수 기준이 뭐야?"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
          <button
            className={'btn primary' + (busy ? ' is-loading' : '')}
            disabled={busy}
            onClick={() => runSearch()}
          >
            {busy ? '검색 중' : '→ 물어보기'}
          </button>
        </div>
        <div className="ask-chips">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="pill ask-chip" onClick={() => runSearch(ex)}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      <article className="card answer px-gradient">
        <div className="answer-head">
          <h3>
            <span className="rag-pill">
              <i className="rag-dot" />
              {result ? `근거 ${sourceCount}건` : '검색 대기'}
            </span>
          </h3>
          {method && <span className="status green">{method}</span>}
          {confidence && (
            <span className={'status ' + (result?.found ? 'green' : 'gray')}>{confidence}</span>
          )}
        </div>

        <div className="rag-summary">
          <div className="rag-summary-main">
            <strong className="rag-summary-num">{result ? sourceCount : '–'}</strong>
            <span className="rag-summary-num-label">건의 근거</span>
            <span className="rag-summary-brand">✦ PIXEL AI</span>
          </div>
          <div className="rag-summary-aside">
            <div className="rag-summary-row">
              <span>색인된 문서</span>
              <b>{docCount}개</b>
            </div>
            <div className="rag-summary-row">
              <span>검색 방식</span>
              <b>키워드 · 문맥 유사도</b>
            </div>
            <div className="rag-summary-row">
              <span>최고 연관도</span>
              <b>{topScore != null ? `${topScore}%` : '–'}</b>
            </div>
            <div className="rag-summary-bar">
              <span style={{ width: `${topScore || 0}%` }} />
            </div>
          </div>
        </div>

        <p>
          {result ? (
            <span dangerouslySetInnerHTML={{ __html: result.answer }} />
          ) : (
            '질문을 입력하면 참고 문서를 검색해 AI 답변과 근거를 보여줍니다.'
          )}
        </p>

        {meta && (
          <div className="answer-actions">
            <small>{meta}</small>
          </div>
        )}
      </article>

      <h2 className="section-title">
        ⌕ 이 근거로 답했어요 {sectionSmall && <small>{sectionSmall}</small>}
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
