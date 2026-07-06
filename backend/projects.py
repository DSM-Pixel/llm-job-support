"""프로젝트(노트북) + 데이터 검수 워크플로 저장소 — SQLite.

NotebookLM 처럼 작업을 '프로젝트(노트북)' 단위로 나눈다. 각 프로젝트는 소스
(이미지셋·문서·공공데이터·보고서)를 담고, 소스마다 검수 상태(대기/승인/반려)와
검수자·검수시각을 관리한다.

    projects(id, name, emoji, created)
    sources(id, project_id, name, kind, review, reviewer, reviewed_at)
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


def _new_id() -> str:
    return uuid.uuid4().hex[:10]


# 데모 시드 제거 — 프로젝트·소스·검수는 전부 사용자가 직접 만든 실데이터만 사용한다.
# (예전엔 하드코딩된 데모 프로젝트 2개와 고정 검수자 "박도현"을 심었으나 폐기.)
def ensure_seeded() -> None:
    with _lock, _connect() as conn:
        _init(conn)


# ── 조회/변경 ────────────────────────────────────────────────────────
def _project_summary(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    srcs = conn.execute("SELECT review FROM sources WHERE project_id = ?", (row["id"],)).fetchall()
    total = len(srcs)
    approved = sum(1 for s in srcs if s["review"] == "승인")
    pending = sum(1 for s in srcs if s["review"] == "대기")
    return {
        "id": row["id"],
        "name": row["name"],
        "emoji": row["emoji"] or "📁",
        "created": row["created"],
        "source_count": total,
        "approved": approved,
        "pending": pending,
        "progress": round(100 * approved / total) if total else 0,
    }


def _summaries_for(conn: sqlite3.Connection, rows: list[sqlite3.Row]) -> list[dict]:
    """페이지에 담긴 프로젝트들의 소스 집계를 IN 절 1회로 배치 계산(N+1 제거).

    예전엔 프로젝트마다 sources 를 개별 조회(_project_summary)해 N+1 이었다.
    """
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
    out = []
    for r in rows:
        a = agg.get(r["id"])
        total = a["total"] if a else 0
        approved = a["approved"] if a else 0
        pending = a["pending"] if a else 0
        out.append(
            {
                "id": r["id"],
                "name": r["name"],
                "emoji": r["emoji"] or "📁",
                "created": r["created"],
                "source_count": total,
                "approved": approved,
                "pending": pending,
                "progress": round(100 * approved / total) if total else 0,
            }
        )
    return out


def list_projects(page: int = 1, page_size: int = 24) -> dict:
    """프로젝트 목록(페이지네이션) + 소스 검수 집계.

    DB 부하 완화: LIMIT/OFFSET 로 페이지당만 조회하고, 소스 집계는 배치(N+1 제거).
    """
    ensure_seeded()
    page = max(1, int(page or 1))
    page_size = min(100, max(1, int(page_size or 24)))
    offset = (page - 1) * page_size
    with _lock, _connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
        rows = conn.execute(
            "SELECT * FROM projects ORDER BY created DESC LIMIT ? OFFSET ?",
            (page_size, offset),
        ).fetchall()
        return {
            "projects": _summaries_for(conn, rows),
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": max(1, (total + page_size - 1) // page_size),
        }


def get_project(pid: str) -> dict | None:
    ensure_seeded()
    with _lock, _connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (pid,)).fetchone()
        if not row:
            return None
        srcs = conn.execute(
            "SELECT * FROM sources WHERE project_id = ? ORDER BY rowid", (pid,)
        ).fetchall()
        data = _project_summary(conn, row)
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


def create_project(name: str, emoji: str = "📁") -> dict:
    ensure_seeded()
    pid = _new_id()
    with _lock, _connect() as conn:
        _init(conn)
        conn.execute(
            "INSERT INTO projects(id, name, emoji, created) VALUES (?,?,?,?)",
            (pid, (name or "새 프로젝트").strip(), (emoji or "📁").strip(), time.time()),
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


def delete_project(pid: str) -> dict:
    with _lock, _connect() as conn:
        _init(conn)
        conn.execute("DELETE FROM sources WHERE project_id = ?", (pid,))
        conn.execute("DELETE FROM projects WHERE id = ?", (pid,))
    return {"deleted": pid}
