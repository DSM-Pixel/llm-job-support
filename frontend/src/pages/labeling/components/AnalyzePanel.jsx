import { useState } from 'react'
import { toast } from '../../../lib/toast.js'
import { logActivity, saveArtifact } from '../../../lib/activity.js'
import { isRealAI } from '../../../lib/aiBackend.js'
import {
  analyzeImage,
  analyzePreset,
  escapeHtml,
  makeLabeledThumb,
  toThumb,
} from '../labelingApi.js'

// 분석 시나리오(프리셋) — 바닐라 radio-list 순서 고정.
const PRESETS = ['도로 파손/포트홀 찾기', '이미지 전체 설명', '객체 목록 뽑기', '이상 상황 탐지']
// 프롬프트 입력칸 아래 예시 칩 — 클릭하면 그 문구로 채운다(목업 재현, '박스로 찾기' 예시).
const EXAMPLES = ['도로 위 문제를 찾아줘', '균열까지 모두 표시해줘', '번호판은 가려줘']

// 캔버스 카드 하단 — 프롬프트 입력 + 예시 칩 + 분석 시나리오 + 분석하기.
// 활성 이미지를 분석해 결과를 저장(부모의 label-panel 안에서 렌더 — .label-panel .analyze-btn).
export default function AnalyzePanel({ active, activeIdx, onResult }) {
  const [presetIdx, setPresetIdx] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)

  const analyze = async () => {
    const preset = PRESETS[presetIdx] || '도로 파손/포트홀 찾기'
    const customPrompt = prompt.trim()
    setBusy(true)
    try {
      if (active.file) {
        // 업로드 이미지가 있으면 실제 Gemini Vision으로 분석.
        const result = await analyzeImage(active.file, preset, customPrompt)
        const html = (result.description || '')
          .split(/\n+/)
          .filter(Boolean)
          .map((line) => `<li>${escapeHtml(line.replace(/^[-*•]\s*/, ''))}</li>`)
          .join('')
        const isAi = isRealAI(result.backend)
        const engineName = result.backend === 'OPENAI' ? 'GPT Vision' : 'Gemini Vision'
        const stored = {
          html,
          confText: isAi ? engineName : 'MOCK 분석',
          confClass: `status ${isAi ? 'green' : 'gray'}`,
        }
        onResult(activeIdx, stored)
        // 보고서에 넣을 산출물로 저장(분석한 이미지 + 분석 요약).
        if (active.url) {
          const summary = (result.description || '')
            .split(/\n+/)
            .filter(Boolean)
            .slice(0, 2)
            .join(' / ')
            .slice(0, 160)
          const thumb = active.savedBoxes.length
            ? await makeLabeledThumb(active.url, active.savedBoxes)
            : await toThumb(active.url)
          if (thumb) {
            saveArtifact({
              kind: 'image',
              cat: '원본',
              id: active.name,
              title: `이미지 분석 · ${preset}`,
              image: thumb,
              caption: summary || preset,
            })
          }
        }
        toast(isAi ? '이미지를 분석했습니다' : '분석 결과(MOCK)')
      } else {
        // 이미지 없으면 프리셋 기반 예시 결과(MOCK).
        const result = await analyzePreset(preset, customPrompt, active.name)
        const html = result.labels
          .map((label) => {
            const text = label.class_name
              ? `<b>${escapeHtml(label.class_name)}</b> — ${escapeHtml(label.note)}`
              : escapeHtml(label.note)
            return `<li><span class="badge ${label.tone}">${escapeHtml(label.grade)}</span>${text}</li>`
          })
          .join('')
        onResult(activeIdx, { html, confText: '예시(MOCK)', confClass: 'status gray' })
        toast('사진을 추가하면 실제 분석합니다 (지금은 예시)')
      }
      logActivity('이미지 분석', preset)
    } catch {
      toast('분석에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="prompt-row">
      <div className="prompt-line">
        <input
          type="text"
          value={prompt}
          placeholder="도로 위 문제를 찾아줘"
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && analyze()}
        />
        <button
          className={'btn primary analyze-btn' + (busy ? ' is-loading' : '')}
          type="button"
          disabled={busy}
          onClick={analyze}
        >
          {busy ? '분석 중' : '✣ AI로 찾기'}
        </button>
      </div>

      <div className="prompt-chips">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="pill prompt-chip" onClick={() => setPrompt(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <div className="preset-row">
        <span className="preset-label">분석 시나리오</span>
        <div className="preset-pills">
          {PRESETS.map((p, i) => (
            <button
              key={p}
              type="button"
              className={'pill' + (i === presetIdx ? ' active' : '')}
              onClick={() => setPresetIdx(i)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
