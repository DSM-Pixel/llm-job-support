"""프로젝트(노트북) + 데이터 검수 워크플로 저장소 — SQLite.

NotebookLM 처럼 작업을 '프로젝트(노트북)' 단위로 나눈다. 각 프로젝트는 소스
(이미지셋·문서·공공데이터·보고서)를 담고, 소스마다 검수 상태(대기/승인/반려)와
검수자·검수시각을 관리한다.

    projects(id, name, emoji, created, owner_id, owner_name, company_id, team, visibility)
    sources(id, project_id, name, kind, review, reviewer, reviewed_at)

프로젝트 열람 범위(visibility):
  - team   : 같은 팀(같은 company_id + team) 전원(검수자 포함) + 회사 대표 + 슈퍼
  - private: 만든 본인 + 회사 대표 + 슈퍼 (검수자·다른 팀원은 못 봄)
  (레거시: owner_id 가 없는 예전 전역 프로젝트는 로그인한 누구나 열람 — 하위호환)
"""

from __future__ import annotations

import sqlite3
import threading
import time
import uuid
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent / "storage" / "projects.db"
_lock = threading.Lock()

REVIEW_STATES = ("대기", "승인", "반려")
VISIBILITIES = ("team", "private")


def _connect() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects "
        "(id TEXT PRIMARY KEY, name TEXT NOT NULL, emoji TEXT, created REAL NOT NULL)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sources ("
        "id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL, "
        "kind TEXT, review TEXT NOT NULL DEFAULT '대기', reviewer TEXT, reviewed_at REAL)"
    )
    # 소유·소속·공개범위 컬럼(기존 DB 마이그레이션 겸용) — 없을 때만 추가.
    cols = {r[1] for r in conn.execute("PRAGMA table_info(projects)")}
    for col, ddl in (
        ("owner_id", "TEXT"),
        ("owner_name", "TEXT"),
        ("company_id", "TEXT"),
        ("team", "TEXT"),
        ("visibility", "TEXT DEFAULT 'team'"),
    ):
        if col not in cols:
            conn.execute(f"ALTER TABLE projects ADD COLUMN {col} {ddl}")


def _new_id() -> str:
    return uuid.uuid4().hex[:10]


# 데모 시드 제거 — 프로젝트·소스·검수는 전부 사용자가 직접 만든 실데이터만 사용한다.
def ensure_seeded() -> None:
    with _lock, _connect() as conn:
        _init(conn)


# ── 열람 권한 ────────────────────────────────────────────────────────
def _can_see(row: sqlite3.Row, viewer: dict | None) -> bool:
    """viewer 가 프로젝트 row 를 열람할 수 있는가(목록·상세 공통 규칙).

    (row 는 항상 SELECT * — 소유·소속 컬럼은 _init 마이그레이션으로 존재 보장.)
    """
    owner = row["owner_id"] or ""
    if not owner:
        return True  # 레거시(소유자 없는 예전 전역 프로젝트) — 로그인 누구나
    if not viewer:
        return False
    if viewer.get("is_super"):
        return True
    if viewer.get("id") == owner:
        return True
    vcid = viewer.get("company_id") or ""
    if vcid and vcid == (row["company_id"] or ""):
        if viewer.get("is_admin"):
            return True  # 회사 대표 = 회사 전체(개인 프로젝트 포함)
        # 팀원·검수자 모두 '팀 공유' 프로젝트만 본다. 개인(private)은 만든 본인·대표만
        # 열람 — 검수자(팀장)도 다른 팀원의 개인 프로젝트는 볼 수 없다.
        same_team = bool(viewer.get("team")) and viewer.get("team") == (row["team"] or "")
        if same_team and (row["visibility"] or "team") == "team":
            return True
    return False


def _can_delete(row: sqlite3.Row, viewer: dict | None) -> bool:
    """삭제는 만든 본인·회사 대표·슈퍼만(레거시는 로그인 누구나)."""
    owner = row["owner_id"] or ""
    if not owner:
        return True
    if not viewer:
        return False
    if viewer.get("is_super") or viewer.get("id") == owner:
        return True
    vcid = viewer.get("company_id") or ""
    return bool(viewer.get("is_admin") and vcid and vcid == (row["company_id"] or ""))


# ── 조회/변경 ────────────────────────────────────────────────────────
def _summary(row: sqlite3.Row, agg: sqlite3.Row | None, viewer: dict | None) -> dict:
    total = agg["total"] if agg else 0
    approved = agg["approved"] if agg else 0
    pending = agg["pending"] if agg else 0
    return {
        "id": row["id"],
        "name": row["name"],
        "emoji": row["emoji"] or "📁",
        "created": row["created"],
        "source_count": total,
        "approved": approved,
        "pending": pending,
        "progress": round(100 * approved / total) if total else 0,
        "owner_name": row["owner_name"] or "",
        "team": row["team"] or "",
        "visibility": row["visibility"] or "team",
        "mine": bool(viewer and viewer.get("id") and viewer.get("id") == (row["owner_id"] or "")),
    }


def _summaries_for(
    conn: sqlite3.Connection, rows: list[sqlite3.Row], viewer: dict | None
) -> list[dict]:
    """페이지에 담긴 프로젝트들의 소스 집계를 IN 절 1회로 배치 계산(N+1 제거)."""
    ids = [r["id"] for r in rows]
    agg: dict[str, sqlite3.Row] = {}
    if ids:
        ph = ",".join("?" * len(ids))
        for a in conn.execute(
            "SELECT project_id, COUNT(*) AS total, "
            "SUM(CASE WHEN review='승인' THEN 1 ELSE 0 END) AS approved, "
            "SUM(CASE WHEN review='대기' THEN 1 ELSE 0 END) AS pending "
            f"FROM sources WHERE project_id IN ({ph}) GROUP BY project_id",
            ids,
        ).fetchall():
            agg[a["project_id"]] = a
    return [_summary(r, agg.get(r["id"]), viewer) for r in rows]


def list_projects(page: int = 1, page_size: int = 24, viewer: dict | None = None) -> dict:
    """열람 가능한 프로젝트 목록(페이지네이션) + 소스 검수 집계.

    범위(visibility)·소속으로 먼저 필터한 뒤 페이지를 자른다(데모 규모라 메모리 필터).
    """
    ensure_seeded()
    page = max(1, int(page or 1))
    page_size = min(100, max(1, int(page_size or 24)))
    with _lock, _connect() as conn:
        rows = conn.execute("SELECT * FROM projects ORDER BY created DESC").fetchall()
        visible = [r for r in rows if _can_see(r, viewer)]
        # 내가 만든(편집 가능) 프로젝트를 앞으로 — 갤러리의 '편집 가능/열람만' 구분용.
        # (정렬은 안정적이라 각 그룹 안에서는 created DESC 유지.)
        vid = (viewer or {}).get("id") or ""
        visible.sort(key=lambda r: 0 if (r["owner_id"] or "") == vid else 1)
        total = len(visible)
        start = (page - 1) * page_size
        page_rows = visible[start : start + page_size]
        return {
            "projects": _summaries_for(conn, page_rows, viewer),
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": max(1, (total + page_size - 1) // page_size),
        }


def get_project(pid: str, viewer: dict | None = None, enforce: bool = False) -> dict | None:
    """프로젝트 상세(소스·검수). enforce=True 면 열람 권한이 없을 때 None 반환.

    (내부 호출은 enforce=False 로 권한 무시, 라우트는 enforce=True 로 열람 통제.)
    """
    ensure_seeded()
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (pid,)).fetchone()
        if not row:
            return None
        if enforce and not _can_see(row, viewer):
            return None
        srcs = conn.execute(
            "SELECT * FROM sources WHERE project_id = ? ORDER BY rowid", (pid,)
        ).fetchall()
        agg = conn.execute(
            "SELECT COUNT(*) AS total, "
            "SUM(CASE WHEN review='승인' THEN 1 ELSE 0 END) AS approved, "
            "SUM(CASE WHEN review='대기' THEN 1 ELSE 0 END) AS pending "
            "FROM sources WHERE project_id = ?",
            (pid,),
        ).fetchone()
        data = _summary(row, agg, viewer)
        data["sources"] = [
            {
                "id": s["id"],
                "name": s["name"],
                "kind": s["kind"] or "문서",
                "review": s["review"],
                "reviewer": s["reviewer"] or "",
                "reviewed_at": s["reviewed_at"] or 0,
            }
            for s in srcs
        ]
        return data


def create_project(
    name: str, emoji: str = "📁", visibility: str = "team", owner: dict | None = None
) -> dict:
    """새 프로젝트 생성 — 만든이(세션)·소속·공개범위를 함께 기록."""
    ensure_seeded()
    pid = _new_id()
    vis = visibility if visibility in VISIBILITIES else "team"
    owner = owner or {}
    with _lock, _connect() as conn:
        _init(conn)
        conn.execute(
            "INSERT INTO projects(id, name, emoji, created, owner_id, owner_name, "
            "company_id, team, visibility) VALUES (?,?,?,?,?,?,?,?,?)",
            (
                pid,
                (name or "새 프로젝트").strip(),
                (emoji or "📁").strip(),
                time.time(),
                owner.get("id") or "",
                owner.get("name") or "",
                owner.get("company_id") or "",
                owner.get("team") or "",
                vis,
            ),
        )
    return get_project(pid) or {}


def add_source(pid: str, name: str, kind: str = "문서") -> dict | None:
    nm = (name or "새 소스").strip()
    kd = (kind or "문서").strip()
    with _lock, _connect() as conn:
        _init(conn)
        if not conn.execute("SELECT 1 FROM projects WHERE id = ?", (pid,)).fetchone():
            return None
        # 같은 이름·유형이 이미 있으면 중복 추가하지 않는다(실제 산출물이 소스로 자동
        # 등록될 때 재생성마다 쌓이는 것 방지 + 기존 검수 상태 보존).
        dup = conn.execute(
            "SELECT 1 FROM sources WHERE project_id = ? AND name = ? AND kind = ?",
            (pid, nm, kd),
        ).fetchone()
        if not dup:
            conn.execute(
                "INSERT INTO sources(id, project_id, name, kind, review) VALUES (?,?,?,?,'대기')",
                (_new_id(), pid, nm, kd),
            )
    return get_project(pid)


def can_access_source(source_id: str, viewer: dict | None) -> bool:
    """검수자/대표가 이 소스의 프로젝트를 열람할 수 있는가(검수 전 범위 확인용)."""
    with _lock, _connect() as conn:
        _init(conn)
        row = conn.execute("SELECT project_id FROM sources WHERE id = ?", (source_id,)).fetchone()
        if not row:
            return False
        p = conn.execute("SELECT * FROM projects WHERE id = ?", (row["project_id"],)).fetchone()
    return bool(p and _can_see(p, viewer))


def set_review(source_id: str, status: str, reviewer: str = "") -> dict | None:
    """소스 검수 상태 변경(대기/승인/반려) + 검수자·시각 기록. 프로젝트 상세 반환."""
    if status not in REVIEW_STATES:
        return None
    with _lock, _connect() as conn:
        _init(conn)
        row = conn.execute("SELECT project_id FROM sources WHERE id = ?", (source_id,)).fetchone()
        if not row:
            return None
        if status == "대기":
            conn.execute(
                "UPDATE sources SET review=?, reviewer=NULL, reviewed_at=NULL WHERE id=?",
                (status, source_id),
            )
        else:
            conn.execute(
                "UPDATE sources SET review=?, reviewer=?, reviewed_at=? WHERE id=?",
                (status, (reviewer or "검수자").strip(), time.time(), source_id),
            )
        pid = row["project_id"]
    return get_project(pid)


def delete_project(pid: str, viewer: dict | None = None, enforce: bool = False) -> dict:
    """프로젝트 삭제 — enforce=True 면 만든 본인·회사 대표·슈퍼만 허용."""
    with _lock, _connect() as conn:
        _init(conn)
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (pid,)).fetchone()
        if not row:
            return {"error": "not_found"}
        if enforce and not _can_delete(row, viewer):
            return {"error": "forbidden"}
        conn.execute("DELETE FROM sources WHERE project_id = ?", (pid,))
        conn.execute("DELETE FROM projects WHERE id = ?", (pid,))
    return {"deleted": pid}
