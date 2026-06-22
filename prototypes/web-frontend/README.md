# web-frontend — 서비스 프론트 퍼블리싱 시안

GNSoft AI 서비스 전체 화면(6개)의 정적 HTML/CSS/JS 퍼블리싱 시안.
출처: [hachaeeun/ABC-project](https://github.com/hachaeeun/ABC-project) 프론트 퍼블리싱 결과물을 가져옴.

Gradio 백엔드 프로토타입(`api-test`, `image-understanding`, `rag-search`)과 화면이 1:1로 대응되는,
디자인·화면 흐름 확인용 정적 시안입니다. (아직 백엔드 미연결 — 더미 동작)

## 화면 구성

| 파일 | 화면 | 대응 백엔드 프로토타입 |
|------|------|------------------------|
| `HTML/dashboard.html` | 메인 대시보드 | `image-understanding/stats.py` |
| `HTML/query.html` | 자연어 질의 | `rag-search` |
| `HTML/rag.html` | RAG 공공데이터 검색 | `rag-search` |
| `HTML/labeling.html` | 이미지 분석·라벨링 | `image-understanding` |
| `HTML/report.html` | 요약·보고서 생성 | (보고서 자동화 과제) |
| `HTML/data.html` | 데이터 관리 | `image-understanding/dataset.py` |

> 각 HTML은 동일 베이스명의 `CSS/<name>.css`, `JS/<name>.js`를 사용합니다
> (예: `dashboard.html` → `CSS/dashboard.css`, `JS/dashboard.js`). 공통은 `common.*`.

- `CSS/` — 화면별 스타일 + `common.css`(공통)
- `JS/` — 화면별 스크립트 + `common.js`(공통)
- 각 HTML은 `../CSS/`, `../JS/`를 상대경로로 참조하므로 폴더 구조를 유지해야 링크가 동작합니다.

## 띄우기

정적 파일이라 별도 빌드가 필요 없습니다. 로컬 서버로 띄우면 됩니다.

```bash
# 이 폴더에서 실행
cd prototypes/web-frontend
python -m http.server 8000
```

브라우저에서 http://localhost:8000 접속 → `index.html`이 메인 대시보드로 자동 이동합니다.

> 파일을 직접 더블클릭(file://)해도 열리지만, 일부 브라우저에서 상대경로/스크립트가
> 막힐 수 있으니 위 로컬 서버 방식을 권장합니다.

## TODO (백엔드 연결)

- [ ] 자연어 질의 / RAG 화면 → `rag-search/app.py` API 연동
- [ ] 이미지 라벨링 화면 → `image-understanding` 라벨링/탐지 API 연동
- [ ] 보고서 화면 → 요약·보고서 생성 파이프라인 연결
