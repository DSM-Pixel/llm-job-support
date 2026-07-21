import { toast } from '../../../lib/toast.js'
import { downloadDocx } from '../../../lib/reportDocx.js'

// 초기 상태 — 생성 전에는 로딩 스피너 대신 '보고서를 생성하세요' 안내를 보여준다.
// 모듈 상수(참조 고정)로 두어 React 가 이후 명령형 innerHTML 조작을 덮어쓰지 않게 한다.
const GUIDE_HTML = {
  __html:
    '<div class="report-empty"><p>아직 생성된 보고서가 없습니다.</p>' +
    '<p>왼쪽에서 기간·유형을 정하고 ‘✣ 보고서 생성’을 눌러주세요.</p></div>',
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
      <article className="report-page card" ref={docRef} dangerouslySetInnerHTML={GUIDE_HTML} />
    </section>
  )
}
