// 라벨링 페이지 전용 API 호출 + 순수 헬퍼 — 바닐라 labeling.js 규약을 그대로 이식.
// (엔드포인트/필드/좌표 규약은 바닐라와 1:1 동일)
import { api } from '../../lib/api.js'

// HTML 주입용 이스케이프(분석 결과 innerHTML 을 만들 때만 사용) — 바닐라 escapeHtml 동일.
export const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

// 탐지 결과(labels) → 박스 배열. box_2d=[ymin,xmin,ymax,xmax] (0~1000 스케일).
export const labelsToBoxes = (result) =>
  (result.labels || [])
    .filter((l) => Array.isArray(l.box_2d) && l.box_2d.length === 4)
    .map((l) => {
      const [ymin, xmin, ymax, xmax] = l.box_2d
      return {
        x: +(xmin / 10).toFixed(2),
        y: +(ymin / 10).toFixed(2),
        w: +((xmax - xmin) / 10).toFixed(2),
        h: +((ymax - ymin) / 10).toFixed(2),
        label: l.class_name || 'object',
        tone: l.tone || '',
        confidence: typeof l.confidence === 'number' ? l.confidence : null,
      }
    })

// 같은(거의 동일한) 박스인지 — 라벨 동일 + 좌표 2% 이내.
export const sameBox = (a, b) =>
  a.label === b.label &&
  Math.abs(a.x - b.x) < 2 &&
  Math.abs(a.y - b.y) < 2 &&
  Math.abs(a.w - b.w) < 2 &&
  Math.abs(a.h - b.h) < 2

// 한 이미지 탐지 호출 — 업로드 파일이 있으면 실제 YOLO(best.pt), 없으면 프리셋 MOCK.
export const detectImage = async (file, name) => {
  if (file) {
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/labeling/detect-image', { method: 'POST', body: fd })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  return api('/api/labeling/detect', { preset: '도로 파손/포트홀 찾기', image_name: name })
}

// 전체 객체 탐지 — 업로드 파일이 있으면 함께, 없으면 MOCK.
export const detectObjects = async (file) => {
  const opt = { method: 'POST' }
  if (file) {
    const fd = new FormData()
    fd.append('image', file)
    opt.body = fd
  }
  const res = await fetch('/api/labeling/detect-objects', opt)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 이미지 분석(Gemini Vision) — 업로드 파일 필수.
export const analyzeImage = async (file, preset, customPrompt) => {
  const fd = new FormData()
  fd.append('image', file)
  fd.append('preset', preset)
  fd.append('custom_prompt', customPrompt)
  const res = await fetch('/api/labeling/analyze-image', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// 프리셋 기반 예시 분석(MOCK) — 업로드 없을 때.
export const analyzePreset = (preset, customPrompt, imageName) =>
  api('/api/labeling/detect', { preset, custom_prompt: customPrompt, image_name: imageName })

// 라벨 데이터셋 저장.
export const saveLabels = (imageName, labelCount) =>
  api('/api/labeling/save', { image_name: imageName, label_count: labelCount })

// ── 썸네일 생성 ──────────────────────────────────────────────────
// 원본 이미지를 축소한 data URL(박스 없이) — 바닐라 common.js toThumb 이식.
export const toThumb = (imgOrSrc, max = 560) =>
  new Promise((resolve) => {
    const draw = (el) => {
      const w = el.naturalWidth || el.width
      const h = el.naturalHeight || el.height
      if (!w || !h) return resolve('')
      const scale = Math.min(1, max / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      try {
        canvas.getContext('2d').drawImage(el, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      } catch {
        resolve('')
      }
    }
    if (imgOrSrc instanceof HTMLImageElement && imgOrSrc.complete && imgOrSrc.naturalWidth) {
      draw(imgOrSrc)
    } else {
      const el = new Image()
      el.onload = () => draw(el)
      el.onerror = () => resolve('')
      el.src = imgOrSrc instanceof HTMLImageElement ? imgOrSrc.src : imgOrSrc
    }
  })

// 라벨 박스(+클래스명)를 그려 넣은 data URL 생성. 실제 이미지가 없으면(샘플)
// 어두운 도로 배경을 그려 그 위에 박스를 얹는다 — 바닐라 makeLabeledThumb 이식.
export const makeLabeledThumb = (imgEl, boxList, max = 760) =>
  new Promise((resolve) => {
    const paint = (el) => {
      let W
      let H
      if (el && (el.naturalWidth || el.width)) {
        const iw = el.naturalWidth || el.width
        const ih = el.naturalHeight || el.height
        const scale = Math.min(1, max / Math.max(iw, ih))
        W = Math.round(iw * scale)
        H = Math.round(ih * scale)
      } else {
        el = null
        W = max
        H = Math.round(max * 0.6)
      }
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const ctx = c.getContext('2d')
      try {
        if (el) {
          ctx.drawImage(el, 0, 0, W, H)
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, H)
          g.addColorStop(0, '#1f2b42')
          g.addColorStop(1, '#0c111c')
          ctx.fillStyle = g
          ctx.fillRect(0, 0, W, H)
        }
        ctx.lineWidth = Math.max(2, Math.round(W / 280))
        const fs = Math.max(12, Math.round(W / 38))
        ctx.font = `700 ${fs}px sans-serif`
        ctx.textBaseline = 'top'
        boxList.forEach((b) => {
          const x = (b.x / 100) * W
          const y = (b.y / 100) * H
          const w = (b.w / 100) * W
          const h = (b.h / 100) * H
          ctx.strokeStyle = '#ef4444'
          ctx.strokeRect(x, y, w, h)
          const label = b.label || 'object'
          const tw = ctx.measureText(label).width
          const ly = Math.max(0, y - (fs + 6))
          ctx.fillStyle = '#ef4444'
          ctx.fillRect(x, ly, tw + 10, fs + 6)
          ctx.fillStyle = '#fff'
          ctx.fillText(label, x + 5, ly + 3)
        })
        resolve(c.toDataURL('image/jpeg', 0.85))
      } catch {
        resolve('')
      }
    }
    const src = imgEl instanceof HTMLImageElement ? imgEl.src : imgEl
    if (imgEl instanceof HTMLImageElement && imgEl.complete && imgEl.naturalWidth) {
      paint(imgEl)
    } else if (src) {
      const e = new Image()
      e.onload = () => paint(e)
      e.onerror = () => paint(null)
      e.src = src
    } else {
      paint(null)
    }
  })

// ── 내보내기 (프로토타입 labeling.py 와 동일 규약) ───────────────
export const download = (filename, text, type = 'text/plain') => {
  const blob = new Blob([text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const baseName = (imageName) => imageName.replace(/\.[^.]+$/, '') || 'labels'

export const classMap = (boxes) => {
  const names = [...new Set(boxes.map((b) => b.label))].sort()
  return Object.fromEntries(names.map((n, i) => [n, i]))
}

// COCO JSON 객체 생성.
export const buildCoco = (boxes, imageName, w, h) => {
  const cmap = classMap(boxes)
  return {
    images: [{ id: 1, file_name: imageName, width: w, height: h }],
    annotations: boxes.map((b, i) => {
      const px = (b.x / 100) * w
      const py = (b.y / 100) * h
      const bw = (b.w / 100) * w
      const bh = (b.h / 100) * h
      return {
        id: i + 1,
        image_id: 1,
        category_id: cmap[b.label],
        bbox: [+px.toFixed(2), +py.toFixed(2), +bw.toFixed(2), +bh.toFixed(2)],
        area: +(bw * bh).toFixed(2),
        iscrowd: 0,
      }
    }),
    categories: Object.entries(cmap).map(([name, id]) => ({ id, name })),
  }
}

// YOLO txt 라인 생성.
export const buildYoloLines = (boxes) => {
  const cmap = classMap(boxes)
  return boxes.map((b) => {
    const cx = (b.x + b.w / 2) / 100
    const cy = (b.y + b.h / 2) / 100
    return `${cmap[b.label]} ${cx.toFixed(6)} ${cy.toFixed(6)} ${(b.w / 100).toFixed(6)} ${(b.h / 100).toFixed(6)}`
  })
}
