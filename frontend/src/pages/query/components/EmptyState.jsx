// 첫 진입 화면(빈 상태) — 안내 + 프롬프트 카드 4개. 바닐라 query.html .empty-state 동일.
// 카드 클릭 시 버튼 전체 텍스트(아이콘 문자 포함)를 입력창에 넣는다 — 바닐라 동작 그대로.
export default function EmptyState({ onPick }) {
  const pickText = (e) => onPick(e.currentTarget.textContent.trim())
  return (
    <div className="empty-state">
      <div className="spark">✣</div>
      <h2>무엇이든 자연어로 물어보세요</h2>
      <p>
        질문을 이해해 이미지 분석·공공데이터 검색·보고서 생성·업무<br />자동화로 자동 연결합니다.
      </p>
      <div className="prompt-grid">
        <button className="card" onClick={pickText}><span>⌗</span>포트홀 영역을 찾아줘</button>
        <button className="card" onClick={pickText}><span><i className="search-line-icon" aria-hidden="true"></i></span>공공데이터포털 기반으로 도로 파손 통계를 보여줘</button>
        <button className="card" onClick={pickText}><span><i className="search-line-icon" aria-hidden="true"></i></span>검색 결과를 요약해서 보고서로 만들어줘</button>
        <button className="card" onClick={pickText}><span>⌗</span>심각한 포트홀 대응 절차를 자동으로 추천해줘</button>
      </div>
    </div>
  )
}
