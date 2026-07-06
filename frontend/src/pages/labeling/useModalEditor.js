import { useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/toast.js'
import { logActivity, saveArtifact } from '../../lib/activity.js'
import {
  baseName,
  buildCoco,
  buildYoloLines,
  detectImage,
  detectObjects,
  download,
  labelsToBoxes,
  makeLabeledThumb,
  sameBox,
  saveLabels as saveLabelsApi,
} from './labelingApi.js'

const clone = (arr) => arr.map((b) => ({ ...b }))

// 저장본과 다른 순서로 중복 없이 병합 — added/dup 카운트 반환.
const mergeUnique = (base, incoming) => {
  const merged = base.slice()
  let added = 0
  let dup = 0
  incoming.forEach((b) => {
    if (merged.some((e) => sameBox(e, b))) dup += 1
    else {
      merged.push(b)
      added += 1
    }
  })
  return { merged, added, dup }
}

// 라벨링 모달의 편집 상태 + 핸들러 — 바닐라 labeling.js 모달 로직을 캡슐화.
export function useModalEditor({
  open,
  images,
  activeIdx,
  active,
  onSwitchActive,
  updateSaved,
  onClose,
  defaultClass,
}) {
  const [boxes, setBoxes] = useState([])
  const [selected, setSelected] = useState(-1)
  const [classInput, setClassInput] = useState('포트홀')
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [filter, setFilter] = useState({ visible: false, isMock: false, pendingBoxes: [], key: 0 })
  const [detectBusy, setDetectBusy] = useState(false)
  const [detectAllBusy, setDetectAllBusy] = useState(false)
  const [exportImgBusy, setExportImgBusy] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)

  const canvasImgRef = useRef(null)
  const activeRef = useRef(active)
  activeRef.current = active

  // 모달을 열 때 저장된 박스를 이어서 편집(바닐라 openModal).
  useEffect(() => {
    if (!open) return
    if (defaultClass) setClassInput(defaultClass)
    setBoxes(clone(activeRef.current.savedBoxes))
    setSelected(-1)
    setConfirmVisible(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const persist = () => updateSaved(activeIdx, boxes)
  const isDirty = () => JSON.stringify(boxes) !== JSON.stringify(active.savedBoxes)

  // 현재 박스를 활성 이미지에 보관하고 이웃 사진으로 전환.
  const switchInModal = (dir) => {
    const next = activeIdx + dir
    if (next < 0 || next >= images.length) return
    persist()
    onSwitchActive(next)
    setBoxes(clone(images[next].savedBoxes))
    setSelected(-1)
  }

  const closeModal = () => {
    if (isDirty()) return setConfirmVisible(true)
    onClose()
  }

  // 최신 핸들러를 키보드 리스너에서 안전히 참조.
  const fnRef = useRef({})
  fnRef.current = { switchInModal, closeModal }
  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') return fnRef.current.closeModal()
      const typing = /^(INPUT|TEXTAREA)$/.test(event.target.tagName)
      if (!typing && event.key === 'ArrowLeft') fnRef.current.switchInModal(-1)
      if (!typing && event.key === 'ArrowRight') fnRef.current.switchInModal(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // ── 박스 편집 ──
  const onDrawBox = (rect) => {
    const label = (classInput || 'object').trim() || 'object'
    setBoxes((prev) => {
      const next = [...prev, { ...rect, label, confidence: null }]
      setSelected(next.length - 1)
      return next
    })
  }
  const onLabelChange = (i, value) =>
    setBoxes((prev) => prev.map((b, j) => (j === i ? { ...b, label: value } : b)))
  const onDeleteBox = (i) => {
    setBoxes((prev) => prev.filter((_, j) => j !== i))
    setSelected((s) => (s === i ? -1 : s))
    toast('박스를 삭제했습니다')
  }
  const onClear = () => {
    setBoxes([])
    setSelected(-1)
    toast('박스를 모두 지웠습니다')
  }

  // ── AI 파손 자동 탐지 ──
  const onDetect = async () => {
    if (!active.url) return toast('사진을 먼저 추가하세요')
    setDetectBusy(true)
    try {
      const result = await detectImage(active.file, active.name)
      const { merged, added, dup } = mergeUnique(boxes, labelsToBoxes(result))
      setBoxes(merged)
      const engine = result.backend === 'YOLO' ? 'YOLO' : 'MOCK'
      toast(
        added
          ? `${engine} 탐지: ${added}건 추가${dup ? `, 중복 ${dup}건 제외` : ''}`
          : dup
            ? '이미 추가된 박스입니다(중복 제외)'
            : '탐지된 객체가 없습니다',
      )
    } catch {
      toast('탐지에 실패했습니다')
    } finally {
      setDetectBusy(false)
    }
  }

  // ── 전체 객체 탐지 → 클래스 필터 ──
  const onDetectAll = async () => {
    setDetectAllBusy(true)
    try {
      const result = await detectObjects(active.file)
      const pending = labelsToBoxes(result)
      if (!pending.length) {
        setFilter((f) => ({ ...f, visible: false }))
        return toast('탐지된 객체가 없습니다')
      }
      const isMock = result.backend === 'MOCK'
      setFilter((f) => ({ visible: true, isMock, pendingBoxes: pending, key: f.key + 1 }))
      const engine =
        result.backend === 'YOLO'
          ? 'YOLO 로컬'
          : result.backend === 'OPENAI'
            ? 'GPT'
            : result.backend === 'GEMINI'
              ? 'Gemini'
              : '예시(MOCK)'
      toast(`${engine} 탐지 ${pending.length}개 — 추가할 클래스를 고르세요`)
    } catch {
      toast('전체 객체 탐지에 실패했습니다')
    } finally {
      setDetectAllBusy(false)
    }
  }
  const onFilterCancel = () => setFilter((f) => ({ ...f, visible: false, pendingBoxes: [] }))
  const onFilterApply = (picked) => {
    const set = new Set(picked)
    const { merged, added, dup } = mergeUnique(
      boxes,
      filter.pendingBoxes.filter((b) => set.has(b.label)),
    )
    setBoxes(merged)
    setFilter((f) => ({ ...f, visible: false, pendingBoxes: [] }))
    logActivity('전체 객체 탐지', `${picked.join(', ')} · ${added}건`)
    toast(
      added
        ? `선택 객체 ${added}건 라벨 추가${dup ? ` (중복 ${dup}건 제외)` : ''}`
        : '이미 추가된 박스입니다(중복 제외)',
    )
  }

  // ── 내보내기 ──
  const imgSize = () => ({
    w: canvasImgRef.current?.naturalWidth || 1000,
    h: canvasImgRef.current?.naturalHeight || 1000,
  })
  const onExportCoco = () => {
    if (!boxes.length) return toast('내보낼 박스가 없습니다')
    const { w, h } = imgSize()
    download(
      `${baseName(active.name)}.coco.json`,
      JSON.stringify(buildCoco(boxes, active.name, w, h), null, 2),
      'application/json',
    )
    toast('COCO JSON을 내려받았습니다')
  }
  const onExportYolo = () => {
    if (!boxes.length) return toast('내보낼 박스가 없습니다')
    download(`${baseName(active.name)}.txt`, buildYoloLines(boxes).join('\n'))
    toast('YOLO txt를 내려받았습니다')
  }
  const onExportImg = async () => {
    if (!boxes.length) return toast('내보낼 박스가 없습니다')
    setExportImgBusy(true)
    try {
      const url = await makeLabeledThumb(active.url, boxes, 1600)
      if (!url) return toast('이미지를 만들지 못했습니다')
      const a = document.createElement('a')
      a.href = url
      a.download = `${baseName(active.name)}_labeled.jpg`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast('라벨 이미지를 내려받았습니다')
    } finally {
      setExportImgBusy(false)
    }
  }

  // ── 저장 ──
  const doSave = async () => {
    persist()
    setSaveBusy(true)
    try {
      const result = await saveLabelsApi(active.name, boxes.length)
      logActivity('라벨 저장', `${active.name} (${boxes.length}개)`)
      if (boxes.length) {
        const classes = [...new Set(boxes.map((b) => b.label))].filter(Boolean).join(', ')
        const thumb = await makeLabeledThumb(active.url, boxes)
        if (thumb) {
          saveArtifact({
            kind: 'image',
            id: active.name,
            title: `라벨링 · ${active.name}`,
            image: thumb,
            caption: `라벨 ${boxes.length}개${classes ? ` · ${classes}` : ''}`,
          })
        }
      }
      toast(`${result.message} — 미리보기에 반영됨`)
    } catch {
      /* api()가 toast */
    } finally {
      setSaveBusy(false)
    }
  }
  const onSave = async () => {
    await doSave()
    onClose()
  }
  const onConfirmSave = async () => {
    setConfirmVisible(false)
    await doSave()
    onClose()
  }
  const onConfirmDiscard = () => {
    setConfirmVisible(false)
    setBoxes(clone(active.savedBoxes))
    onClose()
  }

  return {
    boxes,
    selected,
    setSelected,
    classInput,
    setClassInput,
    confirmVisible,
    setConfirmVisible,
    filter,
    detectBusy,
    detectAllBusy,
    exportImgBusy,
    saveBusy,
    canvasImgRef,
    switchInModal,
    closeModal,
    onDrawBox,
    onLabelChange,
    onDeleteBox,
    onClear,
    onDetect,
    onDetectAll,
    onFilterCancel,
    onFilterApply,
    onExportImg,
    onExportCoco,
    onExportYolo,
    onSave,
    onConfirmSave,
    onConfirmDiscard,
  }
}
