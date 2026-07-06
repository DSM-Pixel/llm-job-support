import { toast } from '../../../lib/toast.js'
import { downloadDocx } from '../reportDocx.js'

// 초기 로딩 상태 — 바닐라 report.html 의 .report-loading 마크업 그대로.
// 모듈 상수(참조 고정)로 두어 React 가 이후 명령형 innerHTML 조작을 덮어쓰지 않게 한다.
const LOADING_HTML = {
  __html:
    '<div class="report-loading"><span class="report-spinner" aria-hidden="true"></span>' +
    '<p>보고서를 생성하는 중입니다…</p><small>내 활동을 분석하고 있어요</small></div>',
}

// 미리보기 영역 — 복사/PDF/공유 툴바 + 편집 가능한 보고서 문서(article).
// 문서 본문은 useReportDoc 이 docRef 로 명령형 조작한다.
export default function ReportDocument({ docRef, readText, getReport }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(readText())
      toast('보고서 내용이 복사되었습니다')
    } catch {
      toast('복사를 지원하지 않는 브라우저입니다')
    }
  }

  const pdf = () => window.print()

  // 현재 보고서 데이터(마지막 응답)를 .docx 로 내려받는다.
  const docx = async () => {
    try {
      const ok = await downloadDocx(getReport?.())
      toast(ok ? 'DOCX 파일을 내려받았습니다' : '먼저 보고서를 생성해주세요')
    } catch {
      toast('DOCX 생성에 실패했습니다')
    }
  }

  const share = async () => {
    const title = docRef.current?.querySelector('h2')?.textContent.trim() || '보고서'
    const text = readText()
    try {
      if (navigator.share) {
        await navigator.share({ title, text })
        toast('공유를 완료했습니다')
        return
      }
      await navigator.clipboard.writeText(text)
      toast('공유 기능이 없어 보고서 내용을 복사했습니다')
    } catch {
      toast('공유를 취소했거나 지원하지 않습니다')
    }
  }

  return (
    <section className="preview-zone">
      <div className="preview-toolbar">
        <span>미리보기</span>
        <div>
          <button className="btn copy-report" type="button" onClick={copy}>
            복사
          </button>
          <button className="btn pdf-report" type="button" onClick={pdf}>
            PDF
          </button>
          <button className="btn docx-report" type="button" onClick={docx}>
            DOCX
          </button>
          <button className="btn primary share-report" type="button" onClick={share}>
            공유
          </button>
        </div>
      </div>
      <article className="report-page card" ref={docRef} dangerouslySetInnerHTML={LOADING_HTML} />
    </section>
  )
}
