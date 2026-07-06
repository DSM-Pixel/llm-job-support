import ClassFilter from './ClassFilter.jsx'

// 모달 오른쪽 사이드바 — 클래스 입력·탐지·필터·박스 목록·내보내기. 바닐라 label-side 재현.
export default function LabelSide({
  classInput,
  onClassInput,
  onDetect,
  onDetectAll,
  onClear,
  detectBusy,
  detectAllBusy,
  filter,
  boxes,
  selected,
  onSelectBox,
  onLabelChange,
  onDeleteBox,
  onExportImg,
  onExportCoco,
  onExportYolo,
  onSave,
  exportImgBusy,
  saveBusy,
}) {
  return (
    <aside className="label-side">
      <label className="field">
        새 박스 클래스명
        <input
          className="modal-class"
          value={classInput}
          onChange={(e) => onClassInput(e.target.value)}
        />
      </label>
      <div className="modal-actions">
        <button
          className={'btn primary modal-detect' + (detectBusy ? ' is-loading' : '')}
          type="button"
          disabled={detectBusy}
          title="도로 파손 특화 모델(YOLO)로 포트홀·균열을 탐지"
          onClick={onDetect}
        >
          {detectBusy ? '탐지 중' : '✣ 파손 자동 탐지'}
        </button>
        <button
          className={'btn modal-detect-all' + (detectAllBusy ? ' is-loading' : '')}
          type="button"
          disabled={detectAllBusy}
          title="차량·보행자·표지판 등 이미지 속 모든 객체를 탐지해 원하는 것만 골라 라벨링"
          onClick={onDetectAll}
        >
          {detectAllBusy ? '탐지 중' : '◎ 전체 객체 탐지'}
        </button>
        <button className="btn modal-clear" type="button" onClick={onClear}>
          전체 지우기
        </button>
      </div>
      {filter.visible && (
        <ClassFilter
          key={filter.key}
          pendingBoxes={filter.pendingBoxes}
          isMock={filter.isMock}
          onCancel={filter.onCancel}
          onApply={filter.onApply}
        />
      )}
      <h4>
        박스 목록 <span className="box-total">{boxes.length}</span>개
      </h4>
      <ul className="box-list">
        {boxes.map((b, i) => (
          <li
            key={i}
            className={i === selected ? 'selected' : ''}
            data-i={i}
            onClick={() => onSelectBox(i)}
          >
            <input value={b.label} onChange={(e) => onLabelChange(i, e.target.value)} />
            <span className="conf">{b.confidence != null ? `${b.confidence}%` : '—'}</span>
            <button
              className="del"
              type="button"
              aria-label="삭제"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteBox(i)
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p className="modal-hint">
        이미지 위를 <b>드래그</b>해 박스를 그립니다. 목록의 ✕로 개별 삭제, 클래스명은 바로 수정.{' '}
        <b>저장</b>하면 박스가 미리보기에 유지됩니다.
      </p>
      <div className="modal-export">
        <button
          className={'btn modal-export-img' + (exportImgBusy ? ' is-loading' : '')}
          type="button"
          disabled={exportImgBusy}
          title="라벨 박스가 그려진 이미지 내려받기"
          onClick={onExportImg}
        >
          {exportImgBusy ? '생성 중' : '라벨 이미지 다운로드'}
        </button>
        <button
          className="btn modal-export-coco"
          type="button"
          title="COCO JSON 형식으로 라벨 파일 내려받기"
          onClick={onExportCoco}
        >
          COCO 내보내기
        </button>
        <button
          className="btn modal-export-yolo"
          type="button"
          title="YOLO txt 형식으로 라벨 파일 내려받기"
          onClick={onExportYolo}
        >
          YOLO 내보내기
        </button>
        <button
          className={'btn primary modal-save' + (saveBusy ? ' is-loading' : '')}
          type="button"
          disabled={saveBusy}
          title="현재 박스를 라벨 데이터셋으로 저장하고 미리보기에 반영"
          onClick={onSave}
        >
          {saveBusy ? '저장 중' : '라벨 데이터셋에 저장'}
        </button>
      </div>
    </aside>
  )
}
