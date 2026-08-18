// "이어서 하기" — 방금 고른 사진을 다른 메뉴로 그대로 이어간다.
const NEXT_STEPS = [
  { icon: '⌗', title: '이 사진 라벨링하기', sub: '읽은 위치에 박스를 그려요', href: 'labeling.html' },
  { icon: '▤', title: '보고서에 넣기', sub: '근거 자료로 붙여 초안을 만들어요', href: 'report.html' },
  { icon: '⇄', title: '사고 데이터와 맞춰보기', sub: '같은 구간의 사고 이력을 확인해요', href: 'pubdata.html' },
]

export default function ContinueCards() {
  return (
    <>
      <div className="px-section-head">
        <h3>이어서 하기</h3>
      </div>
      <div className="px-softcards">
        {NEXT_STEPS.map((s) => (
          <a key={s.href} className="px-softcard" href={s.href}>
            <span className="px-softcard-no">{s.icon}</span>
            <p>
              <b>{s.title}</b>
              <br />
              {s.sub}
            </p>
          </a>
        ))}
      </div>
    </>
  )
}
