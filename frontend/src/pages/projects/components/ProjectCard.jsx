// 갤러리 카드 — 프로젝트 한 개(진입/삭제/소스·검수 이동).
export default function ProjectCard({ project: p, onEnter, onDelete, onOpen }) {
  const isTeam = (p.visibility || 'team') === 'team'
  return (
    <article className="pj-card" title="이 프로젝트로 들어가기" onClick={() => onEnter(p)}>
      <button
        className="pj-card-del"
        title="프로젝트 삭제"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(p.id)
        }}
      >
        ✕
      </button>
      <div className="pj-card-emoji">{p.emoji}</div>
      <b className="pj-card-name">{p.name}</b>
      <div className="pj-card-tags">
        <span className={`pj-vis ${isTeam ? 'team' : 'private'}`}>
          {isTeam ? `👥 팀 공유${p.team ? ` · ${p.team}` : ''}` : '🔒 개인'}
        </span>
        {p.mine && <span className="pj-vis mine">내 프로젝트</span>}
      </div>
      <small className="pj-card-meta">
        {p.owner_name ? `만든이 ${p.owner_name} · ` : ''}소스 {p.source_count}개 · 검수{' '}
        {p.approved}/{p.source_count}
      </small>
      <div className="pj-card-bar">
        <span style={{ width: `${p.progress}%` }} />
      </div>
      <div className="pj-card-foot">
        <small className="pj-card-progress">검수 진행률 {p.progress}%</small>
        <button
          className="pj-card-manage"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(p.id)
          }}
        >
          소스·검수 →
        </button>
      </div>
    </article>
  )
}
