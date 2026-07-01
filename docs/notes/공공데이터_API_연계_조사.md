# 공공데이터포털(data.go.kr) API 연계 조사

> 조사일: 2026-07-01
> 목적: `backend/pubdata/registry.py` 의 각 데이터셋 `live` 설정을 실제 엔드포인트로 채우기 위한 근거.
> 상태: 서비스키(`DATA_GO_KR_KEY`) 미등록이라 실호출 검증은 못 함 — 키 확보 시 아래대로 채우면 됨.

## 활성화 방법 (키 확보 후)

1. data.go.kr 회원가입 → 각 데이터셋 페이지에서 **활용신청**(자동승인, 개발계정).
2. 발급된 **일반 인증키**를 `prototypes/api-test/.env` 에 `DATA_GO_KR_KEY=...` 로 추가.
3. `registry.py` 데이터셋의 `live` 에 endpoint/params/mapping 을 채운다(아래 표).
4. 서버 재시작 후 저장소 재적재: `python -c "from backend.pubdata import ingest; ingest.ingest_all()"`.
   → `stats.sample` 이 `false`(실데이터)로 바뀐다.

주의: `apis.data.go.kr` 계열은 **인코딩된 서비스키**를, 일부 SDK/요청은 디코딩키를 요구한다.
`requests` 의 params 로 넘기면 자동 인코딩되므로 **디코딩키(원본)** 를 쓰는 편이 안전하다.

---

## 1. 교통사고 다발지역 — ✅ 배선 완료

- 데이터셋: 한국도로교통공단_지자체별 교통사고 다발지역 (서비스 B552061)
- 페이지: https://www.data.go.kr/data/15057467/openapi.do
- endpoint: `http://apis.data.go.kr/B552061/frequentzoneLg/getRestFrequentzoneLg`
- 필수 params: `searchYearCd`(연도), `siDo`(시도 법정동코드), `guGun`(시군구 코드), `numOfRows`, `pageNo`, `type=json`
- rows_path: `response.body.items.item`
- mapping: dim=`sido_sgg_nm`(지역명), value=`occrrnc_cnt`(발생건수) · 그 외 `spot_nm/caslt_cnt/la_crd/lo_crd`
- 형식: JSON/XML 선택
- 주의: 응답이 **지점 단위** → registry 에서 `aggregate:"sum"` 으로 지역 합산. 여러 지역 비교는 siDo/guGun 코드별 반복 호출로 확장 필요.

## 2. 기상(ASOS) — △ 부분 확인

- 데이터셋: 기상청_지상(종관, ASOS)기상관측자료 조회서비스
- 페이지: https://www.data.go.kr/data/15059218/openapi.do
- 확인된 오퍼레이션: 적설 `http://apis.data.go.kr/1360000/SfcInfoService/getSnowCover`
  (params: ServiceKey, pageNo, numOfRows, dataType, stnId, time=YYYYMMDD)
- 월별 강수/기온 통계 오퍼레이션·필드명은 **불확실** — 활용가이드 docx 확인 필요.
- 대안: 지상(ASOS) 일자료 조회서비스(15059093)로 일자료를 받아 월 합산.

## 3. 전국 CCTV 표준데이터 — △ CSV 방식

- 데이터셋: 전국CCTV표준데이터
- 페이지: https://www.data.go.kr/data/15013094/standard.do
- 제공: **CSV 파일 다운로드** (오픈API 아님) — `https://file.localdata.go.kr/file/cctv_info/info`
- 필드: 관리기관명, 설치위치, 설치목적, 카메라대수, 위·경도, 화소수, 촬영방면, 설치연월 등
- 주의: 현재 어댑터는 JSON REST 전용 → **CSV 어댑터 추가** 필요(pandas 로 시군구별 카메라대수 집계).

## 4. 도로 파손/포트홀 — ✗ 표준 오픈API 불명확

- 표준화된 전국 단위 오픈API를 찾지 못함. 후보:
  - 안전신문고(행정안전부) 신고 데이터 — 오픈API 제공 형태 확인 필요.
  - 지자체별 도로보수 실적은 파일데이터(CSV) 위주.
- 당분간 시드 유지. 실데이터는 지자체 CSV 수집 또는 도로공사 API 확인 후 연계.

---

## 참고

- Sources:
  - [지자체별 교통사고 다발지역](https://www.data.go.kr/data/15057467/openapi.do)
  - [ASOS 기상관측자료 조회서비스](https://www.data.go.kr/data/15059218/openapi.do)
  - [전국CCTV표준데이터](https://www.data.go.kr/data/15013094/standard.do)
- 어댑터 확장 여지: CSV 파일데이터 어댑터, 응답 페이지네이션 누적, 지역 코드 반복 호출.
