import AppShell from '../../shell/AppShell.jsx'
import KnowledgePanel from './components/KnowledgePanel.jsx'
import AskPanel from './components/AskPanel.jsx'

// 문서 지식 검색(RAG) — 지식베이스 사이드 + 질문/답변/근거. 바닐라 rag.html/rag.js 재현.
export default function RagPage() {
  return (
    <AppShell title="문서 지식 검색" activeNav="rag">
      <section className="rag-layout">
        <KnowledgePanel />
        <AskPanel />
      </section>
    </AppShell>
  )
}
