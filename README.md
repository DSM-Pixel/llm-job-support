# llm-job-support

지엔소프트(주) × 유클리드소프트 「프로젝트형 청년 일경험」 멀티모달 AI 프로젝트 워크스페이스.

VLM · SAM · YOLOe · LLM · Hybrid RAG · AI Agent를 결합해
**자연어 질의 → 이미지 이해/검색/요약/보고서 생성** 서비스의
기획안과 기능별 프로토타입을 8주 동안 만들어냅니다.

> 자세한 컨텍스트와 컨벤션은 [CLAUDE.md](./CLAUDE.md)를 보세요.

## 빠른 시작

```bash
# 1) 가상환경 + 의존성
uv sync --extra dev --extra demo

# 2) 환경변수
cp .env.example .env
# .env 에 ANTHROPIC_API_KEY, DATA_GO_KR_KEY 등을 채우기

# 3) Claude Code 띄우기
claude
```

세션이 시작되면 `SessionStart` 훅이 현재 브랜치/팀/프로토타입 현황을 알려줍니다.

## 자주 쓰는 Claude Code 명령

| 명령 | 용도 |
|------|------|
| `/team-init <팀명>` | 새 팀 워크스페이스 생성 |
| `/prototype-scaffold` | Gradio/FastAPI 데모 1파일 생성 |
| `/planning-report` | 기획 보고서/기능 정의서/발표자료 초안 |
| `/run` | 만든 앱을 띄워 동작 확인 |

## 자주 호출하는 subagent

| 에이전트 | 용도 |
|----------|------|
| `vlm-researcher` | Qwen2-VL/SAM/YOLOe 등 모델 후보 비교 |
| `rag-architect` | Hybrid RAG 파이프라인 설계 |
| `prototype-builder` | Gradio/FastAPI 데모 1파일 코드 |
| `public-data-finder` | data.go.kr 데이터셋/API 연계 |
| `planning-writer` | 한국어 기획서/발표자료 작성 |

## 디렉터리

```
.
├── CLAUDE.md           # 프로젝트 컨텍스트 (반드시 먼저 읽기)
├── pyproject.toml      # uv 기반
├── .claude/            # 하네스: settings/agents/skills/hooks
├── backend/            # 통합 FastAPI 서버 (web/ 서빙 + /api/*)
├── web/                # 통합 웹 UI (대시보드/라벨링/질의/RAG/보고서)
├── docs/               # 기획 보고서, 설계안, 발표자료, 작업노트
├── prototypes/         # 기능별 데모 (Gradio 원형)
├── teams/              # 팀별 작업 공간
└── data/               # 샘플 데이터 (대용량 제외)
```
