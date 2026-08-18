import { toast } from '../../../lib/toast.js'
import ImageStrip from './ImageStrip.jsx'

// '이 폴더의 사진' — 썸네일 갤러리 + 사진/폴더 추가 + 전체 AI 라벨링. 바닐라 label-panel
// 하단부를 페이지 아래쪽 독립 섹션으로 재현(목업 순서: 캔버스 → 찾은 라벨 → 이 폴더의 사진).
export default function GalleryPanel({
  images,
  activeIdx,
  onSelect,
  onRemove,
  fileRef,
  folderRef,
  onBatch,
  batchBusy,
  hasUpload,
}) {
  return (
    <section className="gallery-panel">
      <div className="px-section-head">
        <h3>
          이 폴더의 사진 <span className="count">{images.length}장</span>
        </h3>
        {hasUpload && (
          <button
            className={'px-section-aside batch-label' + (batchBusy ? ' is-loading' : '')}
            type="button"
            disabled={!!batchBusy}
            onClick={() => {
              const targets = images.filter((im) => im.file)
              if (!targets.length) return toast('폴더로 사진을 먼저 추가하세요')
              onBatch()
            }}
          >
            {batchBusy || '전체 라벨링 →'}
          </button>
        )}
      </div>

      <ImageStrip images={images} activeIdx={activeIdx} onSelect={onSelect} onRemove={onRemove} />

      <div className="gallery-actions">
        <button className="btn flat" type="button" onClick={() => fileRef.current?.click()}>
          ＋ 사진 추가
        </button>
        <button className="btn flat" type="button" onClick={() => folderRef.current?.click()}>
          폴더 선택
        </button>
      </div>
    </section>
  )
}
