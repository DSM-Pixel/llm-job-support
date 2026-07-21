import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/toast.js'
import { getProject } from '../../lib/storage.js'
import {
  allImages,
  putImage,
  updateBoxes,
  updateResult as updateResultDb,
  deleteImage,
} from '../../lib/imagedb.js'
import { labelsToBoxes, sameBox } from './labelingApi.js'

// 다중 이미지 모델 상태 훅 — 바닐라 labeling.js 의 images/activeIdx 흐름을 재현.
// 이미지 = {name, url, file, sample, savedBoxes:[], result:{html,confText,confClass}|null}
// 업로드 이미지는 IndexedDB(프로젝트별)에 원본 blob+박스를 저장해, 다른 메뉴 갔다 와도 복원한다.
const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|tiff?)$/i
const isImageFile = (f) => f.type.startsWith('image/') || IMG_EXT.test(f.name || '')

const clone = (arr) => arr.map((b) => ({ ...b }))

export function useLabeling(sampleName, sampleResult) {
  const projectRef = useRef((getProject() || {}).id || 'none')
  const project = projectRef.current

  const sampleImg = () => ({
    name: sampleName,
    url: '',
    file: null,
    sample: true,
    savedBoxes: [],
    result: sampleResult,
  })

  const [images, setImages] = useState(() => [sampleImg()])
  const [activeIdx, setActiveIdx] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  // 최신 images 를 콜백에서 안전히 읽기 위한 ref(전체 라벨링 등 비동기 배치용).
  const imagesRef = useRef(images)
  imagesRef.current = images

  const active = images[activeIdx] || images[0]

  // 진입 시 IndexedDB 에 저장된 업로드 이미지를 복원(원본 blob → objectURL + File 재생성).
  useEffect(() => {
    let alive = true
    ;(async () => {
      const rows = await allImages(project)
      if (!alive || !rows.length) return
      const restored = rows.map((r) => ({
        name: r.name,
        url: URL.createObjectURL(r.blob),
        file: new File([r.blob], r.name, { type: r.blob.type || 'image/*' }),
        sample: false,
        savedBoxes: Array.isArray(r.savedBoxes) ? r.savedBoxes : [],
        result: r.result || null,
      }))
      setImages(restored)
      setActiveIdx(0)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setActive = useCallback((i) => {
    setActiveIdx((prev) => {
      if (i < 0) return prev
      return i
    })
  }, [])

  // 활성 이미지의 저장 박스를 교체(persist) + IndexedDB 반영.
  const updateSaved = useCallback(
    (idx, boxes) => {
      const cloned = clone(boxes)
      setImages((prev) => prev.map((im, i) => (i === idx ? { ...im, savedBoxes: cloned } : im)))
      const im = imagesRef.current[idx]
      if (im && !im.sample) updateBoxes(project, im.name, cloned)
    },
    [project],
  )

  // 활성 이미지의 분석 결과 저장(+ IndexedDB 반영 → 복귀 후에도 분석 결과 유지).
  const updateResult = useCallback(
    (idx, result) => {
      setImages((prev) => prev.map((im, i) => (i === idx ? { ...im, result } : im)))
      const im = imagesRef.current[idx]
      if (im && !im.sample) updateResultDb(project, im.name, result)
    },
    [project],
  )

  // 폴더 배치 라벨링 결과(이름 매칭)를 캔버스 박스로 즉시 병합(이 페이지에 있을 때 표시용).
  // IndexedDB 저장은 항상 떠 있는 AiJobIndicator 가 단독으로 처리한다(자리 비워도 저장되게).
  const applyBatchBoxes = useCallback((items) => {
    setImages((prev) =>
      prev.map((image) => {
        const it = items.find((x) => x.name === image.name)
        if (!it || !it.labels?.length) return image
        const merged = image.savedBoxes.slice()
        labelsToBoxes(it).forEach((b) => {
          if (!merged.some((e) => sameBox(e, b))) merged.push(b)
        })
        return { ...image, savedBoxes: merged }
      }),
    )
  }, [])

  // 이미지 추가(다중 파일/폴더). 첫 실제 업로드면 샘플 placeholder는 치운다.
  // 추가에 성공하면 새 활성 인덱스를 반환(모달 열기 트리거용), 없으면 null.
  const addImages = useCallback(
    (files) => {
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
      // 원본을 IndexedDB 에 저장 → 페이지 이동/새로고침 후에도 유지.
      imgs.forEach((f) => putImage(project, f.name, f, []))
      setActiveIdx(newIdx)
      toast(`사진 ${imgs.length}장을 추가했습니다`)
      setModalOpen(true) // 사진을 추가하면 바로 큰 캔버스에서 라벨링 시작(단계 축소)
      return newIdx
    },
    [project],
  )

  // 이미지 제거. 모두 비면 샘플 placeholder로 복귀.
  const removeImage = useCallback(
    (i) => {
      const im = imagesRef.current[i]
      if (!im || im.sample) return
      if (im.url) URL.revokeObjectURL(im.url)
      deleteImage(project, im.name)
      setImages((prev) => {
        const next = prev.slice()
        next.splice(i, 1)
        if (!next.length) return [sampleImg()]
        return next
      })
      setActiveIdx((prev) => {
        const len = Math.max(1, imagesRef.current.length - 1)
        return Math.min(prev, len - 1)
      })
      toast('이미지를 제거했습니다')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, sampleName],
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
    applyBatchBoxes,
  }
}
