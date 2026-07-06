import { CHIPS } from '../dataApi.js'

// 필터 칩 + 검색 + 업로드 — 바닐라 .table-tools 마크업/동작 그대로.
export default function TableTools({
  chip,
  onChip,
  query,
  onQuery,
  uploading,
  onUpload,
  fileRef,
  onFiles,
}) {
  return (
    <div className="table-tools">
      <div className="chips">
        {CHIPS.map((c) => (
          <span
            key={c}
            className={'pill' + (c === chip ? ' active' : '')}
            onClick={() => onChip(c)}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="search-upload">
        <input
          type="search"
          placeholder="데이터셋 검색"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        <button
          className={'btn primary' + (uploading ? ' is-loading' : '')}
          type="button"
          disabled={uploading}
          onClick={onUpload}
        >
          {uploading ? '업로드 중' : '업로드'}
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={onFiles} />
      </div>
    </div>
  )
}
