// 상단 입력 카드 — 목표 입력 + 예시 칩. 바닐라 .ag-intro 마크업/클래스 그대로.

// 예시 칩 — 바닐라와 동일 문구/순서. 클릭 시 그 문구로 즉시 설계.
const CHIPS = [
  '포트홀 신고가 접수됐는데 어떻게 처리하지?',
  '이번 분기 도로 파손 현황을 보고서로 만들어줘',
  '가드레일 안전점검 절차 알려줘',
  '시설물 위험등급 데이터로 우선 보수 대상 뽑아줘',
]

// props: goal, setGoal, onPlan(value?), busy
export default function AgentIntro({ goal, setGoal, onPlan, busy }) {
  return (
    <div className="ag-intro card">
      <label className="ag-label">
        <span>✦</span>무엇을 처리할까요?
      </label>
      <p className="ag-sub">
        목표를 자연어로 적으면 AI 에이전트가 <b>업무 절차</b>를 설계하고, 각 단계를 해당 기능으로
        연결해 드립니다.
      </p>
      <div className="ag-input-line">
        <input
          className="ag-input"
          value={goal}
          placeholder="예: 이번 분기 도로 파손 현황을 보고서로 만들어줘"
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onPlan()}
        />
        <button
          className={'btn primary ag-go' + (busy ? ' is-loading' : '')}
          type="button"
          disabled={busy}
          onClick={() => onPlan()}
        >
          {busy ? '설계 중' : '→ 절차 설계'}
        </button>
      </div>
      <div className="ag-chips">
        {CHIPS.map((c) => (
          <button key={c} className="ag-chip" type="button" onClick={() => onPlan(c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
