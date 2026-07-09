import { useEffect, useState } from 'react'
import { toast } from '../../../lib/toast.js'
import { logActivity, saveArtifact } from '../../../lib/activity.js'
import { searchRag } from '../ragApi.js'

// 최초 화면의 정적 답변(검색 전) — 바닐라 rag.html 하드코딩 값 그대로.
const INITIAL_ANSWER =
  '포트홀은 등급에 따라 보수 기한이 다릅니다. <b>심각(상) 등급은 발견 즉시 24시간 이내 긴급 보수</b> 대상입니다. <sup>1</sup> 보통(중)은 7일 이내, 경미(하)는 정기 보수 주기에 포함해 처리합니다. <sup>2</sup>'

// 최초 화면의 정적 근거 3개(검색 전).
const INITIAL_SOURCES = [
  {
    source: '포트홀_보수_기준.md',
    text: '심각(상) 등급은 발견 즉시 24시간 이내 긴급 보수. 보통(중) 등급은 7일 이내 보수.',
    width: '94%',
    score: '0.94',
  },
  {
    source: '포트홀_보수_기준.md',
    text: '심각(상): 지름 30cm 이상 또는 깊이 5cm 이상. 차량 손상 우려.',
    width: '90%',
    score: '0.90',
  },
  {
    source: '도로_균열_점검.md',
    text: '균열 폭 3mm 이상이면 보수 대상으로 기록한다. 거북등 균열은 면적을 산정하여 보수 물량을 추정한다.',
    width: '71%',
    score: '0.71',
  },
]

// 질문하기 + AI 답변 + 검색된 근거 — 바닐라 rag.js 검색 흐름 재현.
export default function AskPanel() {
  const [query, setQuery] = useState('심각한 포트홀은 며칠 안에 보수해야 해?')
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

  const method = result ? result.method : '하이브리드 RAG'
  const confidence = result
    ? result.found
      ? `연관도 ${result.confidence}%`
      : '근거 없음'
    : '신뢰도 0.93'
  const meta = result
    ? `top-K ${result.top_k} · ${result.chunks} chunks · ${result.elapsed}`
    : 'top-K 4 · 14 chunks · 0.41s'
  const answerHtml = result ? result.answer : INITIAL_ANSWER
  const sectionSmall = result ? `${result.sources.length}개 근거 · 연관도순` : '3 sources · RRF'

  return (
    <section className="rag-content">
      <div className="ask-box">
        <label>
          <span>2</span>질문하기
        </label>
        <div className="ask-line">
          <input
            value={query}
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
          <h3>
            ✣ AI 답변 <span className="status green">{method}</span>
          </h3>
          <span className="status green">{confidence}</span>
        </div>
        <p dangerouslySetInnerHTML={{ __html: answerHtml }} />
        <div className="answer-actions">
          <small>{meta}</small>
        </div>
      </article>

      <h2 className="section-title">
        ⌕ 검색된 근거 <small>{sectionSmall}</small>
      </h2>
      <div className="source-list">
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
          : INITIAL_SOURCES.map((src, i) => (
              <article className="card source" key={i}>
                <div>
                  <b>
                    <span>{i + 1}</span>
                    {src.source}
                  </b>
                  <p>{src.text}</p>
                </div>
                <i>
                  <span style={{ width: src.width }}></span>
                </i>
                <em>{src.score}</em>
              </article>
            ))}
      </div>
    </section>
  )
}
