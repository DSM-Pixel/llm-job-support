import { useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/toast.js'
import { logActivity } from '../../lib/activity.js'
import {
  ragFiles,
  removeSource,
  indexDocs,
  webSearch,
  setSamples,
  resetRag,
  readText,
} from './ragApi.js'

// 지식베이스 패널 공용 상태·핸들러 — 기존 rag.js 의 문서 준비/웹 검색/참고 파일 로직을
// 그대로 이식(bug-for-bug). 파일 목록·샘플 토글·색인 메시지·스테이징이 서로 얽혀 있어
// 한 훅으로 끌어올려 하위 컴포넌트에 내려준다.
export function useKnowledge() {
  const [samplesOff, setSamplesOff] = useState(false) // 초기: 샘플 포함(ON)
  const [files, setFiles] = useState([])
  const [indexedText, setIndexedText] = useState('✓ 색인됨')
  const [staged, setStaged] = useState([])
  const [webResults, setWebResults] = useState(null)
  const [indexBusy, setIndexBusy] = useState(false)
  const [webBusy, setWebBusy] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const uploadRef = useRef(null)

  // 참고중인 파일 목록을 백엔드에서 받아 렌더(실패 시 정적 항목 유지).
  const loadFiles = async () => {
    try {
      const r = await ragFiles()
      setFiles(r.files || [])
    } catch {
      /* 정적 항목 유지 */
    }
  }

  useEffect(() => {
    loadFiles() // 진입 시 실제 색인 파일 목록 표시
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // '샘플 점검 문서 사용' 토글 → 즉시 샘플 포함/제외(참고 파일 목록 갱신).
  const toggleSamples = async () => {
    const newOff = !samplesOff
    setSamplesOff(newOff)
    const on = !newOff
    try {
      await setSamples(on)
      await loadFiles()
      toast(on ? '샘플 문서를 포함했습니다' : '샘플 문서를 제외했습니다')
    } catch {
      /* handled */
    }
  }

  // 파일 선택 → 스테이징만(아직 참고중인 파일에 추가하지 않음).
  const onUploadChange = async (event) => {
    const picked = [...event.target.files]
    if (!picked.length) return
    const docs = await Promise.all(
      picked.map(async (file) => ({ name: file.name, text: await readText(file) })),
    )
    setStaged((prev) => {
      const next = [...prev]
      docs.forEach((d) => {
        if (!next.some((s) => s.name === d.name)) next.push(d)
      })
      return next
    })
    toast(`${picked.length}개 선택됨 — ‘문서 색인’을 누르면 추가됩니다`)
  }

  // 문서 색인 → 스테이징한 문서를 참고중인 파일에 추가.
  const indexStaged = async () => {
    if (!staged.length) {
      toast('먼저 문서를 선택하세요')
      return
    }
    setIndexBusy(true)
    const stagedNames = staged.map((d) => d.name).join(', ')
    try {
      const useSamples = !samplesOff
      const res = await indexDocs(staged, useSamples)
      setStaged([])
      if (uploadRef.current) uploadRef.current.value = ''
      await loadFiles()
      setIndexedText(`✓ ${res.message}`)
      logActivity('문서 색인', stagedNames)
      toast('선택한 문서를 참고중인 파일에 추가했습니다')
    } catch {
      /* handled */
    } finally {
      setIndexBusy(false)
    }
  }

  // 선택 취소 → 스테이징만 비움(참고중인 파일은 그대로).
  const clearStaged = () => {
    if (!staged.length) {
      toast('취소할 선택이 없습니다')
      return
    }
    setStaged([])
    if (uploadRef.current) uploadRef.current.value = ''
    toast('선택을 취소했습니다')
  }

  // 전체 참고 파일 초기화 → 추가/삭제 내역을 비우고 샘플만 남김.
  const resetAll = async () => {
    setResetBusy(true)
    try {
      const result = await resetRag()
      setSamplesOff(true) // 샘플 토글 OFF 동기화
      await loadFiles()
      setIndexedText(`✓ ${result.message}`)
      toast('참고 파일을 전체 초기화했습니다 (샘플 포함) — 샘플 토글을 켜면 복원')
    } catch {
      /* handled */
    } finally {
      setResetBusy(false)
    }
  }

  // 웹에서 찾아 넣기 — 결과를 체크박스로 보여주고, 선택한 것만 색인에 추가.
  const doWebSearch = async (keyword) => {
    const kw = (keyword || '').trim()
    if (!kw) {
      toast('검색어를 입력해주세요')
      return
    }
    setWebBusy(true)
    try {
      const result = await webSearch(kw)
      setWebResults(result.results)
      toast(result.message)
    } catch {
      /* handled */
    } finally {
      setWebBusy(false)
    }
  }

  const addWebPicked = async (picked) => {
    if (!picked.length) {
      toast('추가할 문서를 선택하세요')
      return
    }
    setAddBusy(true)
    try {
      const docs = picked.map((r) => ({ name: r.title, text: r.snippet }))
      const res = await indexDocs(docs, true)
      await loadFiles()
      setIndexedText(`✓ ${res.message}`)
      setWebResults(null)
      toast(`${picked.length}개 문서를 색인에 추가했습니다`)
    } catch {
      /* handled */
    } finally {
      setAddBusy(false)
    }
  }

  const removeFile = async (name) => {
    try {
      const r = await removeSource(name)
      await loadFiles()
      toast(r.message || `‘${name}’ 삭제됨`)
    } catch {
      /* handled */
    }
  }

  return {
    samplesOff,
    files,
    indexedText,
    staged,
    webResults,
    indexBusy,
    webBusy,
    addBusy,
    resetBusy,
    uploadRef,
    toggleSamples,
    onUploadChange,
    indexStaged,
    clearStaged,
    resetAll,
    doWebSearch,
    addWebPicked,
    removeFile,
  }
}
