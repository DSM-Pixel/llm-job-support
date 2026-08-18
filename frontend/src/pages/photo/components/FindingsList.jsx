// "찾은 항목" — 프리셋 예시(MOCK)는 구조화된 라벨(등급·신뢰도)로, 업로드 이미지는 자유 서술로 온다.
// 응답 모양이 달라 둘 다 같은 순위 리스트(.px-ranklist) 안에서 각자 맞는 모양으로 보여준다.
export default function FindingsList({ result }) {
  return (
    <>
      <div className="px-section-head">
        <h3>찾은 항목</h3>
      </div>
      <div className="px-ranklist card">
        {!result && <p className="finding-empty">아직 분석 전입니다. 위에서 ‘분석하기’를 눌러보세요.</p>}

        {result?.mode === 'labels' &&
          (result.items.length ? (
            result.items.map((it, i) => (
              <div className="px-rank" key={i}>
                <span className={'px-rank-no' + (i === 0 ? ' top' : '')}>{i + 1}</span>
                <div className="px-rank-main">
                  <b>{it.class_name}</b>
                  {it.note && <p className="px-rank-note">{it.note}</p>}
                  <div className="px-rank-bar">
                    <span className={i === 0 ? '' : 'mute'} style={{ width: `${it.confidence ?? 0}%` }} />
                  </div>
                </div>
                {it.status.badge ? (
                  <span className="px-badge v">{it.status.text}</span>
                ) : (
                  <span className="px-rank-status">{it.status.text}</span>
                )}
              </div>
            ))
          ) : (
            <p className="finding-empty">찾은 항목이 없습니다.</p>
          ))}

        {result?.mode === 'text' &&
          (result.lines.length ? (
            result.lines.map((line, i) => (
              <div className="px-rank" key={i}>
                <span className="px-rank-no">{i + 1}</span>
                <div className="px-rank-main">
                  <b>{line}</b>
                </div>
              </div>
            ))
          ) : (
            <p className="finding-empty">분석 결과가 비어 있습니다.</p>
          ))}
      </div>
    </>
  )
}
