import { useRef } from 'react'
import { toast } from '../../../lib/toast.js'
import { escapeHtml } from '../labelingApi.js'
import ImageStrip from './ImageStrip.jsx'

// 왼쪽 패널의 미리보기 + 갤러리 + 업로드 영역 — 바닐라 label-panel 상단부 재현.
export default function PreviewArea({
  images,
  activeIdx,
  active,
  onSelect,
  onRemove,
  onAddImages,
  onBatch,
  onOpenModal,
  batchBusy,
}) {
  const fileRef = useRef(null)
  const folderRef = useRef(null)
  const hasUpload = images.some((im) => im.file)

  // 미리보기(작은 썸네일) 위 박스 오버레이 — 저장된 박스를 보여준다.
  const previewBoxesHtml = active.savedBoxes
    .map(
      (b) =>
        `<div class="pbox ${b.tone || ''}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%"><span>${escapeHtml(b.label)}</span></div>`,
    )
    .join('')

  return (
    <>
      <div
        className={'road-preview' + (active.url ? ' has-image' : '')}
        title="클릭하면 크게 열어 라벨링합니다"
        role="button"
        onClick={() => (active.url ? onOpenModal() : fileRef.current?.click())}
      >
        <img
          className="preview-img"
          alt="분석 대상 이미지"
          hidden={!active.url}
          {...(active.url ? { src: active.url } : {})}
        />
        <div className="road"></div>
        <span className="lane"></span>
        <div className="preview-boxes" dangerouslySetInnerHTML={{ __html: previewBoxesHtml }} />
      </div>
      <p className="sample">
        현재: <span className="sample-name">{active.name}</span>{' '}
        <span className="image-count">이미지 {images.length}개</span>
      </p>
      <div className="image-actions">
        <button className="btn flat add-images" type="button" onClick={() => fileRef.current?.click()}>
          ＋ 사진 추가
        </button>
        <button
          className="btn flat add-folder"
          type="button"
          onClick={() => folderRef.current?.click()}
        >
          폴더 선택
        </button>
      </div>
      <input
        type="file"
        className="image-input"
        accept="image/*"
        multiple
        hidden
        ref={fileRef}
        onChange={() => {
          if (fileRef.current.files?.length) onAddImages(fileRef.current.files)
          fileRef.current.value = ''
        }}
      />
      <input
        type="file"
        className="folder-input"
        accept="image/*"
        webkitdirectory=""
        hidden
        ref={folderRef}
        onChange={() => {
          if (folderRef.current.files?.length) onAddImages(folderRef.current.files)
          folderRef.current.value = ''
        }}
      />
      <ImageStrip images={images} activeIdx={activeIdx} onSelect={onSelect} onRemove={onRemove} />
      {hasUpload && (
        <button
          className={'btn primary wide batch-label' + (batchBusy ? ' is-loading' : '')}
          type="button"
          disabled={batchBusy}
          onClick={() => {
            const targets = images.filter((im) => im.file)
            if (!targets.length) return toast('폴더로 사진을 먼저 추가하세요')
            onBatch()
          }}
        >
          {batchBusy || '전체 AI 라벨링'}
        </button>
      )}
      <button className="btn flat wide open-label-modal" type="button" onClick={onOpenModal}>
        ⛶ 크게 열어 라벨링
      </button>
      <hr className="panel-sep" />
    </>
  )
}
