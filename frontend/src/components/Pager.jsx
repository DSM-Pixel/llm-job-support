// 페이지 이동 UI — 페이지 간 공용. 우측 안내문(info)만 페이지별로 다르게 준다.
// 같은 pj-page-* 클래스를 재사용(기존 스타일 그대로).
export function Pager({ page, pages, total, onGo, info }) {
  if (pages <= 1) return null
  const nums = []
  const to = Math.min(pages, Math.max(1, page - 2) + 4)
  for (let i = Math.max(1, to - 4); i <= to; i += 1) nums.push(i)
  const infoText = info ?? `${(total ?? 0).toLocaleString('ko-KR')}개`

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
        {infoText} · {page}/{pages}쪽
      </span>
    </nav>
  )
}
