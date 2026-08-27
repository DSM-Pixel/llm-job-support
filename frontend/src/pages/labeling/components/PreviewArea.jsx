import { useCallback, useEffect, useRef } from 'react'
import { escapeHtml } from '../labelingApi.js'

// 큰 캔버스 카드 — 목업 '라벨링 시작하기'의 메인 캔버스. 실제 박스 그리기/AI 탐지/편집은
// 클릭 시 여는 큰 모달(LabelingModal + CanvasStage)에서 하고, 여기서는 저장된 박스를
// 미리보기 위에 겹쳐 보여주는 역할만 한다(바닐라 road-preview 재현, 시각만 확대).
export default function PreviewArea({
  active,
  activeIdx,
  totalImages,
  onOpenModal,
  onEmptyClick,
  onRemoveActive,
  modelName,
  modelSuffix,
  onOpenSettings,
}) {
  const stageRef = useRef(null) // .road-preview
  const imgRef = useRef(null) // .preview-img
  const boxesRef = useRef(null) // .preview-boxes

  // 박스 오버레이를 '실제 렌더된 이미지 영역'(object-fit:contain 결과)에 맞춘다.
  // 큰 캔버스(CanvasStage.fitBoxes)와 동일한 방식 → 두 화면의 박스 위치가 일치한다.
  const fitBoxes = useCallback(() => {
    const stage = stageRef.current
    const img = imgRef.current
    const box = boxesRef.current
    if (!stage || !img || !box) return
    const cw = stage.clientWidth
    const ch = stage.clientHeight
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (!nw || !nh || !cw || !ch) return
    const scale = Math.min(cw / nw, ch / nh)
    const w = nw * scale
    const h = nh * scale
    box.style.left = `${(cw - w) / 2}px`
    box.style.top = `${(ch - h) / 2}px`
    box.style.width = `${w}px`
    box.style.height = `${h}px`
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(fitBoxes)
    const stage = stageRef.current
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fitBoxes()) : null
    if (ro && stage) ro.observe(stage)
    const onResize = () => fitBoxes()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(id)
      if (ro) ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [fitBoxes, active.url, active.savedBoxes])

  // 미리보기(큰 캔버스) 위 박스 오버레이 — 저장된 박스를 보여준다.
  const previewBoxesHtml = active.savedBoxes
    .map(
      (b) =>
        `<div class="pbox ${b.tone || ''}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%"><span>${escapeHtml(b.label)}</span></div>`,
    )
    .join('')

  return (
    <div
      className={'road-preview' + (active.url ? ' has-image' : '')}
      title="클릭하면 크게 열어 라벨링합니다"
      role="button"
      ref={stageRef}
      onClick={() => (active.url ? onOpenModal() : onEmptyClick())}
    >
      <img
        className="preview-img"
        alt="분석 대상 이미지"
        hidden={!active.url}
        ref={imgRef}
        onLoad={fitBoxes}
        {...(active.url ? { src: active.url } : {})}
      />
      <div
        className="preview-boxes"
        ref={boxesRef}
        dangerouslySetInnerHTML={{ __html: previewBoxesHtml }}
      />

      {!active.url && (
        <div className="preview-empty">
          <span className="preview-empty-ic">🖼</span>
          도로 파손 사진을 끌어다 놓으세요
        </div>
      )}

      <div className="preview-file-badge">
        <span className="sample-name">{active.name}</span>
        <span className="preview-file-pos">
          {activeIdx + 1} / {totalImages}
        </span>
      </div>

      <div className="preview-toolbar" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => (active.url ? onOpenModal() : onEmptyClick())}
        >
          ▷ 선택
        </button>
        <button
          type="button"
          className="toolbar-btn active open-label-modal"
          onClick={() => (active.url ? onOpenModal() : onEmptyClick())}
        >
          ⊡ 박스 추가
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => (active.url ? onOpenModal() : onEmptyClick())}
        >
          ⊘ 마스킹
        </button>
        <span
          className="model-chip"
          data-model="vision"
          role="button"
          title="AI 모델 — 클릭해 설정에서 변경"
          onClick={onOpenSettings}
        >
          ⚙ <b className="model-chip-name">{modelName}</b>
          {modelSuffix}
        </span>
        {!active.sample && active.url && (
          <button
            type="button"
            className="toolbar-btn preview-del"
            title="이 사진 제거"
            aria-label="이 사진 제거"
            onClick={onRemoveActive}
          >
            ⌫ 삭제
          </button>
        )}
      </div>
    </div>
  )
}
