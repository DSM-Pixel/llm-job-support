// 상단 검은 히어로 — 설명(제목·안내·기능 포인트)만. 입력 폼은 ReportForm(오른쪽 사이드)이 맡는다.
export default function ReportHero() {
  return (
    <div className="px-hero plain rp-hero">
      <p className="rp-eyebrow">REPORT BUILDER</p>
      <h2>
        간단한 명령어로
        <br />
        <span className="accent">보고서 작성하기</span>
      </h2>
      <p className="rp-hero-desc">
        기간과 양식만 고르면, 내 활동·검색 결과·첨부 자료를 모아 AI가 제출용 초안을 자동으로 작성합니다.
        오른쪽에서 옵션을 정하고 <b>‘초안 만들기’</b>를 눌러보세요.
      </p>
      <ul className="rp-hero-points">
        <li>활동 요약·통계 표 자동 집계</li>
        <li>근거 자료(사진·문서 검색) 함께 첨부</li>
        <li>복사 · PDF · DOCX 내보내기</li>
      </ul>
    </div>
  )
}
