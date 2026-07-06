// '내 작업에서 가져오기' — 분석·라벨한 이미지와 RAG 도출 결과를 보고서 자료로 staged.
// 기존 report.js renderArtifactPicker 재현. 썸네일/내용 클릭 → 상세 모달, '추가' → 바로 staged.
export default function ArtifactPicker({ artifacts, onAdd, onOpen }) {
  if (!artifacts.length) {
    return (
      <div className="artifact-list">
        <p className="artifact-empty">
          아직 분석·검색한 자료가 없습니다. 이미지 분석·라벨링이나 RAG 검색을 사용하면 여기에
          나타납니다.
        </p>
      </div>
    )
  }

  return (
    <div className="artifact-list">
      {artifacts.map((a) => {
        const sub = a.kind === 'rag' ? a.question || a.title : a.caption || a.title
        return (
          <div className="artifact-item" data-ts={a.ts} key={a.ts} onClick={() => onOpen(a)}>
            <div className="artifact-thumb">
              {a.image ? (
                <img src={a.image} alt="" />
              ) : (
                <span className="artifact-ic">{a.kind === 'rag' ? '⌕' : '◫'}</span>
              )}
            </div>
            <div className="artifact-meta">
              <b>{a.title}</b>
              <small>{sub || ''}</small>
            </div>
            <button
              type="button"
              className="btn artifact-add"
              onClick={(e) => {
                e.stopPropagation()
                onAdd(a)
              }}
            >
              추가
            </button>
          </div>
        )
      })}
    </div>
  )
}
