"""사용자·프로젝트별 활동/작업물 서버 저장소 — 대시보드 통계의 원천.

기존엔 브라우저 localStorage 에만 쌓여, 서버는 사용자가 무엇을 했는지 몰랐다.
여러 기기 합산·서버 집계·Redis 캐싱을 위해 서버(SQLite)에도 이중 기록한다.
이미지 썸네일 등 무거운 데이터는 보고서 삽입용으로 여전히 클라이언트에 두고,
여기엔 통계에 필요한 메타(종류·시각·제목)만 저장한다.

    activity(id, user_id, project, ts, page, type, label)
    artifact(user_id, project, art_id, ts, page, kind, title)  -- (user,project,art_id) UNIQUE

ts 는 클라이언트 Date.now() 와 동일한 '밀리초' 단위로 저장한다(프론트 폴백과 정합).
'오늘' 경계는 한국 표준시(UTC+9) 기준으로 계산한다.
"""

from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent / "storage" / "activity.db"
_lock = threading.Lock()

_KST_MS = 9 * 3600 * 1000  # 한국 표준시(UTC+9) — '오늘/어제' 경계 계산 기준
_DAY_MS = 86_400_000


def _connect() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS activity ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, project TEXT NOT NULL, "
        "ts REAL NOT NULL, page TEXT, type TEXT NOT NULL, label TEXT)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS artifact ("
        "user_id TEXT NOT NULL, project TEXT NOT NULL, art_id TEXT NOT NULL, "
        "ts REAL NOT NULL, page TEXT, kind TEXT, title TEXT, "
        "PRIMARY KEY (user_id, project, art_id))"
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_act ON activity(user_id, project, ts)")


def _now_ms() -> float:
    return time.time() * 1000


def log(
    user_id: str,
    project: str,
    type_: str,
    label: str = "",
    page: str = "",
    ts: float | None = None,
) -> None:
    """활동 1건 기록. (user,project,ts,type) 동일 건은 중복 저장하지 않는다
    (이중 기록·동기화 재호출 대비)."""
    ts = float(ts) if ts else _now_ms()
    with _lock, _connect() as conn:
        _init(conn)
        dup = conn.execute(
            "SELECT 1 FROM activity WHERE user_id=? AND project=? AND ts=? AND type=?",
            (user_id, project, ts, type_),
        ).fetchone()
        if dup:
            return
        conn.execute(
            "INSERT INTO activity(user_id, project, ts, page, type, label) VALUES (?,?,?,?,?,?)",
            (user_id, project, ts, page, type_, str(label)[:200]),
        )


def save_artifact(
    user_id: str,
    project: str,
    art_id: str,
    kind: str = "",
    title: str = "",
    page: str = "",
    ts: float | None = None,
) -> None:
    """작업 산출물(이미지 분석/라벨·RAG 결과) 메타를 upsert. 같은 art_id 는 최신으로 갱신."""
    ts = float(ts) if ts else _now_ms()
    with _lock, _connect() as conn:
        _init(conn)
        conn.execute(
            "INSERT INTO artifact(user_id, project, art_id, ts, page, kind, title) "
            "VALUES (?,?,?,?,?,?,?) "
            "ON CONFLICT(user_id, project, art_id) DO UPDATE SET "
            "ts=excluded.ts, kind=excluded.kind, title=excluded.title, page=excluded.page",
            (user_id, project, art_id or f"a{ts}", ts, page, kind, str(title)[:200]),
        )


def recent(user_id: str, project: str, limit: int = 6) -> list[dict]:
    """최근 활동(최신순) — 대시보드 '최근 활동' 목록용."""
    with _lock, _connect() as conn:
        _init(conn)
        rows = conn.execute(
            "SELECT ts, page, type, label FROM activity WHERE user_id=? AND project=? "
            "ORDER BY ts DESC LIMIT ?",
            (user_id, project, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def stats_for_user(user_id: str) -> dict:
    """어드민용 — 한 사용자의 전체 프로젝트 합산 통계(오늘/주/총·작업물·프로젝트수·최근활동)."""
    now = _now_ms()
    d0 = _day_start_ms(now)
    week_from = now - 7 * _DAY_MS
    with _lock, _connect() as conn:
        _init(conn)
        acts = conn.execute("SELECT ts FROM activity WHERE user_id=?", (user_id,)).fetchall()
        arts = conn.execute("SELECT ts, kind FROM artifact WHERE user_id=?", (user_id,)).fetchall()
        projects = conn.execute(
            "SELECT COUNT(DISTINCT project) FROM activity WHERE user_id=?", (user_id,)
        ).fetchone()[0]
    ts_list = [a["ts"] for a in acts]
    return {
        "today": sum(1 for t in ts_list if t >= d0),
        "week": sum(1 for t in ts_list if t >= week_from),
        "total": len(ts_list),
        "artifacts": len(arts),
        "images": sum(1 for a in arts if a["kind"] == "image"),
        "projects": projects,
        "last_active": max(ts_list) if ts_list else 0,
    }


def stats_for_users(user_ids: list[str]) -> dict:
    """여러 사용자의 통계를 한 번에 집계(어드민 목록용 N+1 제거).

    사용자당 개별 쿼리 대신 IN 절로 활동·작업물을 한 번에 읽어 파이썬에서 합산한다.
    반환: {user_id: {today, week, total, artifacts, images, projects, last_active}}
    """
    if not user_ids:
        return {}
    now = _now_ms()
    d0 = _day_start_ms(now)
    week_from = now - 7 * _DAY_MS
    ph = ",".join("?" * len(user_ids))
    with _lock, _connect() as conn:
        _init(conn)
        acts = conn.execute(
            f"SELECT user_id, ts FROM activity WHERE user_id IN ({ph})", user_ids
        ).fetchall()
        arts = conn.execute(
            f"SELECT user_id, ts, kind FROM artifact WHERE user_id IN ({ph})", user_ids
        ).fetchall()
        projrows = conn.execute(
            f"SELECT user_id, COUNT(DISTINCT project) c FROM activity "
            f"WHERE user_id IN ({ph}) GROUP BY user_id",
            user_ids,
        ).fetchall()
    projmap = {r["user_id"]: r["c"] for r in projrows}
    out = {
        uid: {
            "today": 0,
            "week": 0,
            "total": 0,
            "artifacts": 0,
            "images": 0,
            "projects": projmap.get(uid, 0),
            "last_active": 0,
        }
        for uid in user_ids
    }
    for a in acts:
        s = out.get(a["user_id"])
        if s is None:
            continue
        t = a["ts"]
        s["total"] += 1
        if t >= d0:
            s["today"] += 1
        if t >= week_from:
            s["week"] += 1
        if t > s["last_active"]:
            s["last_active"] = t
    for a in arts:
        s = out.get(a["user_id"])
        if s is None:
            continue
        s["artifacts"] += 1
        if a["kind"] == "image":
            s["images"] += 1
    return out


def recent_for_user(user_id: str, limit: int = 10) -> list[dict]:
    """어드민용 — 한 사용자의 전체 프로젝트 최근 활동(최신순)."""
    with _lock, _connect() as conn:
        _init(conn)
        rows = conn.execute(
            "SELECT ts, project, page, type, label FROM activity WHERE user_id=? "
            "ORDER BY ts DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def _day_start_ms(now_ms: float) -> int:
    """now(ms)가 속한 KST 하루의 0시를 UTC epoch(ms)로."""
    return ((int(now_ms) + _KST_MS) // _DAY_MS) * _DAY_MS - _KST_MS


def stats(user_id: str, project: str) -> dict:
    """대시보드 통계(활동/작업물 집계). 오늘·어제·최근7일·총계 + 작업물 종류별 수."""
    now = _now_ms()
    d0 = _day_start_ms(now)
    y0 = d0 - _DAY_MS
    week_from = now - 7 * _DAY_MS
    with _lock, _connect() as conn:
        _init(conn)
        acts = conn.execute(
            "SELECT ts FROM activity WHERE user_id=? AND project=?", (user_id, project)
        ).fetchall()
        arts = conn.execute(
            "SELECT ts, kind FROM artifact WHERE user_id=? AND project=?", (user_id, project)
        ).fetchall()
    ts_list = [a["ts"] for a in acts]
    return {
        "today": sum(1 for t in ts_list if t >= d0),
        "yesterday": sum(1 for t in ts_list if y0 <= t < d0),
        "week": sum(1 for t in ts_list if t >= week_from),
        "total": len(ts_list),
        "images": sum(1 for a in arts if a["kind"] == "image"),
        "rag_results": sum(1 for a in arts if a["kind"] == "rag"),
        "img_week": sum(1 for a in arts if a["kind"] == "image" and a["ts"] >= week_from),
    }
