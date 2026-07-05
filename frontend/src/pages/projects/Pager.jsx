// 페이지 이동 UI — 기존 projects.js renderPager 를 그대로 이식(같은 pj-page-* 클래스).
export function Pager({ page, pages, total, onGo }) {
  if (pages <= 1) return null
  const nums = []
  const to = Math.min(pages, Math.max(1, page - 2) + 4)
  for (let i = Math.max(1, to - 4); i <= to; i += 1) nums.push(i)

  return (
    <nav className="pj-pager">
      <button className="pj-page-btn" disabled={page <= 1} onClick={() => onGo(page - 1)}>
        ‹
      </button>
      {nums.map((i) => (
        <button
          key={i}
          className={`pj-page-btn${i === page ? ' on' : ''}`}
          onClick={() => onGo(i)}
        >
          {i}
        </button>
      ))}
      <button className="pj-page-btn" disabled={page >= pages} onClick={() => onGo(page + 1)}>
        ›
      </button>
      <span className="pj-page-info">
        프로젝트 {total.toLocaleString('ko-KR')}개 · {page}/{pages}쪽
      </span>
    </nav>
  )
}
