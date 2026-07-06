import { useEffect, useMemo, useState } from 'react'
import { getActivity, getArtifacts, deleteActivities, deleteArtifacts } from '../lib/activity.js'
import { downloadDocx } from '../lib/reportDocx.js'
import { relTime } from '../lib/time.js'
import { toast } from '../lib/toast.js'

// 기록 관리 모달 — 기존 common.js renderHistory/openHistory/삭제 확인/라이트박스 이식.
// 활동(activity) + 작업 산출물(artifacts)을 시간 역순으로 나열, 선택 후 영구 삭제.
const HIST_ICON = {
  '자연어 질의': '☰',
  'RAG 검색': '⌕',
  '문서 색인': '▱',
  '이미지 분석': '⌗',
  '라벨 저장': '⌗',
  '데이터 업로드': '▱',
}

// 활동·산출물을 표시용 행으로 합쳐 시간 역순 정렬 — 바닐라 renderHistory 와 동일.
const buildRows = () => {
  const acts = getActivity().map((a) => ({
    kind: 'act',
    ts: a.ts,
    page: a.page,
    cat: a.type,
    title: a.type + (a.label ? ` — ${a.label}` : ''),
    image: '',
  }))
  const artCat = (k) => (k === 'rag' ? 'RAG 결과' : k === 'report' ? '보고서 문서' : '이미지 작업')
  const arts = getArtifacts().map((a) => ({
    kind: 'art',
    ts: a.ts,
    page: a.page,
    cat: artCat(a.kind),
    title: a.title || a.question || a.caption || '작업 결과',
    image: a.image || '',
    // 보고서 문서면 원본 데이터를 실어 DOCX 재다운로드에 사용.
    report: a.kind === 'report' ? a.report : null,
  }))
  return [...acts, ...arts].sort((x, y) => y.ts - x.ts)
}

export default function HistoryModal({ open, onClose }) {
  const [tick, setTick] = useState(0) // 삭제 후 목록 재계산 트리거
  const [selected, setSelected] = useState(() => new Set())
  const [confirm, setConfirm] = useState(false) // 삭제 확인 모달
  const [lightbox, setLightbox] = useState('') // 라이트박스 이미지 src

  // 열 때마다 목록 갱신 + 선택 초기화.
  useEffect(() => {
    if (open) {
      setTick((t) => t + 1)
      setSelected(new Set())
    }
  }, [open])

  // Escape — 라이트박스 > 확인 > 모달 순으로 닫는다.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (lightbox) setLightbox('')
      else if (confirm) setConfirm(false)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, lightbox, confirm])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => buildRows(), [tick])

  const keyOf = (r) => `${r.kind}:${r.ts}`
  const toggle = (key) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // 보고서 문서 산출물을 저장된 원본 데이터로 DOCX 재다운로드.
  const downloadReport = async (r) => {
    try {
      const ok = await downloadDocx(r.report)
      toast(ok ? 'DOCX 파일을 내려받았습니다' : '보고서 데이터가 없습니다')
    } catch {
      toast('DOCX 생성에 실패했습니다')
    }
  }

  const allChecked = rows.length > 0 && selected.size === rows.length
  const toggleAll = (checked) => {
    setSelected(checked ? new Set(rows.map(keyOf)) : new Set())
  }

  // 실제 영구 삭제 — 활동/산출물 ts 를 분리해 각각 삭제.
  const doDelete = () => {
    const actTs = []
    const artTs = []
    selected.forEach((k) => {
      const [kind, ts] = k.split(':')
      ;(kind === 'act' ? actTs : artTs).push(ts)
    })
    if (actTs.length) deleteActivities(actTs)
    if (artTs.length) deleteArtifacts(artTs)
    const n = selected.size
    setConfirm(false)
    setSelected(new Set())
    setTick((t) => t + 1)
    toast(`기록 ${n}개를 삭제했습니다`)
  }

  return (
    <>
      <div
        className="modal-overlay history-overlay"
        hidden={!open}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal history-modal">
          <header className="modal-head">
            <h3>기록 관리</h3>
            <button className="modal-close" type="button" aria-label="닫기" onClick={onClose}>
              ✕
            </button>
          </header>
          <div className="history-toolbar">
            <label className="hist-all">
              <input
                type="checkbox"
                className="hist-select-all"
                checked={allChecked}
                onChange={(e) => toggleAll(e.target.checked)}
              />
              <span>전체 선택</span>
            </label>
            <span className="hist-count">선택 {selected.size}개</span>
            <button
              className="btn danger hist-delete"
              type="button"
              disabled={selected.size === 0}
              onClick={() => setConfirm(true)}
            >
              선택 삭제
            </button>
          </div>
          <div className="modal-body">
            <ul className="history-list">
              {rows.length === 0 ? (
                <li className="hist-empty">
                  아직 기록이 없습니다. 자연어 질의·RAG 검색·이미지 라벨링을 사용하면 여기에 쌓입니다.
                </li>
              ) : (
                rows.map((r) => {
                  const key = keyOf(r)
                  const ic = r.report ? '📄' : HIST_ICON[r.cat] || (r.kind === 'art' ? '◫' : '•')
                  return (
                    <li
                      className="hist-row"
                      key={key}
                      onClick={(e) => {
                        if (e.target.closest('.hist-thumb')) {
                          setLightbox(r.image)
                          return
                        }
                        if (e.target.closest('.hist-docx')) return
                        if (e.target.closest('input')) return
                        toggle(key)
                      }}
                    >
                      <label className="hist-check">
                        <input
                          type="checkbox"
                          className="hist-cb"
                          data-key={key}
                          checked={selected.has(key)}
                          onChange={() => toggle(key)}
                        />
                      </label>
                      <span className="hist-ic">{ic}</span>
                      <div className="hist-info">
                        <b>{r.title}</b>
                        <small>
                          {r.cat} · {r.page || ''} · {relTime(r.ts)}
                        </small>
                      </div>
                      {r.report && (
                        <button
                          className="btn hist-docx"
                          type="button"
                          onClick={() => downloadReport(r)}
                        >
                          DOCX
                        </button>
                      )}
                      {r.image && <img className="hist-thumb" src={r.image} alt="" />}
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* 삭제 확인 — 기존 confirmAction 재현 */}
      {confirm && (
        <div
          className="modal-overlay confirm-overlay"
          onClick={(e) => e.target === e.currentTarget && setConfirm(false)}
        >
          <div className="modal confirm-modal">
            <header className="modal-head">
              <h3>영구 삭제</h3>
              <button
                className="modal-close"
                type="button"
                aria-label="닫기"
                onClick={() => setConfirm(false)}
              >
                ✕
              </button>
            </header>
            <div className="modal-body">
              <p className="confirm-text">
                선택한 기록 {selected.size}개를 영구 삭제할까요?
                <br />이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn modal-cancel" type="button" onClick={() => setConfirm(false)}>
                취소
              </button>
              <button className="btn danger confirm-ok" type="button" onClick={doDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사진 크게 보기(라이트박스) */}
      {lightbox && (
        <div className="modal-overlay lightbox-overlay" onClick={() => setLightbox('')}>
          <img className="lightbox-img" src={lightbox} alt="" />
        </div>
      )}
    </>
  )
}
