import { useRef, useState } from 'react'
import { toast } from '../../../lib/toast.js'
import { genFromTemplate } from '../reportApi.js'

// 양식 파일 업로드 → AI가 양식 구조를 분석해 채운 보고서 생성.
// 응답은 /api/report/web 과 동일 스키마라, onRender(renderReport)로 기존 렌더 경로를 그대로 재사용한다.
export default function TemplateUpload({ period, includeChart, onRender }) {
  const fileInput = useRef(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const result = await genFromTemplate(file, period, includeChart)
      onRender(result) // 일반 생성과 동일한 렌더 경로로 미리보기에 그린다
      toast('양식을 분석해 보고서를 채웠습니다 (본문 수정 가능)')
    } catch {
      toast('양식 분석에 실패했습니다')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = '' // 같은 파일 다시 선택 가능
    }
  }

  return (
    <div className="template-upload">
      <h3>양식 업로드로 채우기</h3>
      <button
        className={'btn wide' + (busy ? ' is-loading' : '')}
        type="button"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      >
        {busy ? '양식 분석 중…' : '⇪ 양식 파일 선택'}
      </button>
      <input
        type="file"
        hidden
        ref={fileInput}
        accept=".pdf,.docx,.hwp,.hwpx,.txt,.md,image/*"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <p className="report-hint">
        PDF·이미지·docx·hwp·hwpx·txt 지원. AI가 양식 구조를 분석해 채웁니다.
      </p>
    </div>
  )
}
