// 예시 절차(포트홀 신고 처리 5단계) — 목표를 입력해 "계획 만들기" 전까지 보여줄 기본 시나리오.
// 실제 절차는 /api/agent/plan 이 설계해 반환한다(WorkflowPage 참조).
export const EXAMPLE_STEPS = [
  {
    n: 1,
    title: '신고 사진 라벨링',
    desc: '접수된 사진에서 파손 위치와 종류를 확정합니다.',
    tag: '사진 라벨링',
    route: 'labeling.html',
    actionLabel: '라벨링 열기',
  },
  {
    n: 2,
    title: '위험도 판단',
    desc: '보수 시급도를 사진별로 나눠 우선순위를 정합니다.',
    tag: '사진 설명',
    route: 'photo.html',
    actionLabel: '분석 열기',
  },
  {
    n: 3,
    title: '사고 데이터 대조',
    desc: '같은 구간의 사고 이력을 확인해 근거를 보강합니다.',
    tag: '공공데이터',
    route: 'pubdata.html',
    actionLabel: '데이터 열기',
  },
  {
    n: 4,
    title: '보수 기준 확인',
    desc: '내부 지침에서 해당 파손의 처리 기준을 찾습니다.',
    tag: '문서 검색',
    route: 'rag.html',
    actionLabel: '검색 열기',
  },
  {
    n: 5,
    title: '처리 보고서 작성',
    desc: '앞 단계 결과를 근거로 붙여 보고서를 만듭니다.',
    tag: '보고서',
    route: 'report.html',
    actionLabel: '보고서 열기',
  },
]

export const EXAMPLE_TITLE = '포트홀 신고 접수부터 보고까지 처리하기'
