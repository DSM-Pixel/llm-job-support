import { useEffect, useState } from 'react'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'
import { searchPubdata, fetchCatalog, catalogText } from './pubdataApi.js'

// 최초 입력값 — 빈 상태로 시작(placeholder만 노출). 직전 검색이 있으면 그걸 복원.
const INITIAL_KEYWORD = ''

// 마지막 검색 결과 저장 키 — 다른 메뉴 갔다 와도 직전 결과를 다시 볼 수 있게.
const LAST_KEY = 'gnsoft.pubdata.last'
const loadLast = () => {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) || 'null')
  } catch {
    return null
  }
}

// 공공데이터 페이지 상태·데이터 로직 — 바닐라 pubdata.js 의 search/loadCatalog/DOMContentLoaded 재현.
export function usePubdata() {
  const last = loadLast() // 직전 검색 결과(있으면 재진입 시 복원)
  const [keyword, setKeyword] = useState(last?.keyword || INITIAL_KEYWORD) // .pd-input value
  const [data, setData] = useState(last?.data || null) // 마지막 검색 결과(null이면 결과 숨김)
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
      try {
        localStorage.setItem(LAST_KEY, JSON.stringify({ keyword: q, data: d }))
      } catch {
        /* 저장 불가 시 무시 */
      }
      logActivity('공공데이터 연계', q)
    } catch {
      /* api() 가 이미 토스트 */
    } finally {
      setBusy(false)
    }
  }

  // 최초: 카탈로그 안내만 로드. 통계 조회는 사용자가 '→ 통계 보기'를 눌러야 실행한다.
  // (첫 로드 자동 검색 제거 — 버튼 없이 통계가 뜨지 않게. 단, 외부에서 ?q=키워드 로
  //  들어온 경우에만 그 키워드로 자동 조회.)
  useEffect(() => {
    fetchCatalog()
      .then((c) => setCatalog(catalogText(c)))
      .catch(() => {})
    const q = new URLSearchParams(location.search).get('q')
    if (q) search(q)
    // 최초 1회만 실행 — search 는 의존성에서 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { keyword, setKeyword, data, busy, catalog, search }
}
