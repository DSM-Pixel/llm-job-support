import { useState } from 'react'
import { ragDoc } from '../ragApi.js'
import DocModal from './DocModal.jsx'
import WebFind from './WebFind.jsx'

// 파일명 확장자 → 뱃지 라벨. 웹에서 찾아 넣은 문서는 확장자가 없어 'WEB'으로 표시.
const EXT_RE = /\.([a-z0-9]+)$/i
function docType(name) {
  const ext = (EXT_RE.exec(name || '')?.[1] || '').toLowerCase()
  if (ext === 'doc' || ext === 'docx') return 'DOC'
  if (ext) return ext.toUpperCase()
  return 'WEB'
}

// 지식베이스 — 색인한 문서 카드 그리드 + 문서 올리기 + 샘플/웹 검색/초기화 도구.
// kb: useKnowledge() 상태(부모 RagPage 가 소유 — 검색 패널과 색인 문서 수를 공유하기 위해).
// usedSources: 최근 검색 근거로 쓰인 source 이름 집합('답변에 쓰임' 배지 표시용).
export default function KnowledgePanel({ kb, usedSources }) {
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
    <section className="docs-panel">
      <div className="px-section-head">
        <h3>
          색인한 문서 <span className="count">{kb.files.length}개</span>
        </h3>
        <div className="docs-toolbar">
          <label
            className="toggle-row docs-toggle"
            title="켜면 도로·포트홀·시설물 기본 샘플 문서를 검색 대상(근거)에 포함합니다"
          >
            <span>샘플 문서 포함</span>
            <span
              className={'switch' + (kb.samplesOff ? ' off' : '')}
              onClick={kb.toggleSamples}
            ></span>
          </label>
          <button
            className={'card-link reset-all' + (kb.resetBusy ? ' is-loading' : '')}
            type="button"
            title="참고중인 파일 전체를 비우고 기본 샘플만 남깁니다"
            disabled={kb.resetBusy}
            onClick={kb.resetAll}
          >
            {kb.resetBusy ? '초기화 중' : '↻ 전체 초기화'}
          </button>
        </div>
      </div>

      <WebFind
        webResults={kb.webResults}
        webBusy={kb.webBusy}
        onSearch={kb.doWebSearch}
        addBusy={kb.addBusy}
        onAdd={kb.addWebPicked}
      />

      <div className="docs-grid">
        <ul className="file-list">
          {kb.files.map((f, i) => (
            <li key={i} onClick={() => openDoc(f.source)}>
              <span className="doc-type-badge px-badge g">{docType(f.source)}</span>
              {usedSources?.has(f.source) && <span className="px-badge v doc-used-badge">답변에 쓰임</span>}
              <button
                className="file-del"
                type="button"
                title="색인에서 삭제"
                aria-label="삭제"
                onClick={(e) => {
                  e.stopPropagation()
                  kb.removeFile(f.source)
                }}
              >
                ✕
              </button>
              <i>☰</i>
              <b>{f.source}</b>
              <small>조각 {f.chunks}개</small>
            </li>
          ))}
        </ul>

        <label className="doc-upload-card">
          <input
            ref={kb.uploadRef}
            type="file"
            className="upload-input"
            multiple
            accept=".txt,.md,.pdf"
            onChange={kb.onUploadChange}
          />
          <span className="upload-icon">＋</span>
          <b>문서 올리기</b>
          <small>txt · md · pdf</small>
        </label>
      </div>

      <div className="staged-files" hidden={kb.staged.length === 0}>
        {kb.staged.length > 0 && (
          <>
            <span>
              선택됨 <b>{kb.staged.length}개</b> — {kb.staged.map((d) => d.name).join(', ')}
            </span>
            <div className="staged-actions">
              <button
                className={'btn primary index-btn' + (kb.indexBusy ? ' is-loading' : '')}
                title="선택한 문서를 참고중인 파일(검색 근거)에 추가합니다"
                disabled={kb.indexBusy}
                onClick={kb.indexStaged}
              >
                {kb.indexBusy ? '색인 중' : '문서 색인'}
              </button>
              <button
                className="btn flat stage-clear"
                title="아직 색인하지 않은 선택만 취소합니다(참고중인 파일은 그대로)"
                onClick={kb.clearStaged}
              >
                선택 취소
              </button>
            </div>
          </>
        )}
      </div>
      <p className="kb-help">{kb.indexedText}</p>

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
