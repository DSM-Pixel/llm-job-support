import { useState } from 'react'
import AppShell from '../../shell/AppShell.jsx'
import { useShell } from '../../shell/ShellContext.js'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'
import { detectImage, labelsToBoxes, sameBox } from './labelingApi.js'
import { useLabeling } from './useLabeling.js'
import PreviewArea from './components/PreviewArea.jsx'
import AnalyzePanel from './components/AnalyzePanel.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import LabelingModal from './components/LabelingModal.jsx'

const SAMPLE_NAME = 'road_2026Q1_0142.jpg'
// 샘플의 초기 분석 결과(정적 HTML) — 바닐라 finding-list 초기 마크업.
const SAMPLE_RESULT = {
  html:
    '<li><span class="badge red">상</span>포트홀 — 좌측 하단. 지름 약 35cm, 깊이 추정 6cm. 즉시 보수 대상.</li>' +
    '<li><span class="badge orange">중</span>포트홀 — 중앙. 지름 약 18cm. 차량 손상 우려, 7일 이내 보수.</li>' +
    '<li><span class="badge orange">중</span>선형 균열 — 우측 상단으로 진행. 표면 실링 권장.</li>',
  confText: '신뢰도 0.91',
  confClass: 'status gray',
}

// 설정의 vision 모델을 모델 칩에 반영 — 바닐라 applyModel(data-model="vision").
const MODEL_LABEL = { Gemini: 'gemini-2.5-flash', 'YOLO-World': 'yolo-world' }

function LabelingContent() {
  const { settings, openSettings } = useShell()
  const lab = useLabeling(SAMPLE_NAME, SAMPLE_RESULT)
  const [modeTab, setModeTab] = useState(0)
  const [batchBusy, setBatchBusy] = useState(false)

  const modelName = MODEL_LABEL[settings.engine] || settings.engine
  const modelSuffix = settings.engine === 'YOLO-World' ? ' · 탐지' : ' · 멀티모달'

  // 폴더 전체 AI 라벨링 — 업로드한 모든 사진을 차례로 YOLO 탐지해 박스를 채운다(중복 제외).
  const onBatch = async () => {
    const snapshot = lab.imagesRef.current
    const targets = snapshot.map((im, i) => ({ im, i })).filter((x) => x.im.file)
    if (!targets.length) return toast('폴더로 사진을 먼저 추가하세요')
    let ok = 0
    let totalNew = 0
    let failed = 0
    const merges = {}
    for (let k = 0; k < targets.length; k += 1) {
      const { im, i } = targets[k]
      setBatchBusy(`라벨링 중 ${k + 1}/${targets.length}`)
      try {
        const result = await detectImage(im.file, im.name)
        const merged = im.savedBoxes.slice()
        labelsToBoxes(result).forEach((b) => {
          if (!merged.some((e) => sameBox(e, b))) {
            merged.push(b)
            totalNew += 1
          }
        })
        merges[i] = merged
        ok += 1
      } catch {
        failed += 1
      }
    }
    lab.setImages((prev) =>
      prev.map((image, idx) => (idx in merges ? { ...image, savedBoxes: merges[idx] } : image)),
    )
    logActivity('전체 AI 라벨링', `${ok}장 · 박스 ${totalNew}개`)
    setBatchBusy(false)
    toast(
      failed
        ? `${ok}장 완료 · 박스 ${totalNew}개 (실패 ${failed}장)`
        : `${ok}장 전체 라벨링 완료 · 박스 ${totalNew}개`,
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
