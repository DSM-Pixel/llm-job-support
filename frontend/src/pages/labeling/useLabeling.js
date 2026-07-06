import { useCallback, useRef, useState } from 'react'
import { toast } from '../../lib/toast.js'

// 다중 이미지 모델 상태 훅 — 바닐라 labeling.js 의 images/activeIdx 흐름을 재현.
// 이미지 = {name, url, file, sample, savedBoxes:[], result:{html,confText,confClass}|null}
const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|tiff?)$/i
const isImageFile = (f) => f.type.startsWith('image/') || IMG_EXT.test(f.name || '')

const clone = (arr) => arr.map((b) => ({ ...b }))

export function useLabeling(sampleName, sampleResult) {
  const [images, setImages] = useState(() => [
    { name: sampleName, url: '', file: null, sample: true, savedBoxes: [], result: sampleResult },
  ])
  const [activeIdx, setActiveIdx] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  // 최신 images 를 콜백에서 안전히 읽기 위한 ref(전체 라벨링 등 비동기 배치용).
  const imagesRef = useRef(images)
  imagesRef.current = images

  const active = images[activeIdx] || images[0]

  const setActive = useCallback((i) => {
    setActiveIdx((prev) => {
      if (i < 0) return prev
      return i
    })
  }, [])

  // 활성 이미지의 저장 박스를 교체(persist).
  const updateSaved = useCallback((idx, boxes) => {
    setImages((prev) => prev.map((im, i) => (i === idx ? { ...im, savedBoxes: clone(boxes) } : im)))
  }, [])

  // 활성 이미지의 분석 결과 저장.
  const updateResult = useCallback((idx, result) => {
    setImages((prev) => prev.map((im, i) => (i === idx ? { ...im, result } : im)))
  }, [])

  // 이미지 추가(다중 파일/폴더). 첫 실제 업로드면 샘플 placeholder는 치운다.
  // 추가에 성공하면 새 활성 인덱스를 반환(모달 열기 트리거용), 없으면 null.
  const addImages = useCallback((files) => {
    const imgs = [...files].filter(isImageFile)
    if (!imgs.length) {
      toast('이미지 파일이 없습니다 (선택한 폴더에 사진이 없어요)')
      return null
    }
    let newIdx = 0
    setImages((prev) => {
      let base = prev
      if (prev.length === 1 && prev[0].sample) base = []
      const added = imgs.map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        file: f,
        sample: false,
        savedBoxes: [],
        result: null,
      }))
      const next = [...base, ...added]
      newIdx = next.length - 1
      return next
    })
    setActiveIdx(newIdx)
    toast(`사진 ${imgs.length}장을 추가했습니다`)
    setModalOpen(true) // 사진을 추가하면 바로 큰 캔버스에서 라벨링 시작(단계 축소)
    return newIdx
  }, [])

  // 이미지 제거. 모두 비면 샘플 placeholder로 복귀.
  const removeImage = useCallback(
    (i) => {
      const im = imagesRef.current[i]
      if (!im || im.sample) return
      if (im.url) URL.revokeObjectURL(im.url)
      setImages((prev) => {
        const next = prev.slice()
        next.splice(i, 1)
        if (!next.length) {
          return [
            { name: sampleName, url: '', file: null, sample: true, savedBoxes: [], result: null },
          ]
        }
        return next
      })
      setActiveIdx((prev) => {
        const len = Math.max(1, imagesRef.current.length - 1)
        return Math.min(prev, len - 1)
      })
      toast('이미지를 제거했습니다')
    },
    [sampleName],
  )

  return {
    images,
    setImages,
    imagesRef,
    activeIdx,
    setActive,
    active,
    modalOpen,
    setModalOpen,
    addImages,
    removeImage,
    updateSaved,
    updateResult,
  }
}
