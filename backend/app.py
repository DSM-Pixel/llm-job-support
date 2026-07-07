"""GNSoft AI 플랫폼 통합 FastAPI 앱.

실행:
    uv pip install -e ".[web]"      # 또는: pip install fastapi "uvicorn[standard]"
    uvicorn backend.app:app --reload
    → http://localhost:8000  (web/ UI + /api)

구조:
    - /api/*           : 업무 엔드포인트 (현재 services.py 의 MOCK 사용)
    - /                : web/ 정적 프론트엔드 (index.html → pages/dashboard.html)
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import activity, admin, auth, cache, projects, services, yolo_service

# 서빙할 정적 프론트 디렉터리. 우선순위:
#   1) 환경변수 WEB_DIR (명시 지정)
#   2) web/react/  — React 빌드본(레포에 커밋). 있으면 React 앱을 서빙(컷오버 완료 상태)
#   3) web/        — 바닐라(폴백). web/react 를 지우면 즉시 바닐라로 롤백된다.
_web_env = os.environ.get("WEB_DIR")
_default_web = Path(__file__).resolve().parent.parent / "web"
_react_build = _default_web / "react"
if _web_env and Path(_web_env).is_dir():
    WEB_DIR = Path(_web_env)
elif _react_build.is_dir():
    WEB_DIR = _react_build
else:
    WEB_DIR = _default_web

app = FastAPI(title="GNSoft AI 플랫폼", version="0.1.0")


_CACHEABLE_EXT = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2")


@app.middleware("http")
async def no_cache(request, call_next):
    """시연/개발 중 브라우저가 옛 정적 파일(JS/CSS/HTML)을 그대로 쓰지 않도록
    매 요청 재검증을 요구한다. (ETag와 함께 동작 — 안 바뀌었으면 304)

    단, 이미지·폰트 등 안 바뀌는 자원은 캐시를 허용한다. 매 화면 전환마다
    로고가 재요청되며 잠깐 '흰 박스'로 깜빡이던 문제를 막는다.
    """
    response = await call_next(request)
    if request.url.path.lower().endswith(_CACHEABLE_EXT):
        response.headers["Cache-Control"] = "public, max-age=86400"
    else:
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response


# ── 요청 스키마 ──────────────────────────────────────────────────────
class QueryIn(BaseModel):
    question: str


class RagSearchIn(BaseModel):
    query: str
    top_k: int = 4
    project: str = ""


class RagIndexIn(BaseModel):
    docs: list[dict] = []
    sources: list[str] = []
    use_samples: bool = True
    project: str = ""


class DetectIn(BaseModel):
    preset: str = "도로 파손/포트홀 찾기"
    custom_prompt: str = ""
    min_conf: int = 0
    image_name: str = ""


class ReportIn(BaseModel):
    report_type: str = "현황 분석"
    period: str = "최근 3년"
    sources: list[str] = []
    include_chart: bool = True


class ReportWebIn(BaseModel):
    report_type: str = "현황 분석"
    period: str = "최근 3년"
    sources: list[str] = []
    query: str = ""
    include_chart: bool = True


class ReportFromRagIn(BaseModel):
    question: str = ""
    answer: str = ""
    sources: list[dict] = []
    report_type: str = "현황 분석"
    period: str = "최근 3년"
    include_chart: bool = True


class ReportActivityIn(BaseModel):
    activities: list[dict] = []
    start: str = ""
    end: str = ""
    report_type: str = "활동 요약"
    include_chart: bool = True


class ReportReviseIn(BaseModel):
    content: str = ""
    instruction: str = ""


class UploadIn(BaseModel):
    name: str = ""


class WebSearchIn(BaseModel):
    keyword: str = ""


class RagRemoveIn(BaseModel):
    source: str = ""
    project: str = ""


class RagSamplesIn(BaseModel):
    on: bool = True
    project: str = ""


class AskContextIn(BaseModel):
    context: str = ""
    question: str = ""


class SaveLabelsIn(BaseModel):
    image_name: str = ""
    label_count: int = 0


class PubDataIn(BaseModel):
    keyword: str = ""


class AgentPlanIn(BaseModel):
    goal: str = ""


class AgentRunIn(BaseModel):
    goal: str = ""
    project: str = ""


class ProjectCreateIn(BaseModel):
    token: str = ""
    name: str = ""
    emoji: str = "📁"
    visibility: str = "team"  # 'team'(팀 공유) | 'private'(개인 — 검수자·대표만 열람)


class SourceAddIn(BaseModel):
    name: str = ""
    kind: str = "문서"


class ReviewIn(BaseModel):
    token: str = ""
    source_id: str = ""
    status: str = "대기"
    reviewer: str = ""


class SignupIn(BaseModel):
    email: str = ""
    password: str = ""
    name: str = ""
    company: str = ""
    team: str = ""
    agree_terms: bool = False
    agree_privacy: bool = False
    agree_marketing: bool = False
    company_id: str = ""
    admin_request: bool = False


class VerifyIn(BaseModel):
    email: str = ""
    code: str = ""


class ResendIn(BaseModel):
    email: str = ""


class LoginIn(BaseModel):
    email: str = ""
    password: str = ""


class TokenIn(BaseModel):
    token: str = ""


class ProfileUpdateIn(BaseModel):
    token: str = ""
    name: str = ""
    team: str = ""


class ResetRequestIn(BaseModel):
    email: str = ""


class ResetPasswordIn(BaseModel):
    token: str = ""
    password: str = ""


class ActivityLogIn(BaseModel):
    token: str = ""
    project: str = ""
    type: str = ""
    label: str = ""
    page: str = ""
    ts: float | None = None


class ArtifactIn(BaseModel):
    token: str = ""
    project: str = ""
    id: str = ""
    kind: str = ""
    title: str = ""
    page: str = ""
    ts: float | None = None


class ActivitySyncIn(BaseModel):
    token: str = ""
    project: str = ""
    activities: list[dict] = []
    artifacts: list[dict] = []


class DashStatsIn(BaseModel):
    token: str = ""
    project: str = ""


class AdminTokenIn(BaseModel):
    token: str = ""


class AdminMembersIn(BaseModel):
    token: str = ""
    page: int = 1
    page_size: int = 20


class AdminMemberIn(BaseModel):
    token: str = ""
    user_id: str = ""


class AdminStatusIn(BaseModel):
    token: str = ""
    user_id: str = ""
    active: bool = True


class AdminRequestIn(BaseModel):
    token: str = ""
    user_id: str = ""
    approve: bool = True


class AdminReviewerIn(BaseModel):
    token: str = ""
    user_id: str = ""
    is_reviewer: bool = True


# ── API 라우트 ───────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "backend": services.BACKEND}


# ── 인증(로그인·회원가입) ────────────────────────────────────────────
@app.post("/api/auth/signup")
def auth_signup(body: SignupIn) -> dict:
    """회원가입 1단계 — 검증 후 이메일 인증 코드 발송(계정은 인증 후 생성)."""
    return auth.start_signup(
        body.email,
        body.password,
        body.name,
        body.company,
        body.team,
        body.agree_terms,
        body.agree_privacy,
        body.agree_marketing,
        body.company_id,
        body.admin_request,
    )


@app.post("/api/auth/verify-signup")
def auth_verify_signup(body: VerifyIn) -> dict:
    """회원가입 2단계 — 이메일 인증 코드 확인 후 계정 생성 + 자동 로그인."""
    return auth.verify_signup(body.email, body.code)


@app.post("/api/auth/resend-code")
def auth_resend_code(body: ResendIn) -> dict:
    """이메일 인증 코드 재발송."""
    return auth.resend_code(body.email)


@app.post("/api/auth/email/send")
def auth_email_send(body: ResendIn) -> dict:
    """가입 폼 '인증하기' — 이메일로 인증 코드 발송(이메일만 필요)."""
    return auth.request_email_code(body.email)


@app.post("/api/auth/email/confirm")
def auth_email_confirm(body: VerifyIn) -> dict:
    """인증 모달 — 코드 확인 후 이메일을 '인증됨'으로 표시."""
    return auth.confirm_email_code(body.email, body.code)


@app.post("/api/auth/register")
def auth_register(body: SignupIn) -> dict:
    """최종 회원가입 — 이메일 인증이 끝난 경우에만 계정 생성 + 자동 로그인."""
    return auth.register(
        body.email,
        body.password,
        body.name,
        body.company,
        body.team,
        body.agree_terms,
        body.agree_privacy,
        body.agree_marketing,
        body.company_id,
        body.admin_request,
    )


@app.get("/api/companies")
def companies(q: str = "") -> dict:
    """등록된 회사 검색 — 직원 회원가입 시 선택 목록(오타 방지)."""
    return {"companies": auth.search_companies(q)}


@app.get("/api/companies/teams")
def company_teams(company_id: str = "", token: str = "") -> dict:
    """회사의 기존 팀 목록 — 가입/프로필에서 팀을 목록에서 고르게(오타·불일치 방지).

    company_id 를 직접 주거나(가입 시 선택한 회사), token 으로 내 회사를 유추한다.
    """
    cid = (company_id or "").strip()
    if not cid and token:
        cid = (auth.session_user(token) or {}).get("company_id") or ""
    return {"teams": auth.teams_for_company(cid)}


@app.post("/api/auth/login")
def auth_login(body: LoginIn) -> dict:
    return auth.login(body.email, body.password)


@app.post("/api/auth/me")
def auth_me(body: TokenIn) -> dict:
    """세션 토큰 검증 — 유효하면 사용자 정보."""
    return auth.me(body.token)


@app.post("/api/auth/profile")
def auth_profile(body: ProfileUpdateIn) -> dict:
    """내 프로필(이름·팀) 수정 — 본인 세션만. 팀은 프로젝트 팀 공유 스코프 기준값."""
    return auth.update_profile(body.token, body.name, body.team)


@app.post("/api/auth/logout")
def auth_logout(body: TokenIn) -> dict:
    return auth.logout(body.token)


@app.post("/api/auth/delete")
def auth_delete(body: TokenIn) -> dict:
    """회원 탈퇴 — 본인 계정+세션 삭제(슈퍼 관리자 제외)."""
    return auth.delete_account(body.token)


@app.post("/api/auth/reset-request")
def auth_reset_request(body: ResetRequestIn) -> dict:
    """비밀번호 재설정 링크 요청 — 계정 열거 방지를 위해 존재 여부와 무관하게 동일 응답."""
    return auth.request_reset(body.email)


@app.post("/api/auth/reset")
def auth_reset(body: ResetPasswordIn) -> dict:
    """재설정 토큰(1회용)으로 새 비밀번호를 설정."""
    return auth.reset_password(body.token, body.password)


@app.get("/api/dashboard")
def dashboard() -> dict:
    # 통계 카드 수치는 데모(MOCK) 유지, 모델 상태는 실제 가용성(YOLO best.pt·Gemini 키)으로.
    data = services.dashboard_stats()
    data["models"] = services.real_model_status(yolo_service.model_available())
    return data


# ── 활동/작업물 서버 기록 + 대시보드 실통계(Redis 캐시) ────────────────
def _stats_key(uid: str, project: str) -> str:
    return f"dashstats:{uid}:{project}"


@app.post("/api/activity/log")
def activity_log(body: ActivityLogIn) -> dict:
    """사용자 활동 1건을 서버에 기록(프론트 localStorage 와 이중 기록)."""
    uid = auth.user_id(body.token)
    if not uid:
        return {"ok": False}
    activity.log(uid, body.project, body.type, body.label, body.page, body.ts)
    cache.delete(_stats_key(uid, body.project))  # 통계 캐시 무효화
    return {"ok": True}


@app.post("/api/activity/artifact")
def activity_artifact(body: ArtifactIn) -> dict:
    """작업 산출물(이미지 분석·라벨/RAG 결과) 메타를 서버에 upsert."""
    uid = auth.user_id(body.token)
    if not uid:
        return {"ok": False}
    activity.save_artifact(uid, body.project, body.id, body.kind, body.title, body.page, body.ts)
    cache.delete(_stats_key(uid, body.project))
    return {"ok": True}


@app.post("/api/activity/sync")
def activity_sync(body: ActivitySyncIn) -> dict:
    """기존 localStorage 기록을 서버로 1회 이관(신규 서버 통계 전환용). 중복은 무시."""
    uid = auth.user_id(body.token)
    if not uid:
        return {"ok": False}
    for a in body.activities[:300]:
        activity.log(
            uid, body.project, a.get("type", ""), a.get("label", ""), a.get("page", ""), a.get("ts")
        )
    for a in body.artifacts[:50]:
        activity.save_artifact(
            uid,
            body.project,
            a.get("id", ""),
            a.get("kind", ""),
            a.get("title", ""),
            a.get("page", ""),
            a.get("ts"),
        )
    cache.delete(_stats_key(uid, body.project))
    return {"ok": True}


@app.post("/api/dashboard/stats")
def dashboard_real_stats(body: DashStatsIn) -> dict:
    """대시보드 통계 4종 — 서버 집계 + 60초 캐시(Redis 우선, 없으면 인메모리).

    반환: files/chunks(RAG·프로젝트) + today/yesterday/week/total(활동) +
    images/rag_results/img_week(작업물) + recent(최근 활동) + cache_backend.
    """
    uid = auth.user_id(body.token)
    if not uid:
        return {"ok": False}
    key = _stats_key(uid, body.project)
    hit = cache.get_json(key)
    if hit is not None:
        hit["cached"] = True
        return hit

    data = activity.stats(uid, body.project)
    rag = services.rag_list_files(body.project)
    files = rag.get("files", []) if isinstance(rag, dict) else []
    data["files"] = len(files)
    data["chunks"] = sum(f.get("chunks", 0) for f in files)
    data["recent"] = activity.recent(uid, body.project, 6)
    data["ok"] = True
    data["cached"] = False
    data["cache_backend"] = cache.backend_name()
    cache.set_json(key, data, ttl=60)
    return data


# ── 어드민 — 같은 회사 멤버 기록·상태 관리 (서버에서 권한 재검증) ────────
@app.post("/api/admin/members")
def admin_members(body: AdminMembersIn) -> dict:
    """같은 회사 멤버 목록(페이지네이션) + 각자 활동 통계(어드민 전용)."""
    return admin.list_members(body.token, body.page, body.page_size)


@app.post("/api/admin/member")
def admin_member(body: AdminMemberIn) -> dict:
    """멤버 상세 — 프로필·통계·최근 활동(어드민·동일 회사만)."""
    return admin.member_detail(body.token, body.user_id)


@app.post("/api/admin/member/status")
def admin_member_status(body: AdminStatusIn) -> dict:
    """멤버 계정 활성/비활성 전환(어드민·동일 회사만, 본인 비활성 불가)."""
    return admin.set_member_active(body.token, body.user_id, body.active)


@app.post("/api/admin/requests")
def admin_requests(body: AdminTokenIn) -> dict:
    """관리자 승인 대기 목록(슈퍼 어드민 전용)."""
    return admin.list_requests(body.token)


@app.post("/api/admin/request/resolve")
def admin_request_resolve(body: AdminRequestIn) -> dict:
    """회사 대표(대빵) 승인(회사당 1명·기존 대표 이임)/반려(슈퍼 어드민 전용)."""
    return admin.resolve_request(body.token, body.user_id, body.approve)


@app.post("/api/admin/member/reviewer")
def admin_member_reviewer(body: AdminReviewerIn) -> dict:
    """검수자(팀장) 지정/해제 — 회사 대표(대빵)·슈퍼만, 동일 회사 팀원 대상."""
    return admin.set_member_reviewer(body.token, body.user_id, body.is_reviewer)


@app.post("/api/query")
def query(body: QueryIn) -> dict:
    return services.route_query(body.question)


@app.post("/api/rag/search")
def rag_search(body: RagSearchIn) -> dict:
    return services.rag_search(body.query, body.top_k, body.project)


@app.post("/api/rag/index")
def rag_index(body: RagIndexIn) -> dict:
    return services.rag_index(body.docs, body.sources, body.use_samples, body.project)


@app.post("/api/rag/web-search")
def rag_web_search(body: WebSearchIn) -> dict:
    return services.rag_web_search(body.keyword)


@app.post("/api/rag/reset")
def rag_reset(body: RagSamplesIn | None = None) -> dict:
    return services.rag_reset(body.project if body else "")


@app.get("/api/rag/doc")
def rag_doc(source: str, project: str = "") -> dict:
    return services.rag_get_doc(source, project)


@app.get("/api/rag/files")
def rag_files(project: str = "") -> dict:
    return services.rag_list_files(project)


@app.post("/api/rag/remove")
def rag_remove(body: RagRemoveIn) -> dict:
    return services.rag_remove_doc(body.source, body.project)


@app.post("/api/rag/samples")
def rag_samples(body: RagSamplesIn) -> dict:
    return services.rag_set_samples(body.on, body.project)


@app.post("/api/ask/context")
def ask_context(body: AskContextIn) -> dict:
    """이 페이지의 글/문서 내용만 근거로 질의응답."""
    return services.ask_about_text(body.context, body.question)


@app.post("/api/ask/image")
async def ask_image(image: UploadFile = File(...), question: str = Form("")) -> dict:
    """이 페이지에 올린 이미지만 근거로 질의응답."""
    data = await image.read()
    return services.ask_about_image(data, question, image.content_type or "image/png")


@app.post("/api/labeling/detect")
def labeling_detect(body: DetectIn) -> dict:
    return services.labeling_detect(body.preset, body.custom_prompt, body.min_conf, body.image_name)


@app.post("/api/labeling/detect-image")
async def labeling_detect_image(image: UploadFile = File(...)) -> dict:
    """업로드 이미지에서 실제 YOLO(best.pt)로 박스 탐지. 모델 없으면 MOCK."""
    data = await image.read()
    return yolo_service.detect_boxes(data)


@app.post("/api/labeling/analyze-image")
async def labeling_analyze_image(
    image: UploadFile = File(...),
    preset: str = Form("도로 파손/포트홀 찾기"),
    custom_prompt: str = Form(""),
) -> dict:
    """업로드 이미지를 실제 Gemini Vision으로 설명 분석. 키 없으면 MOCK."""
    data = await image.read()
    return services.analyze_image_vision(
        data, preset, custom_prompt, image.content_type or "image/png"
    )


@app.post("/api/labeling/detect-objects")
async def labeling_detect_objects(image: UploadFile | None = File(None)) -> dict:
    """이미지 속 모든 객체 탐지 — 클래스 필터 라벨링용.

    1순위: 로컬 이중 YOLO(best.pt 파손 + yolov8n 일반객체) — 좌표 정확·한도 없음.
    2순위: Gemini Vision(모델 없을 때). 이미지가 없으면(샘플) 다중 클래스 MOCK.
    """
    data = await image.read() if image else b""
    mime = (image.content_type if image else None) or "image/png"
    if data:
        local = yolo_service.detect_all_boxes(data)
        if local is not None:
            return local
    return services.detect_objects_vision(data, mime)


@app.get("/api/labeling/model")
def labeling_model() -> dict:
    """탐지 모델 사용 가능 여부."""
    return {"yolo_available": yolo_service.model_available()}


@app.post("/api/labeling/save")
def labeling_save(body: SaveLabelsIn) -> dict:
    return services.save_labeling(body.image_name, body.label_count)


@app.post("/api/report")
def report(body: ReportIn) -> dict:
    return services.generate_report(body.report_type, body.period, body.sources, body.include_chart)


@app.post("/api/report/web")
def report_web(body: ReportWebIn) -> dict:
    """웹 검색(Gemini 그라운딩) 기반 보고서 생성."""
    return services.generate_report_web(
        body.report_type, body.period, body.sources, body.query, body.include_chart
    )


@app.post("/api/report/from-rag")
def report_from_rag(body: ReportFromRagIn) -> dict:
    """RAG 검색 결과(질문·답변·근거)를 그대로 이어받아 보고서 생성."""
    return services.generate_report_from_rag(
        body.question,
        body.answer,
        body.sources,
        body.report_type,
        body.period,
        body.include_chart,
    )


@app.post("/api/report/activity")
def report_activity(body: ReportActivityIn) -> dict:
    """사용자가 웹에서 한 활동(검색·이미지 분석·라벨·문서 등)을 통계 낸 활동 요약 보고서."""
    return services.generate_report_activity(
        body.activities, body.start, body.end, body.report_type, body.include_chart
    )


@app.post("/api/report/from-template")
async def report_from_template(
    file: UploadFile = File(...),
    period: str = Form(""),
    include_chart: bool = Form(True),
) -> dict:
    """업로드한 양식(서식) 파일을 분석해 같은 구조로 채운 보고서를 생성.

    pdf·이미지는 Gemini 멀티모달로, docx·hwpx·hwp·txt 는 텍스트 추출 후 전달.
    """
    data = await file.read()
    return services.generate_report_from_template(
        data, file.filename or "", file.content_type or "", period, include_chart
    )


@app.post("/api/report/revise")
def report_revise(body: ReportReviseIn) -> dict:
    """AI 대화로 현재 보고서를 수정(예: 서론·본론·결론 분리)하거나 질문에 답한다."""
    return services.revise_report(body.content, body.instruction)


@app.post("/api/pubdata/search")
def pubdata_search(body: PubDataIn) -> dict:
    """공공데이터포털 연계 — 키워드로 데이터셋·통계·자연어 요약을 돌려준다."""
    return services.pubdata_search(body.keyword)


@app.get("/api/pubdata/catalog")
def pubdata_catalog() -> dict:
    """등록된 전체 공공데이터셋 카탈로그(현황·확장 가능 데이터셋 목록)."""
    return services.pubdata_catalog()


@app.post("/api/agent/plan")
def agent_plan(body: AgentPlanIn) -> dict:
    """AI 에이전트 — 자연어 목표를 단계별 업무 절차(기능 매핑)로 설계."""
    return services.agent_plan(body.goal)


@app.post("/api/agent/run")
def agent_run(body: AgentRunIn) -> dict:
    """원클릭 실행 — 설계한 절차를 실제로 수행하고 종합 결과물(보고서)까지 도출."""
    return services.agent_run(body.goal, body.project)


# ── 프로젝트(노트북) + 검수 워크플로 ─────────────────────────────────
@app.get("/api/projects")
def projects_list(page: int = 1, page_size: int = 24, token: str = "") -> dict:
    """열람 가능한 프로젝트 목록(페이지네이션) — 세션의 소속·계급·공개범위로 필터."""
    viewer = auth.session_user(token)
    return projects.list_projects(page, page_size, viewer)


@app.post("/api/projects")
def projects_create(body: ProjectCreateIn) -> dict:
    """새 프로젝트(노트북) 생성 — 만든이·소속·공개범위(팀/개인)를 기록."""
    owner = auth.session_user(body.token)
    return projects.create_project(body.name, body.emoji, body.visibility, owner)


@app.get("/api/projects/{pid}")
def projects_get(pid: str, token: str = "") -> dict:
    """프로젝트 상세 — 열람 권한이 있을 때만(소스 목록·검수 상태)."""
    viewer = auth.session_user(token)
    return projects.get_project(pid, viewer, enforce=True) or {"error": "not_found"}


@app.delete("/api/projects/{pid}")
def projects_delete(pid: str, token: str = "") -> dict:
    """프로젝트 삭제 — 만든 본인·회사 대표·슈퍼만."""
    viewer = auth.session_user(token)
    return projects.delete_project(pid, viewer, enforce=True)


@app.post("/api/projects/{pid}/sources")
def projects_add_source(pid: str, body: SourceAddIn) -> dict:
    """프로젝트에 소스(데이터) 추가 — 초기 검수 상태 '대기'."""
    return projects.add_source(pid, body.name, body.kind) or {"error": "not_found"}


@app.post("/api/review")
def review_set(body: ReviewIn) -> dict:
    """소스 검수 상태 변경(대기/승인/반려) — 관리자(상사)만 가능.

    검수는 상사 권한이므로 로그인 세션이 관리자(is_admin/is_super)일 때만 허용하고,
    검수자 이름은 클라이언트 값이 아니라 서버 세션의 실제 이름을 기록한다(신뢰 가능).
    """
    actor = auth.session_user(body.token)
    if not actor or not actor.get("active"):
        return {"error": "로그인이 필요합니다.", "code": "unauthorized"}
    if not (actor.get("is_admin") or actor.get("is_super") or actor.get("is_reviewer")):
        return {"error": "검수(승인·반려)는 검수자·대표만 할 수 있습니다.", "code": "forbidden"}
    # 검수자라도 열람 범위(같은 팀/회사) 밖 프로젝트의 소스는 검수할 수 없다.
    if not projects.can_access_source(body.source_id, actor):
        return {"error": "이 프로젝트의 검수 범위가 아닙니다.", "code": "forbidden"}
    return projects.set_review(body.source_id, body.status, actor.get("name") or "검수자") or {
        "error": "invalid"
    }


@app.get("/api/datasets")
def datasets() -> dict:
    return services.list_datasets()


@app.post("/api/datasets/upload")
def datasets_upload(body: UploadIn) -> dict:
    return services.upload_dataset(body.name)


# ── 레거시 URL 호환: 예전 바닐라 /pages/xxx.html → 새 구조 /xxx.html ──
# React 컷오버로 페이지가 /pages/ 하위에서 루트로 옮겨졌다. 기존 북마크·이력·
# 캐시가 /pages/* 를 치면 404 나던 문제를 리다이렉트로 흡수한다.
@app.get("/pages/{fname:path}")
def _legacy_pages_redirect(fname: str) -> RedirectResponse:
    return RedirectResponse(url=f"/{fname}", status_code=302)


# ── 정적 프론트엔드 (반드시 API 라우트 등록 이후에 마운트) ──────────────
app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="web")
