// 이미지 갤러리(스트립) — 클릭으로 전환, ✕로 제거, 배지로 라벨 수. 바닐라 renderStrip 재현.
export default function ImageStrip({ images, activeIdx, onSelect, onRemove }) {
  return (
    <div className="image-strip">
      {images.map((im, i) => {
        const n = im.savedBoxes.length
        return (
          <div
            key={i}
            className={'strip-item' + (i === activeIdx ? ' active' : '')}
            title={im.name}
            onClick={() => onSelect(i)}
          >
            <span className="strip-thumb">
              {im.url ? (
                <img src={im.url} alt="" />
              ) : (
                <span className="strip-ph">샘플</span>
              )}
              {n ? (
                <i className="strip-count" title={`라벨 ${n}개`}>
                  {n}
                </i>
              ) : null}
            </span>
            <span className="strip-name">{im.name}</span>
            {!im.sample && (
              <span
                className="strip-del"
                role="button"
                aria-label="제거"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(i)
                }}
              >
                ✕
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
