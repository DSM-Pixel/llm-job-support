// 보고서(수정 반영된) 문서 전체를 가독성 있는 일반 텍스트로 — 복사·공유용.
// 기존 report.js getReportText 이식. 삭제 버튼(🗑, .sec-del)은 제외한다.
export const getReportText = (reportPage) => {
  if (!reportPage) return '보고서'
  const root = reportPage.cloneNode(true)
  root.querySelectorAll('.sec-del').forEach((b) => b.remove())
  const out = []
  const push = (s = '') => out.push(s)
  const txt = (el) => (el ? el.innerText.replace(/[ \t]+\n/g, '\n').trim() : '')

  const header = root.querySelector('header')
  if (header) {
    const title = txt(header.querySelector('h2'))
    const sub = txt(header.querySelector('span'))
    const org = txt(header.querySelector('p'))
    if (title) push(title)
    if (sub) push(sub)
    if (org) push(`(${org})`)
    push()
    push('─'.repeat(34))
    push()
  }

  root.querySelectorAll(':scope > section').forEach((sec) => {
    const heading = txt(sec.querySelector(':scope > h3'))
    if (heading) {
      push(`■ ${heading}`)
      push()
    }
    const table = sec.querySelector('table')
    if (table) {
      table.querySelectorAll('tr').forEach((tr) => {
        push([...tr.children].map((c) => c.innerText.trim()).join('  |  '))
      })
      push()
      return
    }
    // RAG 도출 결과 블록
    sec.querySelectorAll('.report-finding').forEach((f) => {
      f.querySelectorAll('b, p').forEach((el) => {
        const t = txt(el)
        if (t) push(el.tagName === 'B' ? `· ${t}` : `  ${t}`)
      })
      push()
    })
    // 첨부 이미지 캡션
    sec.querySelectorAll('figcaption').forEach((c) => {
      const t = txt(c)
      if (t) push(`[이미지] ${t}`)
    })
    // 본문(문단/불릿)
    const body = sec.querySelector('.sec-body')
    if (body) {
      body.querySelectorAll('p, li').forEach((el) => {
        const t = txt(el)
        if (t) push(el.tagName === 'LI' ? `  • ${t}` : t)
      })
      push()
    }
  })

  const footer = root.querySelector('footer')
  if (footer) {
    const sources = [...footer.querySelectorAll('.pill, .src-link')]
      .map((p) => p.innerText.trim())
      .filter(Boolean)
    if (sources.length) push(`출처: ${sources.join(', ')}`)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() || '보고서'
}
