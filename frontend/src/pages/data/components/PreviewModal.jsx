import { createPortal } from 'react-dom'
import { ICONS } from '../dataApi.js'

// 데이터셋 미리보기 모달 — 실제 파일(업로드·내 작업물)이 있으면 사진, 없으면 안내.
// 필드 값은 바닐라가 표 셀 innerText 에서 읽던 것과 동일하게 구성(이름 앞 아이콘 포함).
export default function PreviewModal({ row, onClose }) {
  const icon = ICONS[row.kind] || '▱'
  const name = `${icon}${row.name}`
  const fields = {
    이름: name,
    유형: row.kind,
    '항목 수': row.count,
    형식: row.fmt,
    '검수 상태': row.state,
    업데이트: row.owner ? `${row.date}\n${row.owner}` : row.date,
  }
  const realImg = row.img || ''
  const fmt = String(row.fmt).toUpperCase()
  const isImage =
    row.kind === '원본' || row.kind === '라벨' || /JPG|JPEG|PNG|BMP|MP4|프레임|COCO/.test(fmt)

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <header className="modal-head">
          <h3>데이터셋 미리보기</h3>
          <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body">
          <div className="modal-form preview-body">
            {realImg ? (
              <>
                <div className="preview-frames one">
                  <img className="preview-frame" src={realImg} alt={name} />
                </div>
                <p className="preview-note">실제 파일 미리보기</p>
              </>
            ) : isImage ? (
              <p className="preview-note no-file">
                개별 파일 미리보기는 직접 업로드했거나 내가 분석·라벨한 이미지에만 표시됩니다.
                <br />
                (이 항목은 대용량·외부 연계 데이터셋이라 개별 파일이 없습니다)
              </p>
            ) : null}
            {Object.entries(fields).map(([k, v]) => (
              <div className="field row" key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
