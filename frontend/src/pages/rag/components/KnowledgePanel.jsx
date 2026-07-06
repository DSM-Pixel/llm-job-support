import { useKnowledge } from '../useKnowledge.js'
import DocPrep from './DocPrep.jsx'
import WebFind from './WebFind.jsx'
import FileList from './FileList.jsx'

// 지식베이스 사이드 — 문서 준비 · 웹에서 찾아 넣기 · 참고중인 파일.
export default function KnowledgePanel() {
  const kb = useKnowledge()

  return (
    <aside className="knowledge">
      <h2>
        <span className="kb-icon">▥</span>지식베이스
      </h2>

      <DocPrep
        samplesOff={kb.samplesOff}
        onToggleSamples={kb.toggleSamples}
        staged={kb.staged}
        uploadRef={kb.uploadRef}
        onUploadChange={kb.onUploadChange}
        onIndex={kb.indexStaged}
        indexBusy={kb.indexBusy}
        onClearStaged={kb.clearStaged}
        indexedText={kb.indexedText}
      />

      <WebFind
        webResults={kb.webResults}
        webBusy={kb.webBusy}
        onSearch={kb.doWebSearch}
        addBusy={kb.addBusy}
        onAdd={kb.addWebPicked}
      />

      <FileList
        files={kb.files}
        onRemove={kb.removeFile}
        resetBusy={kb.resetBusy}
        onReset={kb.resetAll}
      />
    </aside>
  )
}
