"""어드민 — 같은 회사 멤버의 기록·상태 관리.

접근 통제(모든 함수 공통):
  1) 토큰이 유효한 세션이어야 하고,
  2) 그 사용자가 is_admin 이며 active 여야 하고,
  3) 대상 멤버는 어드민과 '같은 회사(company)' 여야 한다.
비어있는 company 는 서로 격리(빈 회사끼리 묶이지 않도록)한다.
비밀번호 해시는 어떤 응답에도 포함하지 않는다.
"""

from __future__ import annotations

from . import activity, auth

_DENY = {"ok": False, "error": "권한이 없습니다."}


def _admin(token: str) -> dict | None:
    """어드민 페이로드 반환(권한 없으면 None)."""
    user = auth.session_user(token)
    if not user or not user.get("is_admin") or not user.get("active"):
        return None
    return user


def _same_company(admin: dict, member: dict | None) -> bool:
    if not member:
        return False
    company = (admin.get("company") or "").strip()
    # 빈 회사끼리는 묶지 않는다(격리). 어드민 자신은 항상 허용.
    if not company:
        return member.get("id") == admin.get("id")
    return (member.get("company") or "").strip() == company


def list_members(token: str) -> dict:
    """같은 회사 멤버 목록 + 각자의 활동 통계."""
    admin = _admin(token)
    if not admin:
        return _DENY
    company = admin.get("company") or ""
    rows = auth.members_by_company(company) if company else []
    # 회사가 비어있는 어드민은 자기 자신만.
    if not company:
        me = auth.get_member(admin["id"])
        rows = [me] if me else []

    members = []
    for r in rows:
        st = activity.stats_for_user(r["id"])
        members.append(
            {
                "id": r["id"],
                "email": r["email"],
                "name": r["name"],
                "team": r["team"] or "",
                "created": r["created"],
                "is_admin": bool(r["is_admin"]),
                "active": bool(r["active"]),
                "consent": bool(r["terms_at"]) and bool(r["privacy_at"]),
                "marketing": bool(r["marketing"]),
                **st,
            }
        )
    return {"ok": True, "company": company, "me": admin["id"], "members": members}


def member_detail(token: str, user_id_val: str) -> dict:
    """멤버 상세 — 프로필·통계 + 최근 활동(전체 프로젝트)."""
    admin = _admin(token)
    if not admin:
        return _DENY
    member = auth.get_member(user_id_val)
    if not _same_company(admin, member):
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
            "active": bool(member["active"]),
            "consent": bool(member["terms_at"]) and bool(member["privacy_at"]),
            "marketing": bool(member["marketing"]),
        },
        "stats": activity.stats_for_user(user_id_val),
        "recent": activity.recent_for_user(user_id_val, 15),
    }


def set_member_active(token: str, user_id_val: str, active: bool) -> dict:
    """멤버 계정 활성/비활성. 어드민 자신은 비활성화 불가."""
    admin = _admin(token)
    if not admin:
        return _DENY
    member = auth.get_member(user_id_val)
    if not _same_company(admin, member):
        return _DENY
    if member["id"] == admin["id"] and not active:
        return {"ok": False, "error": "본인 계정은 비활성화할 수 없습니다."}
    auth.set_active(user_id_val, active)
    return {"ok": True, "active": bool(active)}
