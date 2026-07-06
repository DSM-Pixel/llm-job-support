import { useEffect, useRef } from 'react'
import { ICONS } from '../dataApi.js'

// 검색어 + 활성 칩으로 해당 행을 숨길지 판단(바닐라 filterRows 동일).
function hiddenFor(d, kw, chip) {
  const text = `${d.name} ${d.kind} ${d.count} ${d.fmt} ${d.state} ${d.date} ${d.owner}`.toLowerCase()
  const matchesKeyword = !kw || text.includes(kw)
  const matchesType =
    chip === '전체' || d.kind === chip || (chip === '원본 이미지' && d.kind === '원본')
  return !(matchesKeyword && matchesType)
}

function DataRow({ d, hidden, editing, onToggle, onRowClick, onMenu, onCommitName }) {
  const icon = ICONS[d.kind] || '▱'
  const nameRef = useRef(null)

  // 이름 수정 진입 시 편집 칸에 포커스.
  useEffect(() => {
    if (editing && nameRef.current) nameRef.current.focus()
  }, [editing])

  return (
    <tr hidden={hidden} data-img={d.img || undefined} onClick={(e) => onRowClick(e, d)}>
      <td>
        <input type="checkbox" checked={d.checked} onChange={() => onToggle(d.id)} />
      </td>
      <td>
        <b className="name-cell">
          <span className="name-icon">{icon}</span>
          <span
            ref={nameRef}
            contentEditable={editing}
            suppressContentEditableWarning
            onKeyDown={(e) => {
              if (editing && e.key === 'Enter') {
                e.preventDefault()
                onCommitName(d.id, e.currentTarget.textContent)
              }
            }}
          >
            {d.name}
          </span>
        </b>
      </td>
      <td>{d.kind}</td>
      <td>{d.count}</td>
      <td className="mono">{d.fmt}</td>
      <td>
        <span className={`status ${d.tone}`}>{d.state}</span>
      </td>
      <td>
        {d.date}
        <small>{d.owner}</small>
      </td>
      <td className="row-actions">
        <button className="row-menu" type="button" aria-label="더보기" onClick={(e) => onMenu(e, d)}>
          ⋮
        </button>
      </td>
    </tr>
  )
}

// 데이터셋 표 — 헤더 + 행. 빈 목록이면 안내 행(바닐라 EMPTY_ROW).
export default function DataTable({
  rows,
  query,
  chip,
  editingId,
  onSelectAll,
  onToggle,
  onRowClick,
  onMenu,
  onCommitName,
}) {
  const kw = query.trim().toLowerCase()
  return (
    <table>
      <thead>
        <tr>
          <th>
            <input type="checkbox" onChange={(e) => onSelectAll(e.target.checked)} />
          </th>
          <th>이름</th>
          <th>유형</th>
          <th>항목 수</th>
          <th>형식</th>
          <th>검수 상태</th>
          <th>업데이트</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr className="data-empty">
            <td colSpan={8}>
              <small>
                아직 데이터가 없습니다. 이미지를 분석·라벨하거나 파일을 업로드하면 여기에 표시됩니다.
              </small>
            </td>
          </tr>
        ) : (
          rows.map((d) => (
            <DataRow
              key={d.id}
              d={d}
              hidden={hiddenFor(d, kw, chip)}
              editing={editingId === d.id}
              onToggle={onToggle}
              onRowClick={onRowClick}
              onMenu={onMenu}
              onCommitName={onCommitName}
            />
          ))
        )}
      </tbody>
    </table>
  )
}
