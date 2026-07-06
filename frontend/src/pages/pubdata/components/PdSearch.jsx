// 검색 박스 — 입력창 + 예시 칩 + 안내 + 카탈로그 현황(바닐라 .pd-search 재현).

// 예시 칩 — 바닐라 .pd-chip 버튼 텍스트와 동일 순서.
const CHIPS = ['포트홀 도로 파손', 'CCTV 이상행동', '시설물 안전점검', '교통사고 다발지역']

export default function PdSearch({ keyword, setKeyword, busy, catalog, onSearch }) {
  return (
    <div className="pd-search card">
      <label className="pd-label">
        <span>1</span>공공데이터포털에서 찾기
      </label>
      <div className="pd-search-line">
        <input
          className="pd-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="예: 포트홀, CCTV 이상행동, 시설물 안전점검, 교통사고"
        />
        <button
          className={'btn primary pd-go' + (busy ? ' is-loading' : '')}
          type="button"
          disabled={busy}
          onClick={() => onSearch()}
        >
          {busy ? '불러오는 중' : '→ 통계 보기'}
        </button>
      </div>
      <div className="pd-chips">
        {CHIPS.map((chip) => (
          <button key={chip} className="pd-chip" type="button" onClick={() => onSearch(chip)}>
            {chip}
          </button>
        ))}
      </div>
      <p className="pd-help">
        자연어로 주제를 입력하면 <b>공공데이터포털(data.go.kr)</b> 관련 데이터셋과 통계를 찾아
        시각화합니다. <span className="pd-badge sample">샘플 통계</span> 표시는 발표용 예시
        수치입니다.
      </p>
      <p className="pd-catalog">{catalog}</p>
    </div>
  )
}
