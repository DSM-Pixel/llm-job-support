// 현재 보고서 데이터(마지막 응답 객체)를 .docx 로 만들어 브라우저 다운로드.
// 렌더 경로와 같은 데이터(title·subtitle·sections[heading/body/bullets]·table)를 그대로 읽는다.
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx'

// 본문 문자열 → 문단/불릿 Paragraph 배열('- ' 로 시작하면 불릿).
const bodyToParagraphs = (body) =>
  String(body || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((ln) =>
      /^[-*•]\s+/.test(ln)
        ? new Paragraph({ text: ln.replace(/^[-*•]\s+/, ''), bullet: { level: 0 } })
        : new Paragraph({ text: ln }),
    )

// 통계표(columns/rows) → docx Table. 없으면 null.
const buildTable = (t) => {
  if (!t || !t.columns) return null
  const cell = (text, header) =>
    new TableCell({
      children: [new Paragraph({ text: String(text ?? ''), ...(header ? { heading: HeadingLevel.HEADING_3 } : {}) })],
    })
  const rows = [
    new TableRow({ children: t.columns.map((c) => cell(c, true)) }),
    ...(t.rows || []).map((row) => new TableRow({ children: row.map((c) => cell(c, false)) })),
  ]
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })
}

// blob 을 임시 <a> 로 다운로드.
const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// 보고서 데이터 → .docx 다운로드. r 이 없으면 조용히 반환(호출부에서 안내).
export async function downloadDocx(r) {
  if (!r) return false
  const children = []
  children.push(new Paragraph({ text: r.title || '보고서', heading: HeadingLevel.TITLE }))
  if (r.subtitle) children.push(new Paragraph({ text: r.subtitle }))

  for (const s of r.sections || []) {
    children.push(new Paragraph({ text: s.heading || s.title || '', heading: HeadingLevel.HEADING_1 }))
    for (const p of bodyToParagraphs(s.body)) children.push(p)
    for (const b of s.bullets || []) children.push(new Paragraph({ text: String(b), bullet: { level: 0 } }))
  }

  const table = buildTable(r.table)
  if (table) children.push(table)

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${r.title || '보고서'}.docx`)
  return true
}
