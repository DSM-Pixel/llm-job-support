// 분석 결과 패널(result-card) — 활성 이미지의 result 를 복원해 보여준다.
// result 는 {html, confText, confClass} | null. 바닐라 restoreResult 재현.
export default function ResultPanel({ result }) {
  const confText = result ? result.confText : '분석 전'
  const confClass = result ? result.confClass : 'status gray'
  return (
    <section className="result-panel">
      <article className="card result-card">
        <div className="answer-head">
          <h3>✣ 분석 결과</h3>
          <span className={confClass}>{confText}</span>
        </div>
        {result ? (
          <ul className="finding-list" dangerouslySetInnerHTML={{ __html: result.html }} />
        ) : (
          <ul className="finding-list">
            <li className="finding-empty">
              아직 분석 전이에요. 프롬프트에 찾을 대상을 적고 <b>‘AI로 찾기’</b>를 눌러보세요.
            </li>
          </ul>
        )}
        <p className="result-hint">
          사진을 올리면 위 미리보기에 바로 나타나요. 직접 박스를 그려 라벨링하려면 미리보기를 클릭하거나{' '}
          툴바의 <b>‘박스 추가’</b>를 누르세요.
        </p>
      </article>
    </section>
  )
}
