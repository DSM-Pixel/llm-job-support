import { useEffect, useRef, useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { useShell } from '../../shell/ShellContext.js'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'
import { registerJob, activeJobs } from '../../lib/aijob.js'
import { useLabeling } from './useLabeling.js'
import PreviewArea from './components/PreviewArea.jsx'
import AnalyzePanel from './components/AnalyzePanel.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import LabelBoard from './components/LabelBoard.jsx'
import GalleryPanel from './components/GalleryPanel.jsx'
import LabelingModal from './components/LabelingModal.jsx'

const SAMPLE_NAME = 'road_2026Q1_0142.jpg'

function LabelingContent() {
  const { settings, openSettings } = useShell()
  // 초기 분석 결과는 비워 둔다(가짜 미리보기 findings 제거) — 실제 '분석하기' 전까진 빈 상태.
  const lab = useLabeling(SAMPLE_NAME, null)
  const [batchBusy, setBatchBusy] = useState(false)
  // 폴더 라벨링 결과(서버가 박스 그린 썸네일) — 다른 메뉴 갔다 와도 남도록 sessionStorage 로 유지.
  const [batchResult, setBatchResult] = useState([])
  // 사진 추가(파일/폴더) 입력 — 큰 캔버스(빈 상태 클릭)와 갤러리 버튼이 같은 입력을 공유한다.
  const fileRef = useRef(null)
  const folderRef = useRef(null)

  const modelName = 'gpt-4o'
  const modelSuffix = ' · 멀티모달 비전'

  // 업로드 대역폭 절약 — 큰 폰 사진은 1280px 로 줄여 올린다(탐지엔 충분, 서버도 어차피 축소).
  const resizeForUpload = (file, max = 1280) =>
    new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
        if (scale === 1) return resolve(file) // 이미 작으면 원본 그대로
        const c = document.createElement('canvas')
        c.width = Math.round(img.naturalWidth * scale)
        c.height = Math.round(img.naturalHeight * scale)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        c.toBlob((b) => resolve(b || file), 'image/jpeg', 0.85)
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })

  // 폴더 전체 AI 라벨링 — 서버 백그라운드 job 으로 수행. 사이드바를 옮겨도 계속 진행되고,
  // 완료 시 전역 표시기가 결과를 데이터 관리에 저장한다(AiJobIndicator). 이 페이지에 있으면
  // 아래 useEffect 가 캔버스에 박스도 반영한다.
  const onBatch = async () => {
    const targets = lab.imagesRef.current.filter((im) => im.file)
    if (!targets.length) return toast('폴더로 사진을 먼저 추가하세요')
    setBatchBusy(`업로드 중 ${targets.length}장…`)
    try {
      const fd = new FormData()
      for (const im of targets) {
        const blob = await resizeForUpload(im.file)
        fd.append('images', blob, im.name)
      }
      const res = await fetch('/api/labeling/batch-start', { method: 'POST', body: fd }).then((r) =>
        r.json(),
      )
      if (!res?.job_id) throw new Error('start failed')
      registerJob(res.job_id, { kind: 'labeling_batch', label: `폴더 라벨링 ${targets.length}장` })
      logActivity('전체 AI 라벨링', `${targets.length}장 요청(백그라운드)`)
      // 백그라운드 진행 중임을 버튼에 유지 — 진행률/완료는 아래 useEffect 이벤트로 갱신·해제.
      setBatchBusy(`라벨링 중 0/${targets.length}`)
      toast(`${targets.length}장 라벨링 시작 — 다른 메뉴로 이동해도 계속됩니다`)
    } catch {
      toast('라벨링 시작에 실패했습니다')
      setBatchBusy(false)
    }
  }

  // 배치 완료 시(이 페이지에 있을 때) 캔버스의 각 이미지에 박스 반영. (데이터 관리 저장은
  // 어느 페이지에서든 동작하도록 전역 AiJobIndicator 가 담당한다.)
  useEffect(() => {
    const onDone = (e) => {
      if (e.detail?.kind !== 'labeling_batch') return
      const items = e.detail.result?.items || []
      // 결과 갤러리(서버 썸네일) 갱신 + 보관 — 원본 이미지가 없어도 결과가 남는다.
      const gallery = items.filter((it) => it?.count)
      setBatchResult(gallery)
      try {
        sessionStorage.setItem('gnsoft.labeling.lastbatch', JSON.stringify(gallery))
      } catch {
        /* 용량 초과 등 무시 */
      }
      // 원본 이미지가 아직 있으면 캔버스에도 박스 반영(+ IndexedDB 저장) — 복귀 후에도 유지.
      lab.applyBatchBoxes(items)
      setBatchBusy(false) // 완료 → 버튼 원복
    }
    // 진행률 → 버튼 라벨 갱신("라벨링 중 3/5"). 완료/실패 → 버튼 원복.
    const onProgress = (e) => {
      if (e.detail?.kind !== 'labeling_batch') return
      const p = e.detail.progress
      if (p && typeof p.total === 'number') setBatchBusy(`라벨링 중 ${p.done ?? 0}/${p.total}`)
      else setBatchBusy('라벨링 중…')
    }
    const onError = (e) => {
      if (e.detail?.kind !== 'labeling_batch') return
      setBatchBusy(false)
    }
    window.addEventListener('aijob:done', onDone)
    window.addEventListener('aijob:progress', onProgress)
    window.addEventListener('aijob:error', onError)
    // 복귀 진입: 직전 폴더 라벨링 결과 복원 + 아직 진행 중이면 버튼을 진행 상태로.
    try {
      const last = sessionStorage.getItem('gnsoft.labeling.lastbatch')
      if (last) setBatchResult(JSON.parse(last))
    } catch {
      /* 무시 */
    }
    if (activeJobs().some((j) => j.kind === 'labeling_batch')) setBatchBusy('라벨링 중…')
    return () => {
      window.removeEventListener('aijob:done', onDone)
      window.removeEventListener('aijob:progress', onProgress)
      window.removeEventListener('aijob:error', onError)
    }
    // 마운트 1회만 — lab 은 매 렌더 새 객체라 의존성에 넣으면 재렌더 루프가 난다.
    // (applyBatchBoxes 등 lab 의 메서드는 useCallback 으로 안정적이라 초기 캡처로 충분.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openModal = () => lab.setModalOpen(true)
  const hasUpload = lab.images.some((im) => im.file)

  return (
    <>
      <div className="card canvas-card label-panel">
        <PreviewArea
          active={lab.active}
          activeIdx={lab.activeIdx}
          totalImages={lab.images.length}
          onOpenModal={openModal}
          onEmptyClick={() => fileRef.current?.click()}
          onRemoveActive={() => lab.removeImage(lab.activeIdx)}
          modelName={modelName}
          modelSuffix={modelSuffix}
          onOpenSettings={openSettings}
        />
        <AnalyzePanel active={lab.active} activeIdx={lab.activeIdx} onResult={lab.updateResult} />
      </div>

      <ResultPanel result={lab.active.result} />

      <LabelBoard boxes={lab.active.savedBoxes} onOpenModal={openModal} />

      <GalleryPanel
        images={lab.images}
        activeIdx={lab.activeIdx}
        onSelect={lab.setActive}
        onRemove={lab.removeImage}
        onRemoveAll={lab.clearImages}
        fileRef={fileRef}
        folderRef={folderRef}
        onBatch={onBatch}
        batchBusy={batchBusy}
        hasUpload={hasUpload}
      />

      {batchResult.length > 0 && (
        <section className="batch-results">
          <h3>
            폴더 라벨링 결과 <small>{batchResult.length}장</small>
          </h3>
          <div className="batch-grid">
            {batchResult.map((it, i) => (
              <figure key={i} className="batch-item">
                {it.thumb ? (
                  <img src={it.thumb} alt={it.name} loading="lazy" />
                ) : (
                  <div className="batch-nothumb">미리보기 없음</div>
                )}
                <figcaption>
                  <b>{it.name}</b>
                  <span>
                    라벨 {it.count}개{it.classes?.length ? ` · ${it.classes.join(', ')}` : ''}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <div className="px-bottomcta">
        <button className="btn flat" type="button" onClick={openModal}>
          내보내기
        </button>
        <button className="btn primary grow lg" type="button" onClick={openModal}>
          라벨 저장하기
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
          if (fileRef.current.files?.length) lab.addImages(fileRef.current.files)
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
          if (folderRef.current.files?.length) lab.addImages(folderRef.current.files)
          folderRef.current.value = ''
        }}
      />

      <LabelingModal
        open={lab.modalOpen}
        images={lab.images}
        activeIdx={lab.activeIdx}
        active={lab.active}
        onSwitchActive={lab.setActive}
        updateSaved={lab.updateSaved}
        onClose={() => lab.setModalOpen(false)}
        defaultClass={settings.defaultClass}
      />
    </>
  )
}

export default function LabelingPage() {
  return (
    <AppShell title="라벨링 시작하기" activeNav="labeling">
      <section className="content labeling-page">
        <LabelingContent />
      </section>
    </AppShell>
  )
}
