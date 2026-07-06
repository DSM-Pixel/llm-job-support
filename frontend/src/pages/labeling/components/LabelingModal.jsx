import { useModalEditor } from '../useModalEditor.js'
import CanvasStage from './CanvasStage.jsx'
import LabelSide from './LabelSide.jsx'

// 라벨링 모달 — 큰 이미지 위에서 박스 그리기/편집/삭제/탐지/저장. 바닐라 #label-modal 재현.
// 편집 상태·핸들러는 useModalEditor 훅에, 이 컴포넌트는 마크업 조합만.
export default function LabelingModal(props) {
  const { open, images, activeIdx, active } = props
  const m = useModalEditor(props)
  const multi = images.length > 1

  return (
    <div
      className="modal-overlay"
      id="label-modal"
      hidden={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) m.closeModal()
      }}
    >
      <div className="modal label-modal" role="dialog" aria-modal="true" aria-label="라벨 편집">
        <header className="modal-head">
          <h3>
            라벨 편집 — <span className="modal-imgname">{active.name}</span>
          </h3>
          <div className="modal-nav" hidden={!multi}>
            <button
              className="btn flat modal-prev"
              type="button"
              aria-label="이전 사진"
              disabled={activeIdx === 0}
              onClick={() => m.switchInModal(-1)}
            >
              ‹ 이전
            </button>
            <span className="modal-pos">
              {activeIdx + 1} / {images.length}
            </span>
            <button
              className="btn flat modal-next"
              type="button"
              aria-label="다음 사진"
              disabled={activeIdx === images.length - 1}
              onClick={() => m.switchInModal(1)}
            >
              다음 ›
            </button>
          </div>
          <button className="modal-close" type="button" aria-label="닫기" onClick={m.closeModal}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <CanvasStage
            open={open}
            imageUrl={active.url}
            imgRef={m.canvasImgRef}
            boxes={m.boxes}
            selected={m.selected}
            onSelect={m.setSelected}
            onDrawBox={m.onDrawBox}
          />
          <LabelSide
            classInput={m.classInput}
            onClassInput={m.setClassInput}
            onDetect={m.onDetect}
            onDetectAll={m.onDetectAll}
            onClear={m.onClear}
            detectBusy={m.detectBusy}
            detectAllBusy={m.detectAllBusy}
            filter={{
              visible: m.filter.visible,
              isMock: m.filter.isMock,
              pendingBoxes: m.filter.pendingBoxes,
              key: m.filter.key,
              onCancel: m.onFilterCancel,
              onApply: m.onFilterApply,
            }}
            boxes={m.boxes}
            selected={m.selected}
            onSelectBox={m.setSelected}
            onLabelChange={m.onLabelChange}
            onDeleteBox={m.onDeleteBox}
            onExportImg={m.onExportImg}
            onExportCoco={m.onExportCoco}
            onExportYolo={m.onExportYolo}
            onSave={m.onSave}
            exportImgBusy={m.exportImgBusy}
            saveBusy={m.saveBusy}
          />
        </div>
        <div className="confirm-save" hidden={!m.confirmVisible}>
          <div className="confirm-box">
            <p>저장하지 않은 변경사항이 있습니다. 저장할까요?</p>
            <div className="confirm-actions">
              <button className="btn confirm-discard" type="button" onClick={m.onConfirmDiscard}>
                저장 안 함
              </button>
              <button
                className="btn confirm-cancel"
                type="button"
                onClick={() => m.setConfirmVisible(false)}
              >
                취소
              </button>
              <button
                className="btn primary confirm-save-btn"
                type="button"
                onClick={m.onConfirmSave}
              >
                저장하고 닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
