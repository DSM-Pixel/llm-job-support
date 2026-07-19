import { useEffect, useState } from 'react'
import { toast } from '../../../lib/toast.js'
import { fetchDataKey, saveDataKey } from '../adminApi.js'

// 공공데이터포털(data.go.kr) API 키 설정 — 슈퍼 어드민 전용.
// 키를 저장하면 공공데이터 통계가 실데이터로 조회된다(활용신청 승인된 데이터셋에 한함).
export default function DataKeyCard() {
  const [status, setStatus] = useState(null) // { set, preview(마스킹) }
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchDataKey()
      .then((r) => r.ok && setStatus({ set: r.set, preview: r.preview }))
      .catch(() => {})
  }, [])

  const persist = async (key, okMsg) => {
    setBusy(true)
    try {
      const r = await saveDataKey(key)
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
        <h3>공공데이터포털 API 키</h3>
        {status && (
          <span className={'ad-key-badge' + (status.set ? ' on' : '')}>
            {status.set ? `설정됨 · ${status.preview}` : '미설정'}
          </span>
        )}
      </div>
      <p className="ad-datakey-desc">
        <b>data.go.kr</b> 서비스키를 넣으면 공공데이터 통계가 실데이터로 조회됩니다. 데이터셋마다{' '}
        <b>개별 ‘활용신청’ 승인</b>이 필요하며, 승인된 API만 실데이터가 나옵니다.
      </p>
      <div className="ad-datakey-row">
        <input
          type="password"
          className="ad-datakey-input"
          placeholder={status?.set ? '새 키로 교체하려면 입력' : '서비스키(Decoding) 붙여넣기'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && persist(value.trim(), '공공데이터 API 키를 저장했습니다')}
          autoComplete="off"
        />
        <button
          className="btn primary"
          type="button"
          disabled={busy || !value.trim()}
          onClick={() => persist(value.trim(), '공공데이터 API 키를 저장했습니다')}
        >
          {busy ? '저장 중' : '저장'}
        </button>
        {status?.set && (
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => persist('', '공공데이터 API 키를 삭제했습니다')}
          >
            삭제
          </button>
        )}
      </div>
    </section>
  )
}
