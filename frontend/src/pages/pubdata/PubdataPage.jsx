import AppShell from '../../shell/AppShell.jsx'
import { usePubdata } from './usePubdata.js'
import { sendToReport } from './pubdataApi.js'
import PdSearch from './components/PdSearch.jsx'
import PdResult from './components/PdResult.jsx'

// 공공데이터 통계 페이지 — 검색 박스 + AI 요약·막대차트·데이터셋(바닐라 pubdata.js 재현).
// 얇게: 상태 배선(usePubdata) + 하위 컴포넌트 조합만.
export default function PubdataPage() {
  const { keyword, setKeyword, data, busy, catalog, search } = usePubdata()

  return (
    <AppShell title="공공데이터 통계" activeNav="pubdata">
      <section className="pd-layout">
        <PdSearch
          keyword={keyword}
          setKeyword={setKeyword}
          busy={busy}
          catalog={catalog}
          onSearch={search}
        />
        {data && <PdResult data={data} onToReport={() => sendToReport(data)} />}
      </section>
    </AppShell>
  )
}
