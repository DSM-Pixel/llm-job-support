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
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import threading
import time
from email.message import EmailMessage
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent / "storage" / "users.db"
_lock = threading.Lock()

_SESSION_TTL = 7 * 86400  # 7일
_RESET_TTL = 30 * 60  # 비밀번호 재설정 링크 유효시간(30분)
_VERIFY_TTL = 10 * 60  # 이메일 인증 코드 유효시간(10분)
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
    # 이메일 인증 대기 중인 가입(계정 생성 전 임시 보관) — 코드 검증 후 users 로 이관.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pending_signups ("
        "email TEXT PRIMARY KEY, pw TEXT NOT NULL, name TEXT NOT NULL, company TEXT, "
        "team TEXT, marketing INTEGER DEFAULT 0, company_id TEXT, "
        "admin_request INTEGER DEFAULT 0, code TEXT NOT NULL, expires REAL NOT NULL, "
        "attempts INTEGER DEFAULT 0)"
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
    # 불변식: 슈퍼 어드민은 '순수 서비스 운영자' — 회사 어드민을 겸하지 않고
    # 소속(회사)·직함도 갖지 않는다.
    conn.execute(
        "UPDATE users SET is_admin = 0, company_id = NULL, company = '', team = '' "
        "WHERE is_super = 1"
    )


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


# ── 이메일 인증 코드·발송 ────────────────────────────────────────────
def _gen_code() -> str:
    """6자리 숫자 인증 코드."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_email(to_addr: str, subject: str, body: str) -> bool:
    """이메일 발송. SMTP_* 환경변수가 설정돼 있으면 실제 발송, 아니면 False(데모 폴백).

    .env 예시:
        SMTP_HOST=smtp.gmail.com
        SMTP_PORT=587            # 465면 SSL, 그 외엔 STARTTLS
        SMTP_USER=you@gmail.com
        SMTP_PASS=앱비밀번호     # Gmail 2단계인증 후 발급한 앱 비밀번호
        SMTP_FROM=you@gmail.com  # 생략 시 SMTP_USER
    """
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        # 콘솔은 Windows(cp1252)에서도 안전하도록 ASCII 로만 남긴다.
        print(f"[email] SMTP not set - demo fallback. to={to_addr}")
        return False
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    pw = os.environ.get("SMTP_PASS", "")
    sender = os.environ.get("SMTP_FROM", "") or user
    try:
        msg = EmailMessage()
        msg["From"] = sender
        msg["To"] = to_addr
        msg["Subject"] = subject
        msg.set_content(body)
        ctx = ssl.create_default_context()
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=12, context=ctx) as s:
                if user:
                    s.login(user, pw)
                s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=12) as s:
                s.starttls(context=ctx)
                if user:
                    s.login(user, pw)
                s.send_message(msg)
        return True
    except Exception as exc:
        print(f"[email] send failed - demo fallback: {exc}")
        return False


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
def start_signup(
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
    """회원가입 1단계 — 검증 후 이메일 인증 코드를 발송(계정은 아직 만들지 않음).

    입력을 pending_signups 에 임시 저장하고 6자리 코드를 이메일로 보낸다.
    SMTP 미설정이면 dev_code 로 코드를 함께 반환(데모 폴백).
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
    code = _gen_code()
    with _lock, _connect() as conn:
        _init(conn)
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            return {"ok": False, "error": "이미 가입된 이메일입니다. 로그인해주세요."}
        # 직원 가입이면 선택한 회사가 실제 존재하는지 즉시 검증.
        if (
            not admin_request
            and company_id
            and not conn.execute("SELECT 1 FROM companies WHERE id = ?", (company_id,)).fetchone()
        ):
            return {
                "ok": False,
                "error": "선택한 회사를 찾을 수 없습니다. 목록에서 다시 선택해주세요.",
            }
        conn.execute("DELETE FROM pending_signups WHERE expires < ?", (now,))  # 만료 정리
        conn.execute(
            "INSERT OR REPLACE INTO pending_signups(email, pw, name, company, team, "
            "marketing, company_id, admin_request, code, expires, attempts) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,0)",
            (
                email,
                _hash_pw(password),
                name,
                (company or "").strip(),
                (team or "").strip(),
                1 if agree_marketing else 0,
                company_id,
                1 if admin_request else 0,
                code,
                now + _VERIFY_TTL,
            ),
        )

    sent = _send_email(
        email,
        "GNSoft 이메일 인증 코드",
        f"GNSoft AI 플랫폼 회원가입 인증 코드입니다.\n\n    인증 코드: {code}\n\n"
        f"10분 안에 입력해주세요. 본인이 요청하지 않았다면 무시하셔도 됩니다.",
    )
    resp = {
        "ok": True,
        "pending": True,
        "email": email,
        "message": "인증 코드를 이메일로 보냈습니다. 메일함(스팸함 포함)을 확인해주세요.",
    }
    if not sent:
        # SMTP 미설정/실패 — 데모 폴백. ⚠ 실제 메일 발송을 붙이면 이 값은 노출되지 않는다.
        resp["dev_code"] = code
    return resp


def verify_signup(email: str, code: str) -> dict:
    """회원가입 2단계 — 인증 코드 확인 후 실제 계정 생성 + 자동 로그인."""
    email = (email or "").strip().lower()
    now = time.time()
    with _lock, _connect() as conn:
        _init(conn)
        p = conn.execute("SELECT * FROM pending_signups WHERE email = ?", (email,)).fetchone()
        if not p or p["expires"] < now:
            return {"ok": False, "error": "인증 코드가 만료되었거나 없습니다. 다시 시도해주세요."}
        if p["attempts"] >= 5:
            conn.execute("DELETE FROM pending_signups WHERE email = ?", (email,))
            return {"ok": False, "error": "시도 횟수를 초과했습니다. 처음부터 다시 진행해주세요."}
        if not secrets.compare_digest(str(code or "").strip(), p["code"]):
            conn.execute(
                "UPDATE pending_signups SET attempts = attempts + 1 WHERE email = ?", (email,)
            )
            return {"ok": False, "error": "인증 코드가 올바르지 않습니다."}
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            conn.execute("DELETE FROM pending_signups WHERE email = ?", (email,))
            return {"ok": False, "error": "이미 가입된 이메일입니다. 로그인해주세요."}

        admin_request = bool(p["admin_request"])
        company = p["company"] or ""
        if admin_request:
            cid = _find_or_create_company(conn, company)
        elif p["company_id"]:
            found = conn.execute(
                "SELECT id, name FROM companies WHERE id = ?", (p["company_id"],)
            ).fetchone()
            cid = found["id"] if found else None
            if found:
                company = found["name"]
        else:
            cid = None

        uid = secrets.token_hex(8)
        conn.execute(
            "INSERT INTO users(id, email, pw, name, company, team, marketing, "
            "terms_at, privacy_at, created, company_id, admin_requested) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                uid,
                email,
                p["pw"],  # start_signup 에서 이미 해시됨
                p["name"],
                company.strip(),
                p["team"] or "",
                p["marketing"],
                now,
                now,
                now,
                cid,
                1 if admin_request else 0,
            ),
        )
        conn.execute("DELETE FROM pending_signups WHERE email = ?", (email,))
        token = _issue_session(conn, uid)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    msg = (
        "이메일 인증 완료! 관리자 신청은 슈퍼 관리자 승인 후 활성화됩니다."
        if admin_request
        else "이메일 인증 완료! 가입이 끝났습니다."
    )
    return {"ok": True, "token": token, "user": _user_payload(row), "message": msg}


def resend_code(email: str) -> dict:
    """대기 중인 가입의 인증 코드를 재발급·재발송한다."""
    email = (email or "").strip().lower()
    now = time.time()
    code = _gen_code()
    with _lock, _connect() as conn:
        _init(conn)
        p = conn.execute("SELECT 1 FROM pending_signups WHERE email = ?", (email,)).fetchone()
        if not p:
            return {
                "ok": False,
                "error": "진행 중인 가입 요청이 없습니다. 처음부터 다시 시도해주세요.",
            }
        conn.execute(
            "UPDATE pending_signups SET code = ?, expires = ?, attempts = 0 WHERE email = ?",
            (code, now + _VERIFY_TTL, email),
        )
    sent = _send_email(
        email,
        "GNSoft 이메일 인증 코드(재발송)",
        f"새 인증 코드: {code}\n10분 안에 입력해주세요.",
    )
    resp = {"ok": True, "message": "인증 코드를 다시 보냈습니다."}
    if not sent:
        resp["dev_code"] = code
    return resp


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
