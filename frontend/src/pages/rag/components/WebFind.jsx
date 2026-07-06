import { useEffect, useState } from 'react'

// 웹에서 찾아 넣기 — 키워드 검색 후 결과를 체크박스로 보여주고, 선택한 것만 색인에 추가.
export default function WebFind({ webResults, webBusy, onSearch, addBusy, onAdd }) {
  const [keyword, setKeyword] = useState('포트홀 도로 보수 기준')
  const [checked, setChecked] = useState([])

  // 새 결과가 오면 모두 선택된 상태로 초기화(바닐라 checkbox checked 기본값).
  useEffect(() => {
    setChecked((webResults || []).map(() => true))
  }, [webResults])

  const toggle = (i) => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  const add = () => onAdd((webResults || []).filter((_, i) => checked[i]))

  return (
    <section className="kb-section">
      <h3>
        <span>◉</span>웹에서 찾아 넣기
      </h3>
      <div className="search-line">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <button className={webBusy ? 'is-loading' : ''} disabled={webBusy} onClick={() => onSearch(keyword)}>
          {webBusy ? '검색 중' : '검색'}
        </button>
      </div>
      <div className="web-results">
        {webResults &&
          webResults.map((r, i) => (
            <label className="web-item" key={i}>
              <input type="checkbox" checked={checked[i] ?? false} onChange={() => toggle(i)} />
              <div>
                <b>{r.title}</b>
                <small>{r.url}</small>
                <p>{r.snippet}</p>
              </div>
            </label>
          ))}
        {webResults && (
          <button
            className={'btn primary add-web' + (addBusy ? ' is-loading' : '')}
            type="button"
            disabled={addBusy}
            onClick={add}
          >
            {addBusy ? '추가 중' : '선택한 문서 색인에 추가'}
          </button>
        )}
      </div>
    </section>
  )
}
