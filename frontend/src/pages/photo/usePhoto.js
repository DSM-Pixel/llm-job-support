import { useCallback, useRef, useState } from 'react'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'
import { MODES, analyzePhoto } from './photoApi.js'

// 목업용 4장 슬롯 이름 — 사진을 끌어다 놓거나 골라서 채우기 전까지는 자리표시자로만 존재.
const SAMPLE_NAMES = ['IMG_0421.jpg', 'IMG_0422.jpg', 'IMG_0430.jpg', 'IMG_0431.jpg']
const makeSlot = (name) => ({ name, file: null, url: null })

// 사진 분석(VLM) 페이지 상태 훅 — 모드/프롬프트/사진 슬롯/분석 결과를 한데 묶는다.
export function usePhoto() {
  const [photos, setPhotos] = useState(() => SAMPLE_NAMES.map(makeSlot))
  const [activeIdx, setActiveIdx] = useState(0)
  const [modeIdx, setModeIdx] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const uploadTarget = useRef(0)

  const active = photos[activeIdx] || photos[0]
  const mode = MODES[modeIdx]

  const selectPhoto = useCallback((i) => {
    setActiveIdx(i)
    setResult(null) // 사진을 바꾸면 이전 결과는 지운다(다른 사진 결과가 남아 헷갈리지 않도록).
  }, [])

  // 슬롯에 실제 파일을 채운다(드롭존 또는 빈 썸네일 클릭 업로드 공용).
  const setPhotoFile = useCallback((idx, file) => {
    setPhotos((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p
        if (p.url) URL.revokeObjectURL(p.url)
        return { ...p, file, url: URL.createObjectURL(file) }
      }),
    )
    setResult(null)
  }, [])

  // 업로드 대상 인덱스를 기억해 두고 숨은 input 을 연다 — 드롭존은 활성 사진, 썸네일은 그 사진.
  const requestUpload = useCallback((idx, fileInputRef) => {
    uploadTarget.current = idx
    fileInputRef.current?.click()
  }, [])

  const onFileChosen = useCallback(
    (file) => {
      if (file && file.type.startsWith('image/')) setPhotoFile(uploadTarget.current, file)
    },
    [setPhotoFile],
  )

  const analyze = useCallback(async () => {
    setBusy(true)
    try {
      const data = await analyzePhoto(active, mode.preset, prompt.trim())
      setResult(data)
      toast(
        data.isAi
          ? '사진을 분석했습니다'
          : active.file
            ? '분석 결과(MOCK)'
            : '사진을 추가하면 실제 분석합니다 (지금은 예시)',
      )
      logActivity('사진 분석', mode.title)
    } catch {
      toast('분석에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }, [active, mode, prompt])

  return {
    photos,
    activeIdx,
    active,
    selectPhoto,
    setPhotoFile,
    requestUpload,
    onFileChosen,
    modeIdx,
    setModeIdx,
    mode,
    prompt,
    setPrompt,
    busy,
    result,
    analyze,
  }
}
