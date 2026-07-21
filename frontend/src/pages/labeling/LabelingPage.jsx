import { useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { useShell } from '../../shell/ShellContext.js'
import { toast } from '../../lib/toast.js'
import { logActivity, saveArtifact } from '../../lib/activity.js'
import { detectImage, labelsToBoxes, sameBox, makeLabeledThumb } from './labelingApi.js'
import { useLabeling } from './useLabeling.js'
import PreviewArea from './components/PreviewArea.jsx'
import AnalyzePanel from './components/AnalyzePanel.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import LabelingModal from './components/LabelingModal.jsx'

const SAMPLE_NAME = 'road_2026Q1_0142.jpg'

function LabelingContent() {
  const { settings, openSettings } = useShell()
  // 초기 분석 결과는 비워 둔다(가짜 미리보기 findings 제거) — 실제 '분석하기' 전까진 빈 상태.
  const lab = useLabeling(SAMPLE_NAME, null)
  const [modeTab, setModeTab] = useState(0)
  const [batchBusy, setBatchBusy] = useState(false)

  const modelName = 'gpt-4o'
  const modelSuffix = ' · 멀티모달 비전'

  // 폴더 전체 AI 라벨링 — 업로드한 모든 사진을 차례로 YOLO 탐지해 박스를 채운다(중복 제외).
  const onBatch = async () => {
    const snapshot = lab.imagesRef.current
    const targets = snapshot.map((im, i) => ({ im, i })).filter((x) => x.im.file)
    if (!targets.length) return toast('폴더로 사진을 먼저 추가하세요')
    let ok = 0
    let totalNew = 0
    let failed = 0
    let saved = 0
    const merges = {}
    // AI 사용량 한도(분당 요청 수)에 걸리지 않게 이미지 사이 간격을 둔다.
    const gap = (ms) => new Promise((r) => setTimeout(r, ms))
    for (let k = 0; k < targets.length; k += 1) {
      const { im, i } = targets[k]
      if (k > 0) await gap(4000)
      setBatchBusy(`라벨링 중 ${k + 1}/${targets.length}`)
      try {
        const result = await detectImage(im.file, im.name)
        if (result.backend === 'AI_FAIL') {
          failed += 1
          continue
        }
        const merged = im.savedBoxes.slice()
        labelsToBoxes(result).forEach((b) => {
          if (!merged.some((e) => sameBox(e, b))) {
            merged.push(b)
            totalNew += 1
          }
        })
        merges[i] = merged
        ok += 1
        // 폴더로 라벨링한 각 사진을 '데이터 관리'에 개별 작업물(라벨)로 남긴다.
        // (배치라 용량 절약 위해 작은 썸네일 사용.) 박스가 있을 때만 저장.
        if (merged.length) {
          const thumb = await makeLabeledThumb(im.url, merged, 400)
          if (thumb) {
            const classes = [...new Set(merged.map((b) => b.label))].filter(Boolean).join(', ')
            saveArtifact({
              kind: 'image',
              cat: '라벨',
              id: im.name,
              title: `라벨링 · ${im.name}`,
              image: thumb,
              caption: `라벨 ${merged.length}개${classes ? ` · ${classes}` : ''}`,
            })
            saved += 1
          }
        }
      } catch {
        failed += 1
      }
    }
    lab.setImages((prev) =>
      prev.map((image, idx) => (idx in merges ? { ...image, savedBoxes: merges[idx] } : image)),
    )
    logActivity('전체 AI 라벨링', `${ok}장 · 박스 ${totalNew}개 · 저장 ${saved}장`)
    setBatchBusy(false)
    toast(
      failed
        ? `${ok}장 완료 · 박스 ${totalNew}개 · 데이터 관리에 ${saved}장 저장 (실패 ${failed}장)`
        : `${ok}장 전체 라벨링 완료 · 박스 ${totalNew}개 · 데이터 관리에 ${saved}장 저장`,
    )
  }

  const openModal = () => lab.setModalOpen(true)

  return (
    <>
      <nav className="mode-tabs">
        <button className={modeTab === 0 ? 'active' : ''} onClick={() => setModeTab(0)}>
          ☰ 설명 분석
        </button>
        <button
          className={modeTab === 1 ? 'active' : ''}
          onClick={() => {
            setModeTab(1)
            openModal()
          }}
        >
          ⌗ 박스로 찾기
        </button>
        <span
          className="model-chip"
          data-model="vision"
          role="button"
          title="AI 모델 — 클릭해 설정에서 변경"
          style={{ cursor: 'pointer' }}
          onClick={openSettings}
        >
          ⚙ {modelName}
          {modelSuffix}
        </span>
      </nav>

      <section className="label-layout">
        <aside className="label-panel">
          <PreviewArea
            images={lab.images}
            activeIdx={lab.activeIdx}
            active={lab.active}
            onSelect={lab.setActive}
            onRemove={lab.removeImage}
            onAddImages={lab.addImages}
            onBatch={onBatch}
            onOpenModal={openModal}
            batchBusy={batchBusy}
          />
          <AnalyzePanel active={lab.active} activeIdx={lab.activeIdx} onResult={lab.updateResult} />
        </aside>
        <ResultPanel result={lab.active.result} />
      </section>

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
    <AppShell title="이미지 분석·라벨링" activeNav="labeling">
      <LabelingContent />
    </AppShell>
  )
}
