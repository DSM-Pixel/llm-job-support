import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { getArtifacts } from '../../lib/activity.js'
import { relTime } from '../../lib/time.js'
import { computeStats } from './dataApi.js'

// 표 데이터 초기 로드 — 내 실제 작업물(localStorage 아티팩트) + 서버 데이터셋.
// 통계는 바닐라와 동일하게 '초기 로드 시점'에만 계산하고 이후(업로드/삭제)엔 갱신하지 않는다.
export function useDatasets() {
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ 원본: 0, 라벨: 0, 문서: 0, 공공데이터: 0 })

  useEffect(() => {
    let alive = true
    let n = 0
    const nextId = () => `s${n++}`

    // 내가 실제로 만든 작업물을 실제 데이터로 표 상단에 올린다.
    // cat(저장 시 지정): 라벨/원본/문서/공공데이터. 예전 데이터(cat 없음)는 유형 추정.
    const catOf = (a) => a.cat || (a.image ? '원본' : a.kind === 'report' ? '문서' : '문서')
    const fmtOf = (a, kind) =>
      a.image ? 'PNG' : kind === '공공데이터' ? 'API' : a.kind === 'report' ? 'DOCX' : 'DOC'
    const artRows = (getArtifacts() || [])
      .slice()
      .reverse()
      .map((a) => {
        const kind = catOf(a)
        return {
          id: nextId(),
          name: a.title || a.caption || a.question || '내 작업',
          kind,
          count: '1',
          fmt: fmtOf(a, kind),
          state: '내 작업',
          tone: 'green',
          date: relTime(a.ts),
          owner: '나',
          img: a.image || '',
          checked: false,
        }
      })

    ;(async () => {
      let all
      try {
        const data = await api('/api/datasets')
        const srv = (data.datasets || []).map((d) => ({
          ...d,
          id: nextId(),
          img: d.img || '',
          checked: false,
        }))
        all = [...artRows, ...srv]
      } catch {
        all = artRows
      }
      if (!alive) return
      setRows(all)
      setStats(computeStats(all))
    })()

    return () => {
      alive = false
    }
  }, [])

  return { rows, setRows, stats }
}
