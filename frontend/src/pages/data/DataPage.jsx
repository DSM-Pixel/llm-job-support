import { useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'
import { getProject } from '../../lib/storage.js'
import AppShell from '../../shell/AppShell.jsx'
import { guessKind, fileExtUpper } from './dataApi.js'
import { useDatasets } from './useDatasets.js'
import DataStats from './components/DataStats.jsx'
import TableTools from './components/TableTools.jsx'
import DataTable from './components/DataTable.jsx'
import RowMenu from './components/RowMenu.jsx'
import PreviewModal from './components/PreviewModal.jsx'
import DeleteModal from './components/DeleteModal.jsx'

// 데이터 관리 본문 — 표 상태 배선 + 하위 컴포넌트 조합만.
function DataContent() {
  const { rows, setRows, stats } = useDatasets()
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState('전체')
  const [uploading, setUploading] = useState(false)
  const [menu, setMenu] = useState(null) // { id, x, y }
  const [preview, setPreview] = useState(null) // row
  const [deleting, setDeleting] = useState(null) // row
  const [editingId, setEditingId] = useState(null)
  const fileRef = useRef(null)
  const idRef = useRef(0)

  // '이 프로젝트의 소스·검수 관리' 링크에 현재 프로젝트 딥링크 연결.
  const proj = getProject()
  const srcHref = proj ? `projects.html?p=${encodeURIComponent(proj.id)}` : 'projects.html'

  // 헤더 전체선택 — 숨김 행 포함 모든 체크박스에 반영(바닐라 동일).
  const selectAll = (checked) => setRows((rs) => rs.map((r) => ({ ...r, checked })))
  const toggle = (id) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r)))

  // 행 아무 곳이나 클릭해도 체크 토글(체크박스·⋮메뉴·이름 편집 중은 제외).
  const onRowClick = (e, d) => {
    if (
      e.target.closest("input[type='checkbox']") ||
      e.target.closest('.row-menu') ||
      e.target.closest("[contenteditable='true']")
    ) {
      return
    }
    toggle(d.id)
  }

  const onMenu = (e, d) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMenu({ id: d.id, x: r.right - 130 + window.scrollX, y: r.bottom + 4 + window.scrollY })
  }

  const onMenuAction = (act) => {
    const row = rows.find((r) => r.id === menu?.id)
    setMenu(null)
    if (!row) return
    if (act === 'delete') {
      setDeleting(row)
    } else if (act === 'edit') {
      setEditingId(row.id)
      toast('이름을 수정한 뒤 Enter를 누르세요')
    } else if (act === 'preview') {
      setPreview(row)
    }
  }

  const commitName = (id, text) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, name: text } : r)))
    setEditingId(null)
    toast('이름을 수정했습니다')
  }

  const confirmDelete = () => {
    setRows((rs) => rs.filter((r) => r.id !== deleting.id))
    toast('데이터셋을 삭제했습니다')
    setDeleting(null)
  }

  // ── 업로드: 파일 선택 → 표 상단에 새 행 추가(업로드 대기) ──────────
  const openPicker = () => fileRef.current?.click()
  const onFiles = async (e) => {
    const files = [...e.target.files]
    if (!files.length) return
    setUploading(true)
    const names = files.map((f) => f.name).join(', ')
    try {
      await api('/api/datasets/upload', { name: names })
      logActivity('데이터 업로드', names)
      const newRows = files.map((f) => ({
        id: `u${idRef.current++}`,
        name: f.name,
        kind: guessKind(f.name),
        count: '—',
        fmt: fileExtUpper(f.name),
        state: '업로드 대기',
        tone: 'gray',
        date: '방금',
        owner: '나',
        img: '',
        checked: false,
      }))
      // 이미지 파일이면 실제 사진을 dataURL 로 읽어 '미리보기'용으로 채운다.
      newRows.forEach((r, i) => {
        const f = files[i]
        if (/^image\//.test(f.type) || /\.(jpe?g|png|bmp|gif|webp)$/i.test(f.name)) {
          const reader = new FileReader()
          reader.onload = () =>
            setRows((rs) =>
              rs.map((x) => (x.id === r.id ? { ...x, img: String(reader.result || '') } : x)),
            )
          reader.readAsDataURL(f)
        }
      })
      // 바닐라는 각 파일을 맨 위에 끼워넣어 마지막 파일이 최상단이 된다 → 역순 prepend.
      setRows((rs) => [...newRows.slice().reverse(), ...rs])
      toast(`${files.length}개 파일을 데이터셋에 추가했습니다 (업로드 대기)`)
    } catch {
      /* api 헬퍼가 토스트 처리 */
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <section className="content data-content">
      <div className="data-project-link">
        <a className="card-link" data-role="src-review" href={srcHref}>
          ◳ 이 프로젝트의 소스·검수 관리 →
        </a>
      </div>

      <DataStats stats={stats} />

      <TableTools
        chip={chip}
        onChip={setChip}
        query={query}
        onQuery={setQuery}
        uploading={uploading}
        onUpload={openPicker}
        fileRef={fileRef}
        onFiles={onFiles}
      />

      <section className="card table-card">
        <DataTable
          rows={rows}
          query={query}
          chip={chip}
          editingId={editingId}
          onSelectAll={selectAll}
          onToggle={toggle}
          onRowClick={onRowClick}
          onMenu={onMenu}
          onCommitName={commitName}
        />
      </section>

      {menu && <RowMenu x={menu.x} y={menu.y} onAction={onMenuAction} onClose={() => setMenu(null)} />}
      {preview && <PreviewModal row={preview} onClose={() => setPreview(null)} />}
      {deleting && (
        <DeleteModal row={deleting} onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
      )}
    </section>
  )
}

export default function DataPage() {
  return (
    <AppShell title="데이터 관리" activeNav="data">
      <DataContent />
    </AppShell>
  )
}
