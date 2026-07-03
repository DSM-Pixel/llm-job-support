"""로그인·회원가입 — SQLite 사용자·세션 저장소.

- 비밀번호: PBKDF2-HMAC-SHA256(20만회) + 사용자별 salt (stdlib만 사용, 평문 저장 금지).
- 동의(법적 요건): 필수(이용약관·개인정보 수집이용) 동의 '일시'를 기록하고,
  선택(알림 수신)은 여부만 저장한다. 필수 미동의 시 가입 자체를 거부한다.
- 세션: 랜덤 토큰(7일 만료). 프론트는 localStorage 에 보관하고 /api/auth/me 로 검증.

    users(id, email, pw, name, company, team, marketing,
          terms_at, privacy_at, created)
    sessions(token, user_id, expires)
"""

from __future__ import annotations

import hashlib
import re
import secrets
import sqlite3
import threading
import time
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent / "storage" / "users.db"
_lock = threading.Lock()

_SESSION_TTL = 7 * 86400  # 7일
_RESET_TTL = 30 * 60  # 비밀번호 재설정 링크 유효시간(30분)
_PBKDF2_ITERS = 200_000
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _connect() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users ("
        "id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw TEXT NOT NULL, "
        "name TEXT NOT NULL, company TEXT, team TEXT, marketing INTEGER DEFAULT 0, "
        "terms_at REAL NOT NULL, privacy_at REAL NOT NULL, created REAL NOT NULL)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions ("
        "token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires REAL NOT NULL)"
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS reset_tokens ("
        "token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires REAL NOT NULL)"
    )
    # 회사 레지스트리 — name_norm(공백제거·소문자)으로 오타·띄어쓰기 흡수.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS companies ("
        "id TEXT PRIMARY KEY, name TEXT NOT NULL, name_norm TEXT UNIQUE NOT NULL, "
        "created REAL NOT NULL)"
    )
    # 권한·상태·소속 컬럼(기존 DB 마이그레이션 겸용) — 없을 때만 추가.
    cols = {r[1] for r in conn.execute("PRAGMA table_info(users)")}
    for col, ddl in (
        ("is_admin", "INTEGER DEFAULT 0"),
        ("active", "INTEGER DEFAULT 1"),
        ("is_super", "INTEGER DEFAULT 0"),
        ("admin_requested", "INTEGER DEFAULT 0"),
        ("company_id", "TEXT"),
    ):
        if col not in cols:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {ddl}")

    # 기존 자유 텍스트 company → companies 레지스트리로 백필(회사별 company_id 부여).
    raw_companies = conn.execute(
        "SELECT DISTINCT company FROM users "
        "WHERE company IS NOT NULL AND LENGTH(TRIM(company)) > 0 "
        "AND (company_id IS NULL OR company_id = '')"
    ).fetchall()
    for (raw,) in raw_companies:
        norm = _norm_company(raw)
        if not norm:
            continue
        found = conn.execute("SELECT id FROM companies WHERE name_norm = ?", (norm,)).fetchone()
        cid = found["id"] if found else secrets.token_hex(6)
        if not found:
            conn.execute(
                "INSERT INTO companies(id, name, name_norm, created) VALUES (?,?,?,?)",
                (cid, raw.strip(), norm, time.time()),
            )
        conn.execute(
            "UPDATE users SET company_id = ? "
            "WHERE company = ? AND (company_id IS NULL OR company_id = '')",
            (cid, raw),
        )

    # 슈퍼 어드민 부트스트랩: 슈퍼가 없으면 최초 가입 계정(dsmadmin)을 슈퍼로.
    has_user = conn.execute("SELECT 1 FROM users LIMIT 1").fetchone()
    has_super = conn.execute("SELECT 1 FROM users WHERE is_super = 1 LIMIT 1").fetchone()
    if has_user and not has_super:
        conn.execute(
            "UPDATE users SET is_super = 1 "
            "WHERE id = (SELECT id FROM users ORDER BY created LIMIT 1)"
        )
    # 불변식: 슈퍼 어드민은 '순수 서비스 운영자' — 회사 어드민을 겸하지 않는다.
    conn.execute("UPDATE users SET is_admin = 0 WHERE is_super = 1")


# ── 비밀번호 해시 ────────────────────────────────────────────────────
def _hash_pw(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), _PBKDF2_ITERS
    ).hex()
    return f"{salt}${digest}"


def _verify_pw(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return secrets.compare_digest(_hash_pw(password, salt), stored)


# ── 회사 레지스트리 ──────────────────────────────────────────────────
def _norm_company(name: str) -> str:
    """회사명 정규화 — 모든 공백 제거 + 소문자. '지엔 소프트'·'ZN Soft' 오타를 흡수."""
    return "".join((name or "").split()).casefold()


def _find_or_create_company(conn: sqlite3.Connection, name: str) -> str | None:
    """정규화 기준으로 회사를 찾고 없으면 생성. company_id 반환(빈 이름이면 None)."""
    name = (name or "").strip()
    norm = _norm_company(name)
    if not norm:
        return None
    found = conn.execute("SELECT id FROM companies WHERE name_norm = ?", (norm,)).fetchone()
    if found:
        return found["id"]
    cid = secrets.token_hex(6)
    conn.execute(
        "INSERT INTO companies(id, name, name_norm, created) VALUES (?,?,?,?)",
        (cid, name, norm, time.time()),
    )
    return cid


def search_companies(query: str = "", limit: int = 20) -> list[dict]:
    """등록된 회사 검색(직원 가입 시 선택용). 정규화 부분일치, 이름순."""
    norm = _norm_company(query)
    with _lock, _connect() as conn:
        _init(conn)
        if norm:
            rows = conn.execute(
                "SELECT id, name FROM companies WHERE name_norm LIKE ? ORDER BY name LIMIT ?",
                (f"%{norm}%", limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, name FROM companies ORDER BY name LIMIT ?", (limit,)
            ).fetchall()
    return [dict(r) for r in rows]


def get_company(company_id: str) -> dict | None:
    with _lock, _connect() as conn:
        _init(conn)
        row = conn.execute(
            "SELECT id, name FROM companies WHERE id = ?", (company_id or "",)
        ).fetchone()
    return dict(row) if row else None


# ── 세션 ─────────────────────────────────────────────────────────────
def _issue_session(conn: sqlite3.Connection, user_id: str) -> str:
    token = secrets.token_hex(24)
    conn.execute(
        "INSERT INTO sessions(token, user_id, expires) VALUES (?,?,?)",
        (token, user_id, time.time() + _SESSION_TTL),
    )
    conn.execute("DELETE FROM sessions WHERE expires < ?", (time.time(),))  # 만료 정리
    return token


def _user_payload(row: sqlite3.Row) -> dict:
    # is_admin·active 는 _init 의 마이그레이션으로 항상 존재(모든 조회가 _init 이후).
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "company": row["company"] or "",
        "team": row["team"] or "",
        "marketing": bool(row["marketing"]),
        "is_admin": bool(row["is_admin"]),
        "is_super": bool(row["is_super"]),
        "active": bool(row["active"]),
        "company_id": row["company_id"] or "",
        "admin_requested": bool(row["admin_requested"]),
    }


# ── 공개 API ─────────────────────────────────────────────────────────
def signup(
    email: str,
    password: str,
    name: str,
    company: str = "",
    team: str = "",
    agree_terms: bool = False,
    agree_privacy: bool = False,
    agree_marketing: bool = False,
    company_id: str = "",
    admin_request: bool = False,
) -> dict:
    """회원가입. 필수 동의 없으면 거부. 성공 시 자동 로그인(토큰).

    소속(회사) 처리:
      - 관리자 신청(admin_request): company(자유 입력)로 회사를 찾거나 새로 등록하고
        admin_requested=1(대기). 슈퍼 어드민 승인 시 is_admin 부여.
      - 직원(기본): company_id(등록된 회사 목록에서 선택)로만 소속을 지정한다.
    """
    email = (email or "").strip().lower()
    name = (name or "").strip()
    if not _EMAIL_RE.match(email):
        return {"ok": False, "error": "올바른 이메일 주소를 입력해주세요."}
    if len(password or "") < 8:
        return {"ok": False, "error": "비밀번호는 8자 이상이어야 합니다."}
    if not name:
        return {"ok": False, "error": "이름을 입력해주세요."}
    # 법적 요건: 필수 동의 없이는 개인정보를 수집·저장하지 않는다.
    if not (agree_terms and agree_privacy):
        return {
            "ok": False,
            "error": "필수 약관(이용약관·개인정보 수집이용)에 동의해야 가입할 수 있습니다.",
        }
    if admin_request and not _norm_company(company):
        return {"ok": False, "error": "관리자 신청 시 회사·기관명을 입력해주세요."}

    now = time.time()
    with _lock, _connect() as conn:
        _init(conn)
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            return {"ok": False, "error": "이미 가입된 이메일입니다. 로그인해주세요."}

        # 소속 회사 결정.
        if admin_request:
            cid = _find_or_create_company(conn, company)
        elif company_id:
            found = conn.execute(
                "SELECT id, name FROM companies WHERE id = ?", (company_id,)
            ).fetchone()
            if not found:
                return {
                    "ok": False,
                    "error": "선택한 회사를 찾을 수 없습니다. 목록에서 다시 선택해주세요.",
                }
            cid = found["id"]
            company = found["name"]  # 표시용 이름은 레지스트리 기준으로 통일
        else:
            cid = None  # 소속 미지정(직원이 회사를 고르지 않음)

        uid = secrets.token_hex(8)
        conn.execute(
            "INSERT INTO users(id, email, pw, name, company, team, marketing, "
            "terms_at, privacy_at, created, company_id, admin_requested) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                uid,
                email,
                _hash_pw(password),
                name,
                (company or "").strip(),
                (team or "").strip(),
                1 if agree_marketing else 0,
                now,  # 동의 일시 기록(철회·분쟁 대비)
                now,
                now,
                cid,
                1 if admin_request else 0,
            ),
        )
        token = _issue_session(conn, uid)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    msg = (
        "가입이 완료되었습니다. 관리자 신청은 슈퍼 관리자 승인 후 활성화됩니다."
        if admin_request
        else "가입이 완료되었습니다."
    )
    return {"ok": True, "token": token, "user": _user_payload(row), "message": msg}


def login(email: str, password: str) -> dict:
    email = (email or "").strip().lower()
    with _lock, _connect() as conn:
        _init(conn)
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        # 데모 플랫폼 — 미가입/비밀번호 오류를 구분해 안내한다.
        if not row:
            return {
                "ok": False,
                "code": "not_registered",
                "error": "가입되지 않은 이메일입니다. 회원가입 후 이용해주세요.",
            }
        if not _verify_pw(password or "", row["pw"]):
            return {"ok": False, "error": "비밀번호가 올바르지 않습니다."}
        if not row["active"]:
            return {
                "ok": False,
                "code": "deactivated",
                "error": "비활성화된 계정입니다. 관리자에게 문의해주세요.",
            }
        token = _issue_session(conn, row["id"])
    return {"ok": True, "token": token, "user": _user_payload(row)}


def me(token: str) -> dict:
    """토큰 검증 — 유효하면 사용자 정보."""
    with _lock, _connect() as conn:
        _init(conn)
        s = conn.execute(
            "SELECT user_id, expires FROM sessions WHERE token = ?", (token or "",)
        ).fetchone()
        if not s or s["expires"] < time.time():
            return {"ok": False, "error": "세션이 만료되었습니다. 다시 로그인해주세요."}
        row = conn.execute("SELECT * FROM users WHERE id = ?", (s["user_id"],)).fetchone()
        if not row:
            return {"ok": False, "error": "사용자를 찾을 수 없습니다."}
        if not row["active"]:
            return {"ok": False, "code": "deactivated", "error": "비활성화된 계정입니다."}
    return {"ok": True, "user": _user_payload(row)}


def user_id(token: str) -> str | None:
    """세션 토큰 → 사용자 id (유효/미만료일 때만). 활동 기록 귀속용 경량 조회."""
    with _lock, _connect() as conn:
        _init(conn)
        s = conn.execute(
            "SELECT user_id, expires FROM sessions WHERE token = ?", (token or "",)
        ).fetchone()
        if not s or s["expires"] < time.time():
            return None
        return s["user_id"]


def session_user(token: str) -> dict | None:
    """유효 세션의 사용자 페이로드(is_admin·active 포함). 어드민 권한 검사용."""
    with _lock, _connect() as conn:
        _init(conn)
        s = conn.execute(
            "SELECT user_id, expires FROM sessions WHERE token = ?", (token or "",)
        ).fetchone()
        if not s or s["expires"] < time.time():
            return None
        row = conn.execute("SELECT * FROM users WHERE id = ?", (s["user_id"],)).fetchone()
    return _user_payload(row) if row else None


# 멤버 조회 공통 컬럼(비밀번호 해시 제외).
_MEMBER_COLS = (
    "id, email, name, company, company_id, team, marketing, terms_at, privacy_at, "
    "created, is_admin, is_super, active, admin_requested"
)


def members_by_company_id(company_id: str) -> list[dict]:
    """같은 회사(company_id) 소속 사용자 목록(가입순). 비밀번호 해시는 제외."""
    with _lock, _connect() as conn:
        _init(conn)
        rows = conn.execute(
            f"SELECT {_MEMBER_COLS} FROM users WHERE company_id = ? ORDER BY created",
            (company_id or "",),
        ).fetchall()
    return [dict(r) for r in rows]


def all_members() -> list[dict]:
    """전체 사용자 목록(슈퍼 어드민용). 비밀번호 해시는 제외."""
    with _lock, _connect() as conn:
        _init(conn)
        rows = conn.execute(f"SELECT {_MEMBER_COLS} FROM users ORDER BY created").fetchall()
    return [dict(r) for r in rows]


def list_admin_requests() -> list[dict]:
    """관리자 승인 대기 중인 사용자 목록(슈퍼 어드민용)."""
    with _lock, _connect() as conn:
        _init(conn)
        rows = conn.execute(
            f"SELECT {_MEMBER_COLS} FROM users "
            "WHERE admin_requested = 1 AND is_admin = 0 ORDER BY created"
        ).fetchall()
    return [dict(r) for r in rows]


def get_member(user_id_val: str) -> dict | None:
    """단일 사용자 조회(비밀번호 제외)."""
    with _lock, _connect() as conn:
        _init(conn)
        row = conn.execute(
            f"SELECT {_MEMBER_COLS} FROM users WHERE id = ?", (user_id_val,)
        ).fetchone()
    return dict(row) if row else None


def set_admin(user_id_val: str, is_admin: bool) -> None:
    """관리자 권한 부여/회수 + 신청 플래그 해제(승인·반려 공통)."""
    with _lock, _connect() as conn:
        _init(conn)
        conn.execute(
            "UPDATE users SET is_admin = ?, admin_requested = 0 WHERE id = ?",
            (1 if is_admin else 0, user_id_val),
        )


def set_active(user_id_val: str, active: bool) -> None:
    """계정 활성/비활성 전환. 비활성화 시 기존 세션을 모두 종료(즉시 로그아웃)."""
    with _lock, _connect() as conn:
        _init(conn)
        conn.execute("UPDATE users SET active = ? WHERE id = ?", (1 if active else 0, user_id_val))
        if not active:
            conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id_val,))


def logout(token: str) -> dict:
    with _lock, _connect() as conn:
        _init(conn)
        conn.execute("DELETE FROM sessions WHERE token = ?", (token or "",))
    return {"ok": True, "message": "로그아웃되었습니다."}


# ── 비밀번호 재설정 ──────────────────────────────────────────────────
def request_reset(email: str) -> dict:
    """재설정 링크 요청. 계정 열거(enumeration) 방지를 위해 가입 여부와 관계없이
    동일한 안내를 돌려준다. 실제 서비스라면 이메일로 링크를 발송한다."""
    email = (email or "").strip().lower()
    generic = {
        "ok": True,
        "message": "가입된 이메일이라면 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해주세요.",
    }
    if not _EMAIL_RE.match(email):
        return generic

    with _lock, _connect() as conn:
        _init(conn)
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if not row:
            return generic  # 미가입 — 동일 응답으로 존재 여부를 숨긴다
        token = secrets.token_hex(24)
        conn.execute("DELETE FROM reset_tokens WHERE user_id = ?", (row["id"],))  # 기존 요청 무효화
        conn.execute(
            "INSERT INTO reset_tokens(token, user_id, expires) VALUES (?,?,?)",
            (token, row["id"], time.time() + _RESET_TTL),
        )
        conn.execute("DELETE FROM reset_tokens WHERE expires < ?", (time.time(),))  # 만료 정리

    link = f"/pages/reset.html?token={token}"
    # 데모에는 메일러가 없어 콘솔에 출력하고 dev_link 로 함께 돌려준다.
    # ⚠ 운영 배포 시 dev_link 는 제거할 것 — 응답에 담으면 계정 존재가 노출된다.
    # 로그는 Windows 콘솔(cp1252)에서도 안전하도록 ASCII 로만 남긴다.
    print(f"[password-reset] {email} -> {link}")
    return {**generic, "dev_link": link}


def reset_password(token: str, new_password: str) -> dict:
    """재설정 토큰(1회용)으로 새 비밀번호를 설정한다. 성공 시 기존 세션은 모두 무효화."""
    if len(new_password or "") < 8:
        return {"ok": False, "error": "비밀번호는 8자 이상이어야 합니다."}
    now = time.time()
    with _lock, _connect() as conn:
        _init(conn)
        row = conn.execute(
            "SELECT user_id, expires FROM reset_tokens WHERE token = ?", (token or "",)
        ).fetchone()
        if not row or row["expires"] < now:
            return {
                "ok": False,
                "error": "재설정 링크가 만료되었거나 올바르지 않습니다. 다시 요청해주세요.",
            }
        uid = row["user_id"]
        conn.execute("UPDATE users SET pw = ? WHERE id = ?", (_hash_pw(new_password), uid))
        conn.execute("DELETE FROM reset_tokens WHERE token = ?", (token,))  # 1회용
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (uid,))  # 보안: 기존 세션 무효화
    return {"ok": True, "message": "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요."}
