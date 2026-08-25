import { toast } from '../../../lib/toast.js'
import ImageStrip from './ImageStrip.jsx'

// 포트홀 감지 시험용 샘플 이미지 모음(Google Drive). 여기서 사진을 받아 '사진 추가'로 올려 감지한다.
const SAMPLE_DRIVE_URL =
  'https://drive.google.com/drive/folders/1RNlmg7Gdv1IUzkeqgZPF1dxo1Nmf8Qd2?usp=sharing'

// '이 폴더의 사진' — 썸네일 갤러리 + 사진/폴더 추가 + 전체 AI 라벨링. 바닐라 label-panel
// 하단부를 페이지 아래쪽 독립 섹션으로 재현(목업 순서: 캔버스 → 찾은 라벨 → 이 폴더의 사진).
export default function GalleryPanel({
  images,
  activeIdx,
  onSelect,
  onRemove,
  onRemoveAll,
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
        <a
          className="btn flat sample-link"
          href={SAMPLE_DRIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="포트홀 샘플 이미지 모음을 새 탭에서 엽니다 — 내려받아 '사진 추가'로 올리면 바로 감지할 수 있어요"
        >
          샘플 데이터셋 ↗
        </a>
        {hasUpload && (
          <button
            className="btn flat gallery-clear"
            type="button"
            onClick={onRemoveAll}
            title="올린 사진을 모두 삭제(샘플은 남습니다)"
          >
            🗑 전체 삭제
          </button>
        )}
      </div>
    </section>
  )
}
