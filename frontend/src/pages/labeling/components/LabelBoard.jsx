import { useMemo, useState } from 'react'

// confidence(신뢰도) 값이 이 이상이면 '검수 완료'로 취급 — 새 저장 필드를 만들지 않고
// 기존 box.confidence 로부터 파생한 표시용 기준일 뿐, 실제 검수 여부를 저장하진 않는다.
const REVIEWED_THRESHOLD = 90

// '찾은 라벨' — 활성 이미지에 저장된 박스(active.savedBoxes)를 신뢰도로 요약해 보여주는
// 읽기 전용 패널(목업 재현). 실제 박스 편집은 '크게 열어 라벨링'(LabelingModal)에서 한다.
export default function LabelBoard({ boxes, onOpenModal }) {
  const [minConf, setMinConf] = useState(0)

  const classCounts = useMemo(() => {
    const m = {}
    boxes.forEach((b) => {
      m[b.label] = (m[b.label] || 0) + 1
    })
    return Object.entries(m)
  }, [boxes])

  const isReviewed = (b) => b.confidence == null || b.confidence >= REVIEWED_THRESHOLD
  const reviewedCount = boxes.filter(isReviewed).length
  const pendingCount = boxes.length - reviewedCount
  const visible = boxes.filter((b) => b.confidence == null || b.confidence >= minConf)
  const hiddenCount = boxes.length - visible.length

  return (
    <section className="label-board">
      <div className="px-stats">
        <div className="px-stat">
          <p className="px-stat-label">찾은 라벨</p>
          <p className="px-stat-value accent">{boxes.length}</p>
        </div>
        <div className="px-stat">
          <p className="px-stat-label">검수 완료</p>
          <p className="px-stat-value">{reviewedCount}</p>
        </div>
        <div className="px-stat">
          <p className="px-stat-label">확인 필요</p>
          <p className="px-stat-value">{pendingCount}</p>
        </div>
        <div className="px-stat conf-stat">
          <p className="px-stat-label">
            신뢰도 {minConf}% 이상 {hiddenCount > 0 && <small>· {hiddenCount}개 숨김</small>}
          </p>
          <input
            type="range"
            className="conf-slider"
            min="0"
            max="100"
            step="5"
            value={minConf}
            onChange={(e) => setMinConf(Number(e.target.value))}
          />
        </div>
      </div>

      {classCounts.length > 0 && (
        <div className="label-classchips">
          {classCounts.map(([label, n]) => (
            <span className="pill" key={label}>
              {label} {n}
            </span>
          ))}
        </div>
      )}

      <div className="px-section-head">
        <h3>
          찾은 라벨 <span className="count">{boxes.length}개</span>
        </h3>
        <button className="px-section-aside" type="button" onClick={onOpenModal}>
          전체 검수 →
        </button>
      </div>

      <div className="px-ranklist label-found-list">
        {visible.length === 0 ? (
          <p className="label-board-empty">
            {boxes.length
              ? '조건에 맞는 라벨이 없습니다 — 신뢰도 기준을 낮춰보세요.'
              : '아직 저장된 라벨이 없습니다 — 캔버스를 눌러 라벨링을 시작해 보세요.'}
          </p>
        ) : (
          visible.map((b, i) => {
            const reviewed = isReviewed(b)
            return (
              <div className="px-rank" key={i}>
                <span className={'px-rank-no' + (i === 0 ? ' top' : '')}>{i + 1}</span>
                <div className="px-rank-main">
                  <b>{b.label}</b>
                  {b.confidence != null && <span className="label-conf-text"> 신뢰도 {b.confidence}%</span>}
                  <span className={'px-badge ' + (reviewed ? 'v' : 'g')}>
                    {reviewed ? '검수 완료' : '확인 필요'}
                  </span>
                  <div className="px-rank-bar">
                    <span
                      className={reviewed ? '' : 'mute'}
                      style={{ width: `${b.confidence ?? 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
