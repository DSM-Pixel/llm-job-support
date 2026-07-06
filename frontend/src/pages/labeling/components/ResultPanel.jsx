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
            <li className="finding-empty">아직 분석 전입니다. 왼쪽 ‘분석하기’를 누르세요.</li>
          </ul>
        )}
        <p className="result-hint">
          사진을 추가하면 <b>라벨링 화면이 바로 열립니다</b>. 다시 열려면 미리보기 사진을 클릭하거나{' '}
          <b>‘크게 열어 라벨링’</b>을 누르세요.
        </p>
      </article>
    </section>
  )
}
