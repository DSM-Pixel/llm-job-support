import { useEffect, useRef, useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { toast } from '../../lib/toast.js'
import { getActivity, getArtifacts } from '../../lib/activity.js'
import { genReport, genActivity, genFromRag, reviseReport } from './reportApi.js'
import { useReportDoc } from './useReportDoc.js'
import ReportControls from './components/ReportControls.jsx'
import { TYPES } from './reportTypes.js'
import ReportDocument from './components/ReportDocument.jsx'
import ArtifactModal from './components/ArtifactModal.jsx'
import SecDeleteModal from './components/SecDeleteModal.jsx'

const AI_SCOPE = '보고서를 수정하거나 질문하세요 — 예: ‘서론·본론·결론으로 나눠줘’'

// 로컬 기준 YYYY-MM-DD (toISOString은 UTC라 KST에서 하루 어긋나므로 보정).
const fmtDate = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

// 요약·보고서 생성 페이지 — 기존 web/assets/js/report.js 를 React 로 이식(동작 그대로).
export default function ReportPage() {
  const doc = useReportDoc()
  const { docRef, reportItems, setReportItems, lastReportRef, renderReport, clearLoadingIfStuck } = doc

  const [activeIndex, setActiveIndex] = useState(0) // 보고서 유형
  const [start, setStart] = useState(() => fmtDate(new Date(Date.now() - 30 * 86400000)))
  const [end, setEnd] = useState(() => fmtDate(new Date()))
  const [chartOff, setChartOff] = useState(false) // 통계 차트 포함 스위치(off 여부)
  const [busy, setBusy] = useState({ active: false, text: '' })
  const [modalArt, setModalArt] = useState(null) // 아티팩트 상세 모달
  const [artifacts] = useState(() => getArtifacts().slice().reverse()) // 최신 먼저(진입 시 1회)

  // DOM 대신 상태에서 파생 — 시작/종료 → 기간 라벨, 스위치 → 차트 포함.
  const reportType = TYPES[activeIndex]
  const period = start || end ? `${start} ~ ${end}` : '전체 기간'
  const includeChart = !chartOff
  const activeSources = [] // 바닐라: 통계 차트 외 소스 토글이 없어 항상 빈 배열.

  // 내 웹 활동을 날짜 범위로 필터해 분석·통계 보고서 생성. useBusy=false 면 조용히(기본 진입).
  const generateActivity = async (useBusy) => {
    const startMs = start ? new Date(`${start}T00:00:00`).getTime() : -Infinity
    const endMs = end ? new Date(`${end}T23:59:59`).getTime() : Infinity
    const activities = getActivity().filter((a) => a.ts >= startMs && a.ts <= endMs)
    if (useBusy) setBusy({ active: true, text: '분석 중…' })
    try {
      const result = await genActivity({
        activities,
        start,
        end,
        report_type: reportType,
        include_chart: includeChart,
      })
      renderReport(result)
      if (useBusy) {
        toast(
          activities.length
            ? `내 활동 ${activities.length}건을 분석해 보고서를 생성했습니다 (본문 수정 가능)`
            : '선택한 기간에 기록된 활동이 없습니다 — 질의·검색·이미지 분석을 사용하면 집계됩니다',
        )
      }
    } catch {
      /* api()가 toast */
    } finally {
      clearLoadingIfStuck()
      if (useBusy) setBusy({ active: false, text: '' })
    }
  }

  // web=true 면 인터넷 웹 검색 기반, false 면 빠른 예시. query 있으면 그 주제로 생성.
  const generate = async (web, query) => {
    setBusy({ active: true, text: web ? '웹 검색 중…' : '생성 중' })
    try {
      const result = await genReport(
        {
          report_type: reportType,
          period,
          sources: activeSources,
          include_chart: includeChart,
          query: query || '',
        },
        web,
      )
      renderReport(result)
      toast(
        result.backend === 'GEMINI_WEB'
          ? '웹 검색으로 보고서를 생성했습니다 (출처 클릭 가능, 본문 수정 가능)'
          : '보고서를 생성했습니다 (본문 수정 가능)',
      )
    } catch {
      /* api()가 toast */
    } finally {
      clearLoadingIfStuck()
      setBusy({ active: false, text: '' })
    }
  }

  // RAG 검색 결과를 그대로 이어받아 보고서로 생성.
  const generateFromRag = async (ctx) => {
    setBusy({ active: true, text: '생성 중…' })
    try {
      const result = await genFromRag({
        question: ctx.question,
        answer: ctx.answer,
        sources: ctx.sources,
        report_type: reportType,
        period,
        include_chart: includeChart,
      })
      renderReport(result)
      toast('RAG 검색 내용으로 보고서를 생성했습니다 (본문 수정 가능)')
    } catch {
      /* api()가 toast */
    } finally {
      clearLoadingIfStuck()
      setBusy({ active: false, text: '' })
    }
  }

  // 진입 동작 — from=rag → RAG 이어받기, ?q= → 웹 검색, 그 외 → 내 활동 요약(기본).
  const didRun = useRef(false)
  useEffect(() => {
    if (didRun.current) return // StrictMode 이중 실행 방지(1회만 생성)
    didRun.current = true
    const params = new URLSearchParams(location.search)
    let ragCtx = null
    if (params.get('from') === 'rag') {
      try {
        ragCtx = JSON.parse(sessionStorage.getItem('ragReport') || 'null')
      } catch {
        ragCtx = null
      }
    }
    const incomingQuery = params.get('q')
    if (ragCtx) {
      generateFromRag(ragCtx)
    } else if (incomingQuery) {
      toast(`‘${incomingQuery}’ 관련 보고서를 생성합니다…`)
      generate(true, incomingQuery)
    } else {
      generateActivity(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 자료 staged(추가 예정) — '보고서 생성' 시에만 본문 반영 ──────
  const addArtifact = (a) => {
    if (a.kind === 'rag') {
      setReportItems((prev) => [
        ...prev,
        { type: 'rag', question: a.question, answer: a.answer, source: a.source, snippet: a.snippet },
      ])
    } else if (a.image) {
      setReportItems((prev) => [...prev, { type: 'image', src: a.image, caption: a.caption || a.title }])
    }
    toast('자료를 추가했습니다 — ‘보고서 생성’ 시 반영됩니다')
  }

  const addImages = (files) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'))
    if (!imgs.length) return
    let remaining = imgs.length
    imgs.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setReportItems((prev) => [...prev, { type: 'image', src: String(reader.result || ''), caption: '첨부 사진' }])
        if (--remaining === 0) toast(`사진 ${imgs.length}장 추가 — ‘보고서 생성’ 시 반영됩니다`)
      }
      reader.readAsDataURL(file)
    })
  }

  const removeThumb = (i) => setReportItems((prev) => prev.filter((_, idx) => idx !== i))

  // AI 대화 패널 = 보고서 편집기. 수정 지시면 본문을 다시 쓰고, 질문이면 답한다.
  const reviseHandler = async (q) => {
    const r = await reviseReport({ content: docRef.current.innerText, instruction: q })
    if (r.mode === 'edit' && r.sections && r.sections.length) {
      // 제목·섹션만 교체하고 머리말·통계표·출처·첨부 자료는 유지.
      renderReport({
        ...(lastReportRef.current || {}),
        title: r.title || lastReportRef.current?.title || '보고서',
        sections: r.sections,
      })
      return '보고서를 수정했습니다. 왼쪽 미리보기를 확인하세요. (본문을 직접 더 고칠 수도 있어요)'
    }
    return r.answer
  }

  return (
    <>
      <AppShell
        title="요약·보고서 생성"
        activeNav="report"
        askHandler={reviseHandler}
        aiScope={AI_SCOPE}
      >
        <section className="report-layout">
          <ReportControls
            activeIndex={activeIndex}
            onSelectType={setActiveIndex}
            start={start}
            end={end}
            onStart={setStart}
            onEnd={setEnd}
            chartOff={chartOff}
            onToggleChart={() => setChartOff((v) => !v)}
            artifacts={artifacts}
            onAddArtifact={addArtifact}
            onOpenArtifact={setModalArt}
            reportItems={reportItems}
            onAddImages={addImages}
            onRemoveThumb={removeThumb}
            onGenerate={() => generateActivity(true)}
            busy={busy}
          />
          <ReportDocument docRef={docRef} readText={doc.readText} />
        </section>
      </AppShell>

      {modalArt && (
        <ArtifactModal
          art={modalArt}
          onClose={() => setModalArt(null)}
          onAdd={(a) => {
            addArtifact(a)
            setModalArt(null)
          }}
        />
      )}
      {doc.secDel && (
        <SecDeleteModal
          name={doc.secDel.name}
          onCancel={doc.closeSecDel}
          onConfirm={doc.confirmSecDel}
        />
      )}
    </>
  )
}
