// "분석할 사진" 썸네일 스트립 — 4장 중 선택된 사진에 체크 표시, 활성 사진은 분석 중/완료/대기 상태를 보여준다.
export default function PhotoStrip({ photos, activeIdx, busy, hasResult, onSelect, onPick }) {
  return (
    <>
      <div className="px-section-head">
        <h3>
          분석할 사진 <span className="count">{photos.length}장 중 {activeIdx + 1}번째</span>
        </h3>
      </div>
      <div className="px-photostrip">
        {photos.map((p, i) => {
          const isActive = i === activeIdx
          const status = isActive && busy ? '분석 중' : isActive && hasResult ? '완료' : '대기'
          return (
            <button
              key={p.name}
              type="button"
              className={'px-photothumb' + (isActive ? ' active' : '')}
              onClick={() => (p.url ? onSelect(i) : onPick(i))}
            >
              <span className="px-photothumb-img">
                {p.url && <img src={p.url} alt={p.name} />}
                {isActive && <i className="px-photothumb-check">✓</i>}
              </span>
              <span className="px-photothumb-meta">
                <b>{p.name}</b>
                <span>{status}</span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
