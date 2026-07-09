// 검색 결과 — AI 요약 + 관련 데이터셋(바닐라 render/renderDatasets 재현).
// (막대차트는 실데이터 미연계로 가짜 수치라 제거 — 실제 데이터셋 링크만 남긴다.)
// React 가 텍스트를 자동 이스케이프하므로 바닐라의 escapeHtml 은 불필요.
import { isRealAI } from '../../../lib/aiBackend.js'

export default function PdResult({ data, onToReport }) {
  return (
    <div className="pd-result">
      <div className="pd-summary card">
        <div className="pd-summary-head">
          <h3>
            ✣ AI 통계 요약{' '}
            <span className="pd-badge">{isRealAI(data.summary_backend) ? 'AI 생성' : '템플릿'}</span>
          </h3>
          <span className="pd-domain">{data.domain}</span>
        </div>
        <p className="pd-summary-text">{data.summary}</p>
        <ul className="pd-insights">
          {(data.insights || []).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
        <div className="pd-summary-actions">
          <button
            className="btn flat pd-to-report"
            type="button"
            title="이 통계 요약을 보고서 초안으로 보냅니다"
            onClick={onToReport}
          >
            보고서로 보내기 →
          </button>
          <a className="btn flat pd-portal" href={data.portal_url} target="_blank" rel="noopener">
            data.go.kr에서 열기 ↗
          </a>
        </div>
      </div>

      <div className="pd-datasets">
        <h2 className="section-title">
          ▤ 관련 공공데이터셋 <small>{(data.datasets || []).length} sets · data.go.kr</small>
        </h2>
        <div className="pd-ds-list">
          {(data.datasets || []).map((d, i) => (
            <a className="pd-ds card" key={i} href={d.url} target="_blank" rel="noopener">
              <div className="pd-ds-main">
                <b>{d.title}</b>
                <p>{d.provider} 제공</p>
              </div>
              <div className="pd-ds-meta">
                <span className="pd-tag">{d.category}</span>
                <span className="pd-fmt">{d.format}</span>
              </div>
              <span className="pd-ds-open">↗</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
