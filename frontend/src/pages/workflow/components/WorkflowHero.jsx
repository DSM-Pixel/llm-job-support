// 히어로 — 목표 한 줄 입력 + 예시 칩 + [계획 만들기]. 목업의 보라 톤 큰 헤드라인 재현.
// 이 페이지는 고정 시나리오(포트홀 신고 처리) 데모라, 계획 만들기는 진행 상태만 초기화한다(MOCK).

const CHIPS = ['포트홀 신고 처리', '가드레일 점검 절차', '보수 기준 검토']

// props: goal, setGoal, onPlan(value?)
export default function WorkflowHero({ goal, setGoal, onPlan }) {
  return (
    <div className="px-hero plain wf-hero">
      <div>
        <p className="wf-hero-eyebrow">WORKFLOW PLANNING</p>
        <h2>
          무엇을 하려는지
          <br />한 줄로 적어주세요
        </h2>
        <div className="wf-input-row">
          <input
            className="wf-input"
            value={goal}
            placeholder="예: 포트홀 신고 접수부터 보고까지 처리하기"
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onPlan()}
          />
          <button className="btn primary lg" type="button" onClick={() => onPlan()}>
            계획 만들기
          </button>
        </div>
        <div className="wf-chips">
          {CHIPS.map((c) => (
            <button key={c} className="wf-chip" type="button" onClick={() => onPlan(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
