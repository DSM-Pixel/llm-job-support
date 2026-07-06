import { useCallback, useEffect, useRef } from 'react'
import { toast } from '../../../lib/toast.js'

// 큰 이미지 위 박스 그리기/편집 캔버스 — 바닐라 canvas-stage 재현.
// 박스 좌표는 % (0~100). object-fit:contain 결과 영역에 오버레이를 정렬한다.
export default function CanvasStage({ open, imageUrl, imgRef, boxes, selected, onSelect, onDrawBox }) {
  const stageRef = useRef(null)
  const boxesRef = useRef(null)
  const tempRef = useRef(null)
  const startRef = useRef(null)

  // 박스 오버레이를 '실제 렌더된 이미지 영역'(contain 결과)에 맞춘다.
  const fitBoxes = useCallback(() => {
    const stage = stageRef.current
    const img = imgRef.current
    const box = boxesRef.current
    if (!stage || !img || !box) return
    const cw = stage.clientWidth
    const ch = stage.clientHeight
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (!nw || !nh || !cw || !ch) return
    const scale = Math.min(cw / nw, ch / nh)
    const w = nw * scale
    const h = nh * scale
    box.style.left = `${(cw - w) / 2}px`
    box.style.top = `${(ch - h) / 2}px`
    box.style.width = `${w}px`
    box.style.height = `${h}px`
  }, [imgRef])

  // 마운트/이미지 변경 시 한 프레임 뒤 정렬(스테이지 크기 확정 후) + 리사이즈 대응.
  useEffect(() => {
    const id = requestAnimationFrame(fitBoxes)
    const onResize = () => fitBoxes()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', onResize)
    }
  }, [fitBoxes, imageUrl, open])

  // 포인터를 boxes 영역 기준 퍼센트로.
  const pct = (event) => {
    const r = boxesRef.current.getBoundingClientRect()
    return {
      x: (Math.min(Math.max(event.clientX - r.left, 0), r.width) / r.width) * 100,
      y: (Math.min(Math.max(event.clientY - r.top, 0), r.height) / r.height) * 100,
    }
  }

  const clearTemp = () => {
    const t = tempRef.current
    if (t) {
      t.style.display = 'none'
      t.style.width = '0'
      t.style.height = '0'
    }
    startRef.current = null
  }

  const onPointerDown = (event) => {
    const hit = event.target.closest('.draw-box:not(.temp-box)')
    if (hit) {
      onSelect(Number(hit.dataset.i))
      return
    }
    if (!imageUrl) {
      toast('사진을 먼저 추가하세요')
      return
    }
    startRef.current = pct(event)
    stageRef.current.setPointerCapture(event.pointerId)
    const t = tempRef.current
    t.style.display = 'block'
    t.style.left = `${startRef.current.x}%`
    t.style.top = `${startRef.current.y}%`
    t.style.width = '0'
    t.style.height = '0'
  }

  const onPointerMove = (event) => {
    const start = startRef.current
    const t = tempRef.current
    if (!start || !t) return
    const p = pct(event)
    t.style.left = `${Math.min(start.x, p.x)}%`
    t.style.top = `${Math.min(start.y, p.y)}%`
    t.style.width = `${Math.abs(p.x - start.x)}%`
    t.style.height = `${Math.abs(p.y - start.y)}%`
  }

  const onPointerUp = (event) => {
    const start = startRef.current
    if (!start) return
    const p = pct(event)
    const x = Math.min(start.x, p.x)
    const y = Math.min(start.y, p.y)
    const w = Math.abs(p.x - start.x)
    const h = Math.abs(p.y - start.y)
    clearTemp()
    if (w >= 1.2 && h >= 1.2) {
      onDrawBox({ x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2) })
    }
  }

  return (
    <div className="canvas-wrap">
      <div
        className={'canvas-stage' + (imageUrl ? ' has-image' : '')}
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={clearTemp}
      >
        <img
          className="canvas-img"
          alt="라벨 대상 이미지"
          ref={imgRef}
          onLoad={fitBoxes}
          {...(imageUrl ? { src: imageUrl } : {})}
        />
        <div className="canvas-fallback">사진을 먼저 추가하면 여기에서 라벨링할 수 있습니다</div>
        <div className="canvas-boxes" ref={boxesRef}>
          {boxes.map((b, i) => (
            <div
              key={i}
              className={'draw-box' + (i === selected ? ' selected' : '')}
              data-i={i}
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
            >
              <span className="tag">
                {b.label}
                {b.confidence != null ? ` ${b.confidence}%` : ''}
              </span>
            </div>
          ))}
          <div className="draw-box temp-box" ref={tempRef} style={{ display: 'none' }}></div>
        </div>
      </div>
    </div>
  )
}
