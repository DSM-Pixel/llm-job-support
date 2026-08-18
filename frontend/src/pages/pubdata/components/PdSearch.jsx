import { useRef } from 'react'

// 검색 박스 — 큰 제목 + 입력창 + 데이터셋 칩(바닐라 .pd-search 재현, 목업 스타일로 재배치).
// CHIPS 는 registry 가 매칭하는 도메인 키워드와 맞춘 예시 — 눌러도 바로 그 키워드로 검색된다.
const CHIPS = ['교통사고 다발지역', 'CCTV 이상행동', '시설물 안전점검', '포트홀 도로 파손']

export default function PdSearch({ keyword, setKeyword, busy, catalog, onSearch }) {
  const inputRef = useRef(null)

  return (
    <>
      <div className="pd-search-row">
        <input
          ref={inputRef}
          className="pd-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="예: 교통사고 다발지역 알려줘"
        />
        <button
          className={'btn primary lg pd-go' + (busy ? ' is-loading' : '')}
          type="button"
          disabled={busy}
          onClick={() => onSearch()}
        >
          {busy ? '찾는 중' : '찾아보기'}
        </button>
      </div>
      <div className="pd-chips">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            className={'pill pd-chip' + (keyword.trim() === chip ? ' active' : '')}
            type="button"
            onClick={() => onSearch(chip)}
          >
            <i className="pd-dot" aria-hidden="true" />
            {chip}
          </button>
        ))}
        <button
          className="pill pd-chip-add"
          type="button"
          title="직접 입력"
          onClick={() => inputRef.current?.focus()}
        >
          ＋
        </button>
      </div>
      <p className="pd-catalog">{catalog}</p>
    </>
  )
}
