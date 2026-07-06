// 보고서 문서를 HTML 문자열로 만드는 순수 함수들 — 기존 report.js 의 렌더 로직 이식.
// 문서 편집기(article.report-page)는 contenteditable·섹션 삭제 등 명령형 DOM 조작이 많아
// 바닐라와 동일하게 innerHTML 을 직접 만들어 주입한다(bug-for-bug 재현).

export const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

// AI가 준 출처 URL은 innerHTML href 로 들어가므로 http(s) 만 허용(javascript: 등 스킴 차단).
export const safeUrl = (value) => {
  const s = String(value ?? '').trim()
  return /^https?:\/\//i.test(s) ? s : '#'
}

// 본문(여러 문단 + '- ' 불릿)을 문단/목록 HTML로 렌더.
export const renderBody = (body) => {
  const lines = String(body || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  let html = ''
  let inList = false
  for (const ln of lines) {
    if (/^[-*•]\s+/.test(ln)) {
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${escapeHtml(ln.replace(/^[-*•]\s+/, ''))}</li>`
    } else {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      html += `<p>${escapeHtml(ln)}</p>`
    }
  }
  if (inList) html += '</ul>'
  return html || '<p></p>'
}

// 첨부 자료(이미지·RAG 결과)를 '근거 자료' 섹션 HTML 로.
export const buildItemsHtml = (reportItems) => {
  if (!reportItems.length) return ''
  const images = reportItems.filter((it) => it.type === 'image')
  const rags = reportItems.filter((it) => it.type === 'rag')
  let inner = ''
  if (images.length) {
    inner +=
      `<div class="report-img-grid">` +
      images
        .map(
          (it) =>
            `<figure><img src="${it.src}" alt="" /><figcaption contenteditable="true">${escapeHtml(it.caption || '')}</figcaption></figure>`,
        )
        .join('') +
      `</div>`
  }
  inner += rags
    .map(
      (it) =>
        `<div class="report-finding"><b>RAG 도출 결과</b>` +
        `<p contenteditable="true">질문: ${escapeHtml(it.question || '')}</p>` +
        `<p contenteditable="true">결과: ${escapeHtml(it.answer || '')}</p>` +
        (it.source
          ? `<p class="rf-src">근거: ${escapeHtml(it.source)}${it.snippet ? ` — ${escapeHtml(it.snippet)}` : ''}</p>`
          : '') +
        `</div>`,
    )
    .join('')
  return `<section class="report-attachments"><h3 contenteditable="true">근거 자료 · 내 작업 결과</h3>${inner}</section>`
}

// 구조화 응답(r)을 편집 가능한 제출 보고서 문서 HTML 로.
export const buildReportHtml = (r) => {
  const sections = (r.sections || [])
    .map(
      (s) =>
        `<section><h3 contenteditable="true">${escapeHtml(s.heading)}</h3><div class="sec-body" contenteditable="true">${renderBody(s.body)}</div></section>`,
    )
    .join('')

  // 표 하나를 섹션으로 — 활동 보고서는 여러 통계표(유형·일자·화면·로그)를 낼 수 있다.
  const tableHtml = (t) => {
    if (!t || !t.columns) return ''
    const head = t.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
    const body = (t.rows || [])
      .map(
        (row) =>
          `<tr>${row.map((c) => `<td contenteditable="true">${escapeHtml(c)}</td>`).join('')}</tr>`,
      )
      .join('')
    return `<section><h3 contenteditable="true">${escapeHtml(t.caption)}</h3><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`
  }
  let table = tableHtml(r.table)
  if (Array.isArray(r.tables)) table += r.tables.map(tableHtml).join('')

  const sources = (r.sources || [])
    .map((s) =>
      s && typeof s === 'object'
        ? `<a class="pill src-link" href="${escapeHtml(safeUrl(s.url))}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a>`
        : `<span class="pill">${escapeHtml(s)}</span>`,
    )
    .join('')

  return `
      <header>
        <p>${escapeHtml(r.org)} · ${escapeHtml(r.report_type)}</p>
        <h2 contenteditable="true">${escapeHtml(r.title)}</h2>
        ${r.subtitle ? `<span>${escapeHtml(r.subtitle)}</span>` : ''}
        ${r.date ? `<span class="report-date">작성일 ${escapeHtml(r.date)}</span>` : ''}
      </header>
      ${sections}
      ${table}
      <footer><b>출처</b>${sources}</footer>`
}
