import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/toast.js'
import { saveArtifact } from '../../lib/activity.js'
import { buildReportHtml, buildItemsHtml } from './reportRender.js'
import { getReportText } from './reportText.js'

// 보고서 문서(article.report-page)의 명령형 DOM 조작을 담당하는 훅.
// 바닐라 report.js 와 동일하게 innerHTML 주입 + contenteditable + 섹션 삭제를 재현한다.
// - docRef: article DOM 참조(ReportDocument 가 붙임)
// - reportItems: 보고서에 넣을 자료(이미지/RAG) — '보고서 생성' 시에만 본문 반영
export function useReportDoc() {
  const docRef = useRef(null)
  const lastReportRef = useRef(null) // 마지막 렌더 보고서(AI 수정 시 병합)
  const [reportItems, setReportItems] = useState([])
  const reportItemsRef = useRef([])
  reportItemsRef.current = reportItems

  // 섹션 삭제 확인 모달 상태 — 되돌릴 수 없으니 한 번 더 묻는다.
  const [secDel, setSecDel] = useState(null) // { name, node } | null

  // 첨부 자료를 보고서 문서(출처 위)에 섹션으로 주입/갱신.
  const renderItemsIntoReport = useCallback(() => {
    const page = docRef.current
    if (!page) return
    page.querySelector('.report-attachments')?.remove()
    const section = buildItemsHtml(reportItemsRef.current)
    if (!section) return
    const footer = page.querySelector('footer')
    if (footer) footer.insertAdjacentHTML('beforebegin', section)
    else page.insertAdjacentHTML('beforeend', section)
  }, [])

  // 각 섹션에 '삭제(휴지통)' 버튼 부착(마우스 올리면 보임).
  const addSectionControls = useCallback(() => {
    const page = docRef.current
    if (!page) return
    page.querySelectorAll('section').forEach((sec) => {
      if (sec.querySelector(':scope > .sec-del')) return
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'sec-del'
      btn.setAttribute('contenteditable', 'false')
      btn.title = '이 섹션 삭제'
      btn.setAttribute('aria-label', '이 섹션 삭제')
      btn.textContent = '🗑'
      sec.appendChild(btn)
    })
  }, [])

  // 구조화 응답 → 편집 가능한 제출 보고서 문서로 렌더.
  const renderReport = useCallback(
    (r) => {
      const page = docRef.current
      if (!page) return
      lastReportRef.current = r
      page.innerHTML = buildReportHtml(r)
      renderItemsIntoReport() // 재생성 시에도 첨부 자료 유지
      addSectionControls() // 섹션 삭제 버튼 부착
      // 생성된 보고서를 산출물(아티팩트)로 저장 — 기록 관리에서 DOCX 재다운로드용.
      // 빈/플레이스홀더 렌더는 저장하지 않는다(sections 가 실제로 있을 때만).
      if (Array.isArray(r?.sections) && r.sections.length) {
        saveArtifact({
          kind: 'report',
          id: 'report-' + Date.now(),
          title: r.title || '보고서',
          report: r,
        })
      }
    },
    [renderItemsIntoReport, addSectionControls],
  )

  // 생성 실패로 '로딩 중'이 멈춰 있으면 안내 문구로 대체(가짜 보고서 대신).
  const clearLoadingIfStuck = useCallback(() => {
    const page = docRef.current
    if (page?.querySelector('.report-loading')) {
      page.innerHTML =
        `<div class="report-empty"><p>보고서를 불러오지 못했습니다.</p>` +
        `<p>왼쪽에서 기간·유형을 정하고 ‘보고서 생성’을 눌러주세요.</p></div>`
    }
  }, [])

  // 휴지통 클릭 → 바로 지우지 않고 확인 모달(섹션 이름 표시).
  useEffect(() => {
    const page = docRef.current
    if (!page) return
    const onClick = (e) => {
      const del = e.target.closest('.sec-del')
      if (!del) return
      const node = del.closest('section')
      const name = node?.querySelector('h3')?.textContent.trim() || '이 섹션'
      setSecDel({ name, node })
    }
    page.addEventListener('click', onClick)
    return () => page.removeEventListener('click', onClick)
  }, [])

  const closeSecDel = useCallback(() => setSecDel(null), [])
  const confirmSecDel = useCallback(() => {
    if (secDel?.node) {
      secDel.node.remove()
      toast('섹션을 삭제했습니다')
    }
    setSecDel(null)
  }, [secDel])

  // 내보내기/공유용 — (수정 반영된) 문서 전체 텍스트.
  const readText = useCallback(() => getReportText(docRef.current), [])

  return {
    docRef,
    reportItems,
    setReportItems,
    lastReportRef,
    renderReport,
    clearLoadingIfStuck,
    readText,
    secDel,
    closeSecDel,
    confirmSecDel,
  }
}
