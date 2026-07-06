// AI 백엔드 라벨 판별 — 응답의 backend 값이 'MOCK'(가짜 폴백)이 아니면 실제 AI 생성물.
// 실제 백엔드는 GEMINI / OPENAI / GEMINI_WEB / GEMINI_TEMPLATE 등 다양하므로
// 특정 값 비교(=== 'GEMINI') 대신 "MOCK 이 아님"으로 판별한다(OpenAI 도 실제로 인정).
export const isRealAI = (backend) => !!backend && backend !== 'MOCK'
