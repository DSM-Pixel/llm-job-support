import AppShell from '../../shell/AppShell.jsx'
import { usePubdata } from './usePubdata.js'
import { sendToReport } from './pubdataApi.js'
import PdSearch from './components/PdSearch.jsx'
import PdResult from './components/PdResult.jsx'

// 공공데이터 통계 페이지 — 검색 박스 + AI 요약·통계 랭킹·데이터셋(바닐라 pubdata.js 재현).
// 얇게: 상태 배선(usePubdata) + 하위 컴포넌트 조합만.
export default function PubdataPage() {
  const { keyword, setKeyword, data, busy, catalog, search } = usePubdata()

  // 이 통계와 우리 쪽 문서를 맞대 볼 수 있게 문서 검색으로 넘긴다 — rag.html 은 ?q= 자동검색 지원.
  const compareWithDocs = () => {
    if (!data) return
    location.href = `rag.html?q=${encodeURIComponent(data.keyword)}`
  }

  return (
    <AppShell title="동네 정보 알아보기" activeNav="pubdata">
      <section className="content pd-layout">
        <PdSearch
          keyword={keyword}
          setKeyword={setKeyword}
          busy={busy}
          catalog={catalog}
          onSearch={search}
        />
        {data ? (
          <PdResult data={data} onToReport={() => sendToReport(data)} onCompare={compareWithDocs} />
        ) : (
          !busy && (
            <div className="pd-empty">
              <span className="pd-empty-mark" aria-hidden="true">
                ▦
              </span>
              <p className="pd-empty-title">무엇이 궁금한지 물어보세요</p>
              <p className="pd-empty-sub">
                위 검색창에 질문을 입력하면 공공데이터를 찾아 요약·통계·출처로 정리해 드려요.
                <br />
                위 칩(교통사고 다발지역·CCTV·시설물 안전점검 등)을 눌러 바로 찾아볼 수도 있어요.
              </p>
            </div>
          )
        )}
      </section>
    </AppShell>
  )
}
