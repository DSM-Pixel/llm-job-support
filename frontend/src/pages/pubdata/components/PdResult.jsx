// 검색 결과 — 보라 그라데이션 요약 + AI 인사이트 카드 + 통계 랭킹 + 사용 데이터(목업 스타일).
// React 가 텍스트를 자동 이스케이프하므로 바닐라의 escapeHtml 은 불필요.
import { isRealAI } from '../../../lib/aiBackend.js'

export default function PdResult({ data, onToReport, onCompare }) {
  const stats = data.stats || {}
  const labels = stats.labels || []
  const values = stats.values || []
  // 값 내림차순 '순위'로 정렬(라벨↔값 쌍 유지) — 상위 3위는 메달, 나머지는 번호.
  const ranked = labels
    .map((label, i) => ({ label, value: Number(values[i]) || 0 }))
    .sort((a, b) => b.value - a.value)
  const rankMax = Math.max(1, ...ranked.map((r) => r.value))
  // 월별 통계(제목에 '월별' + 라벨이 1~2자리 숫자)면 라벨을 'N월'로 표기.
  const isMonthly =
    /월/.test(stats.title || '') &&
    labels.length > 0 &&
    labels.every((l) => /^\d{1,2}$/.test(String(l).trim()))
  const fmtLabel = (l) => (isMonthly ? `${String(l).trim()}월` : l)

  return (
    <>
      <div className="px-gradient pd-summary">
        <div className="pd-summary-top">
          <span className="px-badge v">{isRealAI(data.summary_backend) ? 'AI 생성' : '템플릿'}</span>
          <span className="px-badge g">{data.domain}</span>
        </div>
        <div className="pd-summary-main">
          {labels.length > 0 && (
            <p className="pd-summary-figure">
              {labels.length}
              <span>곳</span>
            </p>
          )}
          <p className="pd-summary-text">{data.summary}</p>
        </div>
        <div className="pd-summary-aside">
          <div className="pd-summary-stat">
            <b>{data.dataset_matched ?? data.datasets.length}</b>
            <span>관련 데이터셋</span>
          </div>
          <div className="pd-summary-stat">
            <b>{stats.sample === false ? '실시간' : '샘플'}</b>
            <span>데이터 상태</span>
          </div>
        </div>
      </div>

      {(data.insights || []).length > 0 && (
        <>
          <div className="px-section-head">
            <h3>
              새 소식 <span className="count">AI가 정리했어요</span>
            </h3>
          </div>
          <div className="px-softcards">
            {data.insights.map((t, i) => (
              <div className="px-softcard" key={i}>
                <span className="px-softcard-no icon">📰</span>
                <p>{t}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {labels.length > 0 && (
        <>
          <div className="px-section-head">
            <h3>{stats.title || '통계'}</h3>
            <span className="px-section-aside">{stats.dataset || data.domain} 기준</span>
          </div>
          <div className="px-ranklist">
            {ranked.map((r, i) => (
              <div className="px-rank" key={r.label + i}>
                <span className={'px-rank-no' + (i === 0 ? ' top' : '')}>{i + 1}</span>
                <div className="px-rank-main">
                  <b>{fmtLabel(r.label)}</b>
                  <div className="px-rank-bar">
                    <span
                      className={i === 0 ? undefined : 'mute'}
                      style={{ width: `${Math.round((r.value / rankMax) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="px-rank-val">
                  {r.value}
                  {stats.unit || ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="px-section-head">
        <h3>
          사용 데이터 <span className="count">{(data.datasets || []).length}개</span>
        </h3>
      </div>
      <div className="pd-ds-list">
        {(data.datasets || []).map((d, i) => (
          <a className="card pd-ds" key={i} href={d.url} target="_blank" rel="noopener">
            <span className="pd-ds-ic" aria-hidden="true">
              ⌂
            </span>
            <div className="pd-ds-main">
              <b>{d.title}</b>
              <p>{d.provider}</p>
              <span className="pd-ds-open">원본 열기 ↗</span>
            </div>
            <span className="pd-fmt-badge">{d.format}</span>
          </a>
        ))}
      </div>

      <div className="px-bottomcta">
        <button className="btn lg" type="button" onClick={onCompare}>
          우리 문서와 비교
        </button>
        <button className="btn primary grow lg" type="button" onClick={onToReport}>
          이 데이터로 보고서 만들기
        </button>
      </div>
    </>
  )
}
