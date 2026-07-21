"""인메모리 백그라운드 작업(job) 저장소.

사이드바(=별도 HTML 페이지) 이동 시 브라우저가 진행 중인 AI 요청(fetch)을 중단시키는
문제를 해결하기 위해, 오래 걸리는 AI 호출을 서버 스레드로 돌리고 상태·결과를 여기 보관한다.
클라이언트는 job_id 를 localStorage 에 두고, 어느 페이지에서든 상태를 폴링·결과 회수한다.

인메모리(프로세스 로컬)라 서버 재시작 시 사라진다(데모 규모엔 충분). 완료된 job 은
TTL 이 지나면 정리한다.

    jobs[job_id] = {id, kind, status(running|done|error), result, error, created, updated}
"""

from __future__ import annotations

import threading
import time
import uuid
from collections.abc import Callable

_lock = threading.Lock()
_jobs: dict[str, dict] = {}
_TTL = 1800  # 완료/실패 후 30분 보관


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def create(kind: str) -> str:
    _gc()
    jid = _new_id()
    now = time.time()
    with _lock:
        _jobs[jid] = {
            "id": jid,
            "kind": kind,
            "status": "running",
            "result": None,
            "error": "",
            "progress": None,
            "created": now,
            "updated": now,
        }
    return jid


def set_progress(jid: str, progress) -> None:
    """진행률 갱신(예: {"done": 3, "total": 10}). 폴더 라벨링 등 다건 작업용."""
    with _lock:
        j = _jobs.get(jid)
        if j:
            j.update(progress=progress, updated=time.time())


def finish(jid: str, result) -> None:
    with _lock:
        j = _jobs.get(jid)
        if j:
            j.update(status="done", result=result, updated=time.time())


def fail(jid: str, error) -> None:
    with _lock:
        j = _jobs.get(jid)
        if j:
            j.update(status="error", error=str(error)[:500], updated=time.time())


def get(jid: str) -> dict | None:
    with _lock:
        j = _jobs.get(jid)
        return dict(j) if j else None


def _gc() -> None:
    now = time.time()
    with _lock:
        dead = [
            k for k, v in _jobs.items() if v["status"] != "running" and now - v["updated"] > _TTL
        ]
        for k in dead:
            _jobs.pop(k, None)


def run_async(kind: str, fn: Callable[[], object]) -> str:
    """fn() 을 데몬 스레드에서 실행하고 결과/에러를 job 에 저장. job_id 즉시 반환."""
    jid = create(kind)

    def _worker() -> None:
        try:
            finish(jid, fn())
        except Exception as e:
            fail(jid, e)

    threading.Thread(target=_worker, daemon=True).start()
    return jid


def run_async_with_id(kind: str, fn: Callable[[str], object]) -> str:
    """run_async 와 같되 fn 이 job_id 를 인자로 받는다(진행률 갱신용)."""
    jid = create(kind)

    def _worker() -> None:
        try:
            finish(jid, fn(jid))
        except Exception as e:
            fail(jid, e)

    threading.Thread(target=_worker, daemon=True).start()
    return jid
