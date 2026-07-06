import { useEffect, useState } from 'react'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'
import { searchPubdata, fetchCatalog, catalogText } from './pubdataApi.js'

// 최초 입력값 — 바닐라 .pd-input value 기본값과 동일.
const INITIAL_KEYWORD = '포트홀 도로 파손'

// 공공데이터 페이지 상태·데이터 로직 — 바닐라 pubdata.js 의 search/loadCatalog/DOMContentLoaded 재현.
export function usePubdata() {
  const [keyword, setKeyword] = useState(INITIAL_KEYWORD) // .pd-input value
  const [data, setData] = useState(null) // 마지막 검색 결과(null이면 결과 숨김)
  const [busy, setBusy] = useState(false) // .pd-go 로딩 상태
  const [catalog, setCatalog] = useState('') // .pd-catalog 안내 문구

  // 키워드로 검색 → 결과 반영 + 활동 로그(바닐라 search 동일).
  const search = async (kw) => {
    const q = (kw ?? keyword).trim()
    if (!q) {
      toast('검색어를 입력해주세요')
      return
    }
    setKeyword(q)
    setBusy(true)
    try {
      const d = await searchPubdata(q)
      setData(d)
      logActivity('공공데이터 연계', q)
    } catch {
      /* api() 가 이미 토스트 */
    } finally {
      setBusy(false)
    }
  }

  // 최초: 카탈로그 로드 + ?q=(없으면 기본 입력값)으로 자동 검색.
  useEffect(() => {
    fetchCatalog()
      .then((c) => setCatalog(catalogText(c)))
      .catch(() => {})
    const q = new URLSearchParams(location.search).get('q')
    search(q || INITIAL_KEYWORD)
    // 최초 1회만 실행(바닐라 DOMContentLoaded 동일) — search 는 의존성에서 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { keyword, setKeyword, data, busy, catalog, search }
}
