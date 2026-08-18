import { resultSuffix } from '../photoApi.js'

// 보라 그라데이션 결과 패널 — 좌: 요약(몇 곳/개/건), 우: 분석 대상 사진 미리보기 · 드롭존.
export default function ResultStage({ mode, result, busy, active, onDrop, onPickActive }) {
  const statusText = busy ? '분석 중' : result ? result.engineText : '분석 전'
  const statusClass = busy ? 'status blue' : result?.isAi ? 'status green' : 'status gray'

  return (
    <div className="px-gradient px-gradient-stage">
      <div className="px-gradient-summary">
        <div className="px-gradient-tags">
          <span className="pill active">{mode.title}</span>
          <span className={statusClass}>{statusText}</span>
        </div>
        {result ? (
          <p className="px-gradient-count">
            <b>{result.count}</b>
            <small>{resultSuffix(mode.key)}</small>
          </p>
        ) : (
          <p className="px-gradient-count">
            <b className="muted">{busy ? '분석 중…' : '분석 전'}</b>
          </p>
        )}
        <p className="px-gradient-hint">
          {busy
            ? '사진을 살펴보는 중이에요. 잠시만 기다려주세요.'
            : result
              ? '아래 목록에서 자세한 내용을 확인하세요.'
              : '사진을 고르고 프롬프트 위 ‘분석하기’를 눌러보세요.'}
        </p>
        <p className="px-gradient-brand">✣ PIXEL AI</p>
      </div>

      <div
        className="px-drop"
        role="button"
        onClick={() => !active.url && onPickActive()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onDrop(e.dataTransfer.files?.[0])
        }}
      >
        {active.url ? (
          <>
            <img src={active.url} alt={active.name} />
            <span className="px-drop-tag">{active.name}</span>
          </>
        ) : (
          '분석할 사진을 끌어다 놓으세요'
        )}
      </div>
    </div>
  )
}
