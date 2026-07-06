import { useEffect, useRef } from 'react'
import { toast } from '../../../lib/toast.js'
import { saveArtifact, logActivity } from '../../../lib/activity.js'

// 원클릭 실행 결과 — 바닐라 renderRun/mdLite/복사·저장 재현.

const STATUS = {
  done: { t: '완료', c: 'ok' },
  manual: { t: '수동 필요', c: 'warn' },
  synth: { t: '종합', c: 'info' },
  skipped: { t: '건너뜀', c: 'muted' },
  error: { t: '오류', c: 'err' },
}

// 바닐라 escapeHtml 과 동일 — mdLite 가 만드는 HTML 안에서만 쓴다.
const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

// 아주 가벼운 마크다운(## 제목 · - 불릿)만 처리 — 바닐라 mdLite 그대로.
const mdLite = (text) =>
  (text || '')
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (!t) return ''
      if (t.startsWith('### ')) return `<h5>${esc(t.slice(4))}</h5>`
      if (t.startsWith('## ')) return `<h4>${esc(t.slice(3))}</h4>`
      if (t.startsWith('# ')) return `<h4>${esc(t.slice(2))}</h4>`
      if (/^[-*]\s/.test(t)) return `<div class="ag-li">${esc(t.replace(/^[-*]\s/, ''))}</div>`
      return `<p>${esc(t)}</p>`
    })
    .join('')

// props: run — { loading: true } | 실행 데이터 { backend, steps, deliverable }
export default function RunResult({ run }) {
  const ref = useRef(null)

  // 실행 영역이 나타나면 부드럽게 스크롤 — 바닐라 scrollIntoView 재현.
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const deliverable = run.loading ? null : run.deliverable || null

  const copy = async () => {
    if (!deliverable) return
    try {
      await navigator.clipboard.writeText(deliverable.content)
      toast('결과물을 복사했습니다')
    } catch {
      toast('복사에 실패했습니다')
    }
  }

  const save = () => {
    if (!deliverable) return
    saveArtifact({
      id: `agent_${Date.now()}`,
      kind: 'rag',
      title: deliverable.title,
      text: deliverable.content,
    })
    logActivity('업무 자동화', `결과물 저장 — ${deliverable.title}`)
    toast('결과물을 저장했습니다 (데이터·보고서에서 확인)')
  }

  return (
    <div className="ag-run" ref={ref}>
      <div className="ag-run-head">
        <h3>
          ⚙ 실행 결과{' '}
          {!run.loading && (
            <span className="ag-badge">{run.backend === 'GEMINI' ? 'AI 실행' : '기본 실행'}</span>
          )}
        </h3>
      </div>
      <ol className="ag-run-steps">
        {run.loading ? (
          <li className="ag-run-loading">단계를 실행하고 결과를 종합하는 중…</li>
        ) : (
          (run.steps || []).map((s) => {
            const st = STATUS[s.status] || STATUS.done
            return (
              <li className="ag-run-step" key={s.n}>
                <div className="ag-run-step-top">
                  <span className="ag-run-num">{s.n}</span>
                  <b>{s.title}</b>
                  <span className={`ag-run-badge ${st.c}`}>{st.t}</span>
                </div>
                {s.text && <p className="ag-run-text">{s.text}</p>}
                {s.sources && s.sources.length > 0 && (
                  <p className="ag-run-src">근거: {s.sources.join(', ')}</p>
                )}
                {s.status === 'manual' && s.route && (
                  <a className="ag-run-link" href={s.route}>
                    직접 실행 →
                  </a>
                )}
              </li>
            )
          })
        )}
      </ol>
      {deliverable && (
        <article className="ag-deliverable card">
          <div className="ag-deliverable-head">
            <h3>
              📄 <span>{deliverable.title}</span>
            </h3>
            <div className="ag-deliverable-actions">
              <button className="btn flat" type="button" onClick={copy}>
                복사
              </button>
              <button className="btn primary" type="button" onClick={save}>
                결과물 저장
              </button>
            </div>
          </div>
          <div
            className="ag-deliverable-body"
            dangerouslySetInnerHTML={{ __html: mdLite(deliverable.content) }}
          />
        </article>
      )}
    </div>
  )
}
