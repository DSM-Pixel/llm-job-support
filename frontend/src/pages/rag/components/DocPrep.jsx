// 문서 준비 — 샘플 토글 · 내 문서 선택(스테이징) · 색인/선택취소 · 색인 상태.
export default function DocPrep({
  samplesOff,
  onToggleSamples,
  staged,
  uploadRef,
  onUploadChange,
  onIndex,
  indexBusy,
  onClearStaged,
  indexedText,
}) {
  return (
    <section className="kb-section">
      <h3>
        <span>1</span>문서 준비
      </h3>
      <div
        className="toggle-row"
        title="켜면 도로·포트홀·시설물 기본 샘플 문서를 검색 대상(근거)에 포함합니다"
      >
        <div>
          <b>샘플 점검 문서 사용</b>
          <p>기본 제공 문서를 검색 근거에 포함</p>
        </div>
        <span className={'switch' + (samplesOff ? ' off' : '')} onClick={onToggleSamples}></span>
      </div>
      <label className="upload card">
        <input
          ref={uploadRef}
          type="file"
          className="upload-input"
          multiple
          accept=".txt,.md,.pdf"
          onChange={onUploadChange}
        />
        <span className="upload-icon">⇧</span>
        <b>{staged.length ? `${staged.length}개 문서 선택됨` : '내 문서 선택'}</b>
        <small>txt · md · pdf</small>
      </label>
      <div className="staged-files" hidden={staged.length === 0}>
        {staged.length ? (
          <>
            <b>선택됨 {staged.length}개</b> — {staged.map((d) => d.name).join(', ')}
          </>
        ) : (
          ''
        )}
      </div>
      <div className="index-actions">
        <button
          className={'btn primary index-btn' + (indexBusy ? ' is-loading' : '')}
          title="선택한 문서를 참고중인 파일(검색 근거)에 추가합니다"
          disabled={indexBusy}
          onClick={onIndex}
        >
          {indexBusy ? '색인 중' : '문서 색인'}
        </button>
        <button
          className="btn flat stage-clear"
          title="아직 색인하지 않은 선택만 취소합니다(참고중인 파일은 그대로)"
          onClick={onClearStaged}
        >
          선택 취소
        </button>
      </div>
      <p className="kb-help">
        문서를 <b>선택</b>한 뒤 <b>문서 색인</b>을 눌러야 ‘참고중인 파일’에 추가됩니다.
        <b>선택 취소</b>는 색인 전 선택만 비웁니다.
      </p>
      <div className="indexed">{indexedText}</div>
    </section>
  )
}
