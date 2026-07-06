import { useRef } from 'react'
import ArtifactPicker from './ArtifactPicker.jsx'
import { TYPES } from '../reportTypes.js'

// 왼쪽 '보고서 구성' 패널 — 유형·기간·차트 토글·자료 첨부·생성 버튼.
export default function ReportControls({
  activeIndex,
  onSelectType,
  start,
  end,
  onStart,
  onEnd,
  chartOff,
  onToggleChart,
  artifacts,
  onAddArtifact,
  onOpenArtifact,
  reportItems,
  onAddImages,
  onRemoveThumb,
  onGenerate,
  busy,
}) {
  const imgInput = useRef(null)
  const stagedCount = reportItems.length

  return (
    <aside className="report-form">
      <h2>◫ 보고서 구성</h2>
      <p className="report-hint">
        내가 웹에서 한 활동(질의·검색·이미지 분석·라벨·업로드)을 분석·통계 내어 보고서를 만듭니다.
      </p>
      <h3>보고서 유형</h3>
      <div className="select-list">
        {TYPES.map((t, i) => (
          <button
            key={t}
            className={i === activeIndex ? 'active' : undefined}
            type="button"
            onClick={() => onSelectType(i)}
          >
            {i === 0 && <i className="chart-icon" aria-hidden="true"></i>}
            {t}
          </button>
        ))}
      </div>
      <h3>기간</h3>
      <div className="date-range">
        <label className="date-field">
          <span>시작일</span>
          <input
            type="date"
            className="date-start"
            value={start}
            onChange={(e) => onStart(e.target.value)}
          />
        </label>
        <label className="date-field">
          <span>종료일</span>
          <input
            type="date"
            className="date-end"
            value={end}
            onChange={(e) => onEnd(e.target.value)}
          />
        </label>
      </div>
      <div className={'source-toggle chart-toggle' + (chartOff ? ' is-off' : '')}>
        <b>통계 차트 포함</b>
        <span className={'switch' + (chartOff ? ' off' : '')} onClick={onToggleChart}></span>
      </div>
      <h3>내 작업에서 가져오기</h3>
      <p className="report-hint">
        분석·라벨한 이미지와 RAG로 도출한 결과를 보고서에 넣을 수 있습니다.
      </p>
      <ArtifactPicker artifacts={artifacts} onAdd={onAddArtifact} onOpen={onOpenArtifact} />
      <h3>직접 사진 첨부</h3>
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
      <p className="staged-note" hidden={stagedCount === 0}>
        {stagedCount
          ? `추가 예정 자료 ${stagedCount}건 — ‘보고서 생성’을 누르면 본문에 반영됩니다`
          : ''}
      </p>
      <button
        className={'btn primary wide' + (busy.active ? ' is-loading' : '')}
        type="button"
        disabled={busy.active}
        onClick={onGenerate}
      >
        {busy.active ? busy.text : '✣ 보고서 생성'}
      </button>
    </aside>
  )
}
