// 상단 통계 카드 — 유형별 개수(바닐라 .data-stats 마크업 그대로).
export default function DataStats({ stats }) {
  return (
    <section className="data-stats">
      <article className="card">
        <span className="icon-box">⊡</span>
        <div>
          <strong data-stat="원본">{stats.원본}</strong>
          <p>원본 이미지</p>
        </div>
      </article>
      <article className="card">
        <span className="icon-box">⬡</span>
        <div>
          <strong data-stat="라벨">{stats.라벨}</strong>
          <p>라벨</p>
        </div>
      </article>
      <article className="card">
        <span className="icon-box">☰</span>
        <div>
          <strong data-stat="문서">{stats.문서}</strong>
          <p>문서</p>
        </div>
      </article>
      <article className="card">
        <span className="icon-box">▱</span>
        <div>
          <strong data-stat="공공데이터">{stats.공공데이터}</strong>
          <p>공공데이터</p>
        </div>
      </article>
    </section>
  )
}
