// 대화창 인사말(intro) — 저장하지 않는 고정 메시지. 바닐라 ensureChat 의 intro 동일.
// 도구 버튼 클릭 시 지정된 프롬프트를 입력창에 넣는다(data-prompt 재현).
export default function IntroMessage({ onPick }) {
  return (
    <div className="message assistant intro">
      <div className="message-avatar">AI</div>
      <div className="message-body">
        <p>안녕하세요. 도로 파손 분석, 공공데이터 검색, 보고서 생성, 이미지 라벨링 업무를 자연어로 도와드릴 수 있습니다.</p>
        <div className="message-tools">
          <button type="button" onClick={() => onPick('포트홀 영역을 찾아줘')}>이미지 분석</button>
          <button type="button" onClick={() => onPick('도로 파손 신고 현황을 요약해줘')}>데이터 요약</button>
          <button type="button" onClick={() => onPick('최근 3년 도로 파손 현황 보고서를 만들어줘')}>보고서 생성</button>
        </div>
      </div>
    </div>
  )
}
