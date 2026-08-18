import { useMemo, useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { useKnowledge } from './useKnowledge.js'
import AskPanel from './components/AskPanel.jsx'
import KnowledgePanel from './components/KnowledgePanel.jsx'

// 지식베이스 상태는 여기서 소유 — 질문 패널(색인 문서 수)과 문서 패널(근거로 쓰인 파일 배지)이
// 같은 데이터를 공유해야 해서 useKnowledge() 를 페이지 레벨로 끌어올렸다.
function RagContent() {
  const kb = useKnowledge()
  const [lastResult, setLastResult] = useState(null)
  const usedSources = useMemo(
    () => new Set((lastResult?.sources || []).map((s) => s.source)),
    [lastResult],
  )

  return (
    <section className="content rag-page">
      <AskPanel docCount={kb.files.length} onResult={setLastResult} />
      <KnowledgePanel kb={kb} usedSources={usedSources} />
      <div className="px-bottomcta">
        <button
          className="btn primary lg grow"
          type="button"
          disabled={!lastResult?.found}
          title={lastResult?.found ? undefined : '먼저 질문해서 근거를 찾아보세요'}
          onClick={() => (window.location.href = 'report.html')}
        >
          이 결과로 보고서 만들기
        </button>
      </div>
    </section>
  )
}

export default function RagPage() {
  return (
    <AppShell title="문서 검색" activeNav="rag">
      <RagContent />
    </AppShell>
  )
}
