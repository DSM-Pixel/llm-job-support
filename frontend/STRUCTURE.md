# frontend 구조 규약

바닐라 JS(web/)를 React+Vite 멀티페이지로 이관하는 프로젝트. 아래 규약을 **모든 페이지가 동일하게** 따른다.

## 디렉터리

```
frontend/
  <page>.html               # 페이지별 Vite 엔트리(루트). <head> 테마 init + #root + entry.jsx 로드
  vite.config.js            # build.rollupOptions.input 에 페이지별 엔트리 등록 + /api 프록시
  src/
    lib/                    # 프레임워크 무관 공용 헬퍼(순수 함수/부수효과)
      api.js  toast.js  time.js  storage.js  activity.js
    shell/                  # 프로젝트 내부 페이지 공용 셸
      AppShell.jsx  Sidebar.jsx  SettingsModal.jsx  HistoryModal.jsx  AiDock.jsx  ShellContext.js
    components/             # 페이지 간 공용 UI 프리미티브
      Modal.jsx (InputModal·ConfirmModal)  Pager.jsx  ...
    pages/<page>/
      entry.jsx             # 가드(auth/project) + CSS import + 마운트. 얇게.
      <Page>Page.jsx        # 최상위 페이지 = '조합'만. 얇게(대략 <150줄).
      components/           # 이 페이지 전용 컴포넌트(관심사별 분할)
      <page>Api.js          # 이 페이지 전용 API 호출/데이터 로직(선택)
      use<X>.js             # 이 페이지 전용 커스텀 훅(선택)
    styles/
      <page>.css            # web/assets/css/<page>.css 를 복사(룩 패리티)
```

## 원칙

1. **페이지 컴포넌트는 얇게** — 상태 배선 + 하위 컴포넌트 조합만. UI 덩어리는 `components/`로 분할.
2. **파일 크기 250줄 이하 지향**. 넘으면 관심사로 쪼갠다.
3. **공용 UI는 `src/components/`**, 공용 로직은 `src/lib/`, 셸은 `src/shell/`. 페이지 전용은 그 페이지 폴더 안에만.
4. **데이터 로직 분리** — fetch/가공은 `<page>Api.js` 또는 커스텀 훅으로. 컴포넌트는 렌더에 집중.
5. **localStorage 키·CSS 클래스는 바닐라와 동일** — 공존 이관 + 룩/동작 패리티. 동작은 bug-for-bug 재현.
6. **스타일 규칙**: 함수형 컴포넌트 + 훅, 2-space, 한글 주석, 공개 함수만 필요시 주석. React가 자동 이스케이프(수동 esc 불필요).

## 가드(entry.jsx)

- 내부 페이지(dashboard/query/rag/pubdata/labeling/report/data/agent): 미로그인→`login.html`, 프로젝트 미선택→`projects.html`.
- projects: 미로그인→`login.html`, 슈퍼→`admin.html`.
- admin: 미로그인→`login.html`.
- login/reset: 로그인돼 있으면→`projects.html`(login), reset 은 토큰 파라미터로 동작.

## 참고 구현(골드 스탠다드)

`src/pages/dashboard/`(셸 사용 + 카드별 분할)와 `src/pages/projects/`(공용 Modal/Pager + ProjectCard/DetailView 분할)를 새 페이지의 본보기로 삼는다.
