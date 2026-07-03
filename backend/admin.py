"""어드민 — 멤버 기록·상태 관리 + 관리자 신청 승인.

권한 3단계:
  - 슈퍼 어드민(is_super): 전체 회사·멤버 조회, 관리자 신청 승인/반려, 누구든 상태 변경.
  - 회사 어드민(is_admin): 자기 회사(company_id) 멤버만 조회·상태 변경.
  - 일반: 접근 불가.

접근 통제는 모든 함수에서 토큰→권한→active 를 서버에서 재검증한다.
비밀번호 해시는 어떤 응답에도 포함하지 않는다.
"""

from __future__ import annotations

from . import activity, auth

_DENY = {"ok": False, "error": "권한이 없습니다."}


def _actor(token: str) -> dict | None:
    """유효 세션의 활성 사용자 페이로드(없으면 None)."""
    user = auth.session_user(token)
    if not user or not user.get("active"):
        return None
    return user


def _admin(token: str) -> dict | None:
    user = _actor(token)
    return user if user and (user.get("is_admin") or user.get("is_super")) else None


def _super(token: str) -> dict | None:
    user = _actor(token)
    return user if user and user.get("is_super") else None


def _can_manage(actor: dict, member: dict | None) -> bool:
    """actor 가 member 를 관리(조회·상태변경)할 수 있는가."""
    if not member:
        return False
    if actor.get("is_super"):
        return True  # 슈퍼는 전체
    # 회사 어드민: 같은 company_id 만(빈 company_id 는 격리).
    cid = actor.get("company_id") or ""
    return bool(cid) and (member.get("company_id") or "") == cid


def _member_view(r: dict, st: dict) -> dict:
    return {
        "id": r["id"],
        "email": r["email"],
        "name": r["name"],
        "company": r["company"] or "",
        "company_id": r["company_id"] or "",
        "team": r["team"] or "",
        "created": r["created"],
        "is_admin": bool(r["is_admin"]),
        "is_super": bool(r["is_super"]),
        "active": bool(r["active"]),
        "consent": bool(r["terms_at"]) and bool(r["privacy_at"]),
        "marketing": bool(r["marketing"]),
        **st,
    }


def list_members(token: str) -> dict:
    """멤버 목록 + 각자 활동 통계. 슈퍼는 전체, 회사 어드민은 자기 회사만."""
    actor = _admin(token)
    if not actor:
        return _DENY
    is_super = bool(actor.get("is_super"))
    if is_super:
        rows = auth.all_members()
        company = ""
    else:
        company = actor.get("company") or ""
        cid = actor.get("company_id") or ""
        rows = auth.members_by_company_id(cid) if cid else [auth.get_member(actor["id"])]
    members = [_member_view(r, activity.stats_for_user(r["id"])) for r in rows if r]
    return {
        "ok": True,
        "is_super": is_super,
        "company": company,
        "me": actor["id"],
        "members": members,
    }


def list_requests(token: str) -> dict:
    """관리자 승인 대기 목록(슈퍼 어드민 전용)."""
    if not _super(token):
        return _DENY
    reqs = [
        {
            "id": r["id"],
            "name": r["name"],
            "email": r["email"],
            "company": r["company"] or "",
            "team": r["team"] or "",
            "created": r["created"],
        }
        for r in auth.list_admin_requests()
    ]
    return {"ok": True, "requests": reqs}


def resolve_request(token: str, user_id_val: str, approve: bool) -> dict:
    """관리자 신청 승인(is_admin 부여) 또는 반려(신청만 해제). 슈퍼 어드민 전용."""
    if not _super(token):
        return _DENY
    member = auth.get_member(user_id_val)
    if not member:
        return _DENY
    auth.set_admin(user_id_val, approve)
    return {"ok": True, "approved": bool(approve)}


def member_detail(token: str, user_id_val: str) -> dict:
    """멤버 상세 — 프로필·통계 + 최근 활동(전체 프로젝트)."""
    actor = _admin(token)
    if not actor:
        return _DENY
    member = auth.get_member(user_id_val)
    if not _can_manage(actor, member):
        return _DENY
    return {
        "ok": True,
        "member": {
            "id": member["id"],
            "email": member["email"],
            "name": member["name"],
            "company": member["company"] or "",
            "team": member["team"] or "",
            "created": member["created"],
            "is_admin": bool(member["is_admin"]),
            "is_super": bool(member["is_super"]),
            "active": bool(member["active"]),
            "consent": bool(member["terms_at"]) and bool(member["privacy_at"]),
            "marketing": bool(member["marketing"]),
        },
        "stats": activity.stats_for_user(user_id_val),
        "recent": activity.recent_for_user(user_id_val, 15),
    }


def set_member_active(token: str, user_id_val: str, active: bool) -> dict:
    """멤버 계정 활성/비활성. 본인 비활성 불가. 회사 어드민은 다른 관리자·슈퍼를 건드릴 수 없음."""
    actor = _admin(token)
    if not actor:
        return _DENY
    member = auth.get_member(user_id_val)
    if not _can_manage(actor, member):
        return _DENY
    if member["id"] == actor["id"] and not active:
        return {"ok": False, "error": "본인 계정은 비활성화할 수 없습니다."}
    # 회사 어드민은 다른 관리자/슈퍼 계정을 변경할 수 없다(슈퍼만 가능).
    if not actor.get("is_super") and (member["is_admin"] or member["is_super"]):
        return {"ok": False, "error": "다른 관리자 계정은 변경할 수 없습니다."}
    auth.set_active(user_id_val, active)
    return {"ok": True, "active": bool(active)}
