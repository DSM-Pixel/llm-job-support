import { useState } from 'react'
import { toast } from '../../../lib/toast.js'

const EXAMPLES = ['요약을 더 간결하게', '조치 계획을 구체적으로', '보고용 문체로']

// 문서 아래 상시 노출되는 AI 수정 입력 — AppShell 의 플로팅 AI 독과 별개 진입점이지만
// 처리 로직은 ReportPage 의 reviseHandler(=/api/report/revise) 를 그대로 받아 쓴다.
export default function ReportAiEdit({ onAsk }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (text) => {
    const query = (text ?? q).trim()
    if (!query || busy) return
    setBusy(true)
    try {
      const msg = await onAsk(query)
      toast(msg)
      setQ('')
    } catch {
      toast('요청을 처리하지 못했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card rp-ai-edit">
      <h3>AI 수정</h3>
      <div className="rp-ai-edit-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="예: 요약을 세 문장으로 줄여줘"
        />
        <button
          className={'btn primary' + (busy ? ' is-loading' : '')}
          type="button"
          disabled={busy}
          onClick={() => submit()}
        >
          고쳐줘
        </button>
      </div>
      <div className="rp-ai-edit-examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="pill" type="button" onClick={() => submit(ex)}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
