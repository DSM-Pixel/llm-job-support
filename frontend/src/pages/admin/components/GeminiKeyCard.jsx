import { useEffect, useState } from 'react'
import { toast } from '../../../lib/toast.js'
import { fetchGeminiKey, saveGeminiKey } from '../adminApi.js'

// Gemini API 키 설정 — 슈퍼 어드민 전용. 키를 저장하면 이미지 라벨링의 박스 탐지가
// Gemini 네이티브 grounding(정확)으로 동작한다. 미설정이면 GPT-4o 폴백(좌표 부정확).
export default function GeminiKeyCard() {
  const [status, setStatus] = useState(null) // { set, preview(마스킹) }
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchGeminiKey()
      .then((r) => r.ok && setStatus({ set: r.set, preview: r.preview }))
      .catch(() => {})
  }, [])

  const persist = async (key, okMsg) => {
    setBusy(true)
    try {
      const r = await saveGeminiKey(key)
      if (!r.ok) return toast(r.error || '저장에 실패했습니다')
      setStatus({ set: r.set, preview: r.preview })
      setValue('')
      toast(okMsg)
    } catch {
      /* toast in api() */
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ad-datakey card">
      <div className="ad-datakey-head">
        <h3>Gemini API 키</h3>
        {status && (
          <span className={'ad-key-badge' + (status.set ? ' on' : '')}>
            {status.set ? `설정됨 · ${status.preview}` : '미설정'}
          </span>
        )}
      </div>
      <p className="ad-datakey-desc">
        <b>Gemini</b> 키를 넣으면 이미지 라벨링의 박스 탐지가 <b>Gemini grounding</b>(정확)으로
        동작합니다. 미설정이면 GPT-4o로 폴백하는데 좌표가 부정확합니다. 저장 즉시 적용됩니다.
      </p>
      <div className="ad-datakey-row">
        <input
          type="password"
          className="ad-datakey-input"
          placeholder={status?.set ? '새 키로 교체하려면 입력' : 'Gemini API 키 붙여넣기'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && value.trim() && persist(value.trim(), 'Gemini API 키를 저장했습니다')
          }
          autoComplete="off"
        />
        <button
          className="btn primary"
          type="button"
          disabled={busy || !value.trim()}
          onClick={() => persist(value.trim(), 'Gemini API 키를 저장했습니다')}
        >
          {busy ? '저장 중' : '저장'}
        </button>
        {status?.set && (
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => persist('', 'Gemini API 키를 삭제했습니다')}
          >
            삭제
          </button>
        )}
      </div>
    </section>
  )
}
