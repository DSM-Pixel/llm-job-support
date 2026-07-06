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

// 왼쪽 패널 하단 — 프리셋/직접질문 + 분석하기. 활성 이미지를 분석해 결과를 저장.
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
    <>
      <h3>분석 시나리오 (프리셋)</h3>
      <div className="radio-list">
        {PRESETS.map((p, i) => (
          <label
            key={p}
            className={i === presetIdx ? 'active' : ''}
            onClick={() => setPresetIdx(i)}
          >
            <span></span>
            {p}
          </label>
        ))}
      </div>
      <h3>
        직접 질문 <small>(선택 · 입력 시 프리셋 대체)</small>
      </h3>
      <textarea
        placeholder="예: 이 사진에서 보행자에게 위험한 요소를 찾아줘"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      ></textarea>
      <button
        className={'btn primary wide analyze-btn' + (busy ? ' is-loading' : '')}
        type="button"
        disabled={busy}
        onClick={analyze}
      >
        {busy ? '분석 중' : '✣ 분석하기'}
      </button>
    </>
  )
}
