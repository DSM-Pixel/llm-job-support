import { useRef } from 'react'
import ArtifactPicker from './ArtifactPicker.jsx'
import TemplateUpload from './TemplateUpload.jsx'

// '자동 자료' 패널 — 내 작업에서 가져오기 + 사진 직접 첨부 + 양식 삽입 + 통계 차트 포함 여부.
// 보고서 유형·기간·초안 생성 버튼은 ReportHero 로 옮겨갔다(같은 상태를 그대로 받아 쓴다).
export default function ReportControls({
  artifacts,
  onAddArtifact,
  onOpenArtifact,
  reportItems,
  onAddImages,
  onRemoveThumb,
  chartOff,
  onToggleChart,
  period,
  includeChart,
  onTemplateRender,
}) {
  const imgInput = useRef(null)

  return (
    <aside className="card rp-materials">
      <div className="rp-materials-head">
        <h3>자동 자료</h3>
        <TemplateUpload period={period} includeChart={includeChart} onRender={onTemplateRender} />
      </div>
      <p className="report-hint">
        분석·라벨한 이미지와 RAG로 도출한 결과를 보고서에 넣거나, 사진을 직접 첨부할 수 있습니다.
      </p>
      <ArtifactPicker artifacts={artifacts} onAdd={onAddArtifact} onOpen={onOpenArtifact} />

      <button
        className="btn add-report-image"
        type="button"
        onClick={() => imgInput.current?.click()}
      >
        ＋ 사진 추가
      </button>
      <input
        type="file"
        className="report-image-input"
        accept="image/*"
        multiple
        hidden
        ref={imgInput}
        onChange={() => {
          onAddImages([...(imgInput.current.files || [])])
          imgInput.current.value = '' // 같은 파일 다시 선택 가능
        }}
      />
      <div className="report-thumbs">
        {reportItems.map((it, i) =>
          it.type === 'image' ? (
            <div className="report-thumb" key={i}>
              <img src={it.src} alt={`첨부 ${i + 1}`} />
              <button
                type="button"
                className="thumb-del"
                data-i={i}
                aria-label="삭제"
                onClick={() => onRemoveThumb(i)}
              >
                ✕
              </button>
            </div>
          ) : null,
        )}
      </div>

      <div className={'source-toggle chart-toggle' + (chartOff ? ' is-off' : '')}>
        <b>통계 차트 포함</b>
        <span className={'switch' + (chartOff ? ' off' : '')} onClick={onToggleChart}></span>
      </div>
    </aside>
  )
}
