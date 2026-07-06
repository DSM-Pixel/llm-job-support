import { useState } from 'react'
import { ragDoc } from '../ragApi.js'
import DocModal from './DocModal.jsx'

// 참고중인 파일 — 클릭하면 내용 열람, ✕로 삭제, 하단 전체 초기화.
export default function FileList({ files, onRemove, resetBusy, onReset }) {
  const [doc, setDoc] = useState({ open: false, title: '', chunks: [], found: false })

  const openDoc = async (name) => {
    try {
      const r = await ragDoc(name)
      setDoc({ open: true, title: name, chunks: r.chunks || [], found: r.found })
    } catch {
      /* api()가 toast 표시 */
    }
  }

  return (
    <section className="kb-section">
      <h3>
        <span>⌘</span>참고중인 파일
      </h3>
      <ul className="file-list">
        {files.map((f, i) => (
          <li key={i} onClick={() => openDoc(f.source)}>
            <i>☰</i>
            <b>{f.source}</b>
            <small>청크 {f.chunks}개</small>
            <button
              className="file-del"
              type="button"
              title="색인에서 삭제"
              aria-label="삭제"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(f.source)
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        className={'btn flat wide reset-all' + (resetBusy ? ' is-loading' : '')}
        type="button"
        title="참고중인 파일 전체를 비우고 기본 샘플만 남깁니다"
        disabled={resetBusy}
        onClick={onReset}
      >
        {resetBusy ? '초기화 중' : '↻ 전체 참고 파일 초기화'}
      </button>

      <DocModal
        open={doc.open}
        title={doc.title}
        chunks={doc.chunks}
        found={doc.found}
        onClose={() => setDoc((d) => ({ ...d, open: false }))}
      />
    </section>
  )
}
