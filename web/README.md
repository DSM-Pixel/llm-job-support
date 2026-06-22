# GNSoft AI 플랫폼 (web)

지엔소프트 AI 업무 지원 플랫폼의 정적 프로토타입 UI. 순수 HTML/CSS/JS 멀티페이지 구성이며,
디자인은 기존 버전과 동일하게 유지하고 디렉터리 구조만 정리한 브랜치입니다.

## 시작하기

`index.html`을 브라우저로 열면 메인 대시보드로 이동합니다. (별도 빌드/의존성 없음)

정적 서버로 띄우려면:

```bash
python -m http.server 8000
# http://localhost:8000  접속
```

## 디렉터리 구조

```
.
├── index.html              # 진입점 — pages/dashboard.html 로 리다이렉트
├── pages/                  # 페이지별 HTML
│   ├── dashboard.html      # 메인 대시보드
│   ├── query.html          # 자연어 질의
│   ├── rag.html            # RAG 공공데이터 검색
│   ├── labeling.html       # 이미지 분석·라벨링
│   ├── report.html         # 요약·보고서 생성
│   └── data.html           # 데이터 관리
└── assets/
    ├── css/                # common.css + 페이지별 스타일
    └── js/                 # common.js + 페이지별 스크립트
```

## 페이지 ↔ 리소스 매핑

| 페이지 | HTML | CSS | JS |
| --- | --- | --- | --- |
| 메인 대시보드 | `pages/dashboard.html` | `assets/css/dashboard.css` | `assets/js/dashboard.js` |
| 자연어 질의 | `pages/query.html` | `assets/css/query.css` | `assets/js/query.js` |
| RAG 검색 | `pages/rag.html` | `assets/css/rag.css` | `assets/js/rag.js` |
| 이미지 라벨링 | `pages/labeling.html` | `assets/css/labeling.css` | `assets/js/labeling.js` |
| 보고서 생성 | `pages/report.html` | `assets/css/report.css` | `assets/js/report.js` |
| 데이터 관리 | `pages/data.html` | `assets/css/data.css` | `assets/js/data.js` |

모든 페이지는 `assets/css/common.css` 와 `assets/js/common.js` 를 공통으로 사용합니다.
