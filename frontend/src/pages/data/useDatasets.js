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

    // 내가 실제로 만든 작업물(라벨·분석 이미지)을 실제 데이터로 표 상단에 올린다.
    const artRows = (getArtifacts() || [])
      .filter((a) => a.image)
      .slice()
      .reverse()
      .map((a) => ({
        id: nextId(),
        name: a.title || a.caption || '내 작업 이미지',
        kind: a.kind === 'label' ? '라벨' : '원본',
        count: '1',
        fmt: 'PNG',
        state: '내 작업',
        tone: 'green',
        date: relTime(a.ts),
        owner: '나',
        img: a.image,
        checked: false,
      }))

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
