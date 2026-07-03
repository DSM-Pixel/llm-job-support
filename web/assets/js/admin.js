// 어드민 — 같은 회사 멤버의 활동·기록·상태 관리.
// 권한은 서버가 모든 /api/admin/* 요청에서 재검증한다(여긴 화면 제어만).
(() => {
  const $ = (s) => document.querySelector(s);
  const wrap = $('[data-role="wrap"]');
  const denied = $('[data-role="denied"]');
  const rows = $('[data-role="rows"]');
  const emptyEl = $('[data-role="empty"]');

  const token = () => {
    try {
      return (JSON.parse(localStorage.getItem("gnsoft.auth") || "null") || {}).token || "";
    } catch {
      return "";
    }
  };

  const fmtDate = (sec) => {
    if (!sec) return "—";
    const d = new Date(sec * 1000);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  };
  const num = (n) => Number(n || 0).toLocaleString("ko-KR");

  let meId = "";
  let isSuper = false;

  const statusBadge = (active) =>
    active
      ? '<span class="ad-badge ok">활성</span>'
      : '<span class="ad-badge off">비활성</span>';

  const renderSummary = (members) => {
    const total = members.length;
    const active = members.filter((m) => m.active).length;
    const todaySum = members.reduce((s, m) => s + (m.today || 0), 0);
    $('[data-role="summary"]').innerHTML =
      `<span class="ad-chip"><b>${num(total)}</b>멤버</span>` +
      `<span class="ad-chip"><b>${num(active)}</b>활성</span>` +
      `<span class="ad-chip"><b>${num(todaySum)}</b>오늘 활동 합계</span>`;
  };

  const renderRows = (members) => {
    rows.innerHTML = members
      .map((m) => {
        const isMe = m.id === meId;
        const adminTag = m.is_admin ? '<span class="ad-tag">관리자</span>' : "";
        const meTag = isMe ? '<span class="ad-tag me">나</span>' : "";
        const last = m.last_active ? ABC.relTime(m.last_active) : "없음";
        // 본인은 비활성화 불가 → 토글 숨김.
        const toggle = isMe
          ? ""
          : `<button class="ad-btn ${m.active ? "danger" : "ok"}" data-toggle="${m.id}" data-active="${m.active ? 1 : 0}">${m.active ? "비활성화" : "활성화"}</button>`;
        return (
          `<tr data-uid="${m.id}"${m.active ? "" : ' class="ad-row-off"'}>` +
          `<td><div class="ad-member"><span class="ad-avatar">${ABC.escapeHtml((m.name || "?").slice(-2))}</span>` +
          `<div class="ad-member-txt"><b>${ABC.escapeHtml(m.name)} ${adminTag}${meTag}</b><small>${ABC.escapeHtml(m.email)}</small></div></div></td>` +
          `<td class="ad-col-company">${ABC.escapeHtml(m.company || "—")}</td>` +
          `<td>${ABC.escapeHtml(m.team || "—")}<br /><small class="ad-muted">가입 ${fmtDate(m.created)}</small></td>` +
          `<td class="ad-num">${num(m.today)}</td>` +
          `<td class="ad-num">${num(m.week)}</td>` +
          `<td class="ad-num">${num(m.total)}</td>` +
          `<td class="ad-num">${num(m.artifacts)}</td>` +
          `<td class="ad-num">${num(m.projects)}</td>` +
          `<td><small>${ABC.escapeHtml(last)}</small></td>` +
          `<td>${statusBadge(m.active)}</td>` +
          `<td class="ad-actions"><button class="ad-btn" data-detail="${m.id}">상세</button>${toggle}</td>` +
          `</tr>`
        );
      })
      .join("");
    emptyEl.hidden = members.length > 0;
  };

  const load = async () => {
    const d = await ABC.api("/api/admin/members", { token: token() });
    if (!d.ok) {
      wrap.hidden = true;
      denied.hidden = false;
      return;
    }
    meId = d.me || "";
    isSuper = !!d.is_super;
    wrap.hidden = false;
    denied.hidden = true;
    // 슈퍼 어드민: 전체 회사 뷰(회사 컬럼 노출) + 승인 대기 패널.
    const table = document.querySelector(".ad-table");
    table.classList.toggle("is-super", isSuper);
    // 슈퍼는 서비스(프로젝트)를 쓰지 않으므로 '프로젝트 목록' 링크를 숨긴다.
    const back = document.querySelector(".ad-back-link");
    if (back) back.hidden = isSuper;
    $('[data-role="company"]').textContent = d.is_super
      ? "전체 회사"
      : d.company || "(회사 미지정)";
    renderSummary(d.members);
    renderRows(d.members);
    if (d.is_super) loadRequests();
    else $('[data-role="requests"]').hidden = true;
  };

  // ── 관리자 승인 대기(슈퍼 어드민) ──
  const loadRequests = async () => {
    const sec = $('[data-role="requests"]');
    const d = await ABC.api("/api/admin/requests", { token: token() });
    if (!d.ok) {
      sec.hidden = true;
      return;
    }
    const reqs = d.requests || [];
    $('[data-role="req-count"]').textContent = reqs.length;
    if (!reqs.length) {
      $('[data-role="req-list"]').innerHTML =
        '<p class="ad-req-empty">대기 중인 관리자 신청이 없습니다.</p>';
      sec.hidden = false;
      return;
    }
    $('[data-role="req-list"]').innerHTML = reqs
      .map(
        (r) =>
          `<div class="ad-req-card"><div class="ad-req-info"><b>${ABC.escapeHtml(r.name)}</b>` +
          `<small>${ABC.escapeHtml(r.email)} · ${ABC.escapeHtml(r.company || "회사 미지정")}${r.team ? " · " + ABC.escapeHtml(r.team) : ""}</small></div>` +
          `<div class="ad-req-btns"><button class="ad-btn ok" data-approve="${r.id}">승인</button>` +
          `<button class="ad-btn danger" data-reject="${r.id}">반려</button></div></div>`,
      )
      .join("");
    sec.hidden = false;
  };

  const resolveRequest = async (uid, approve) => {
    const r = await ABC.api("/api/admin/request/resolve", {
      token: token(),
      user_id: uid,
      approve,
    });
    if (!r.ok) return ABC.toast(r.error || "처리에 실패했습니다");
    ABC.toast(approve ? "관리자 신청을 승인했습니다" : "관리자 신청을 반려했습니다");
    loadRequests();
    load();
  };

  // ── 상세 모달 ──
  const ACT_ICON = {
    "자연어 질의": "☰",
    "RAG 검색": "⌕",
    "문서 색인": "▱",
    "이미지 분석": "⌗",
    "라벨 저장": "⌗",
    "데이터 업로드": "▱",
    검수: "✓",
    "업무 자동화": "✦",
  };

  const openDetail = async (uid) => {
    const d = await ABC.api("/api/admin/member", { token: token(), user_id: uid });
    if (!d.ok) return ABC.toast("상세를 불러오지 못했습니다");
    const m = d.member;
    const s = d.stats;
    const rowsHtml = (d.recent || [])
      .map((r) => {
        const icon = ACT_ICON[r.type] || "•";
        const label = r.label ? ` — ${r.label}` : "";
        return `<li><span class="ad-rec-ic">${icon}</span><div><b>${ABC.escapeHtml(r.type + label)}</b><small>${ABC.escapeHtml(r.project || "")} · ${ABC.relTime(r.ts)}</small></div></li>`;
      })
      .join("") || '<li class="ad-rec-empty">아직 활동 기록이 없습니다.</li>';

    const ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML =
      `<div class="modal ad-modal"><header class="modal-head"><h3>${ABC.escapeHtml(m.name)} · 멤버 상세</h3>` +
      `<button class="modal-close" type="button" aria-label="닫기">✕</button></header>` +
      `<div class="modal-body">` +
      `<div class="ad-detail-grid">` +
      `<div class="ad-dl"><span>이메일</span><b>${ABC.escapeHtml(m.email)}</b></div>` +
      `<div class="ad-dl"><span>소속</span><b>${ABC.escapeHtml([m.company, m.team].filter(Boolean).join(" · ") || "—")}</b></div>` +
      `<div class="ad-dl"><span>가입일</span><b>${fmtDate(m.created)}</b></div>` +
      `<div class="ad-dl"><span>권한</span><b>${m.is_admin ? "관리자" : "일반"} · ${m.active ? "활성" : "비활성"}</b></div>` +
      `<div class="ad-dl"><span>동의</span><b>${m.consent ? "필수 약관 동의 완료" : "미동의"}${m.marketing ? " · 마케팅 수신" : ""}</b></div>` +
      `</div>` +
      `<div class="ad-stat-row">` +
      `<div class="ad-stat"><b>${num(s.today)}</b><small>오늘</small></div>` +
      `<div class="ad-stat"><b>${num(s.week)}</b><small>최근 7일</small></div>` +
      `<div class="ad-stat"><b>${num(s.total)}</b><small>총 활동</small></div>` +
      `<div class="ad-stat"><b>${num(s.artifacts)}</b><small>작업물</small></div>` +
      `<div class="ad-stat"><b>${num(s.projects)}</b><small>프로젝트</small></div>` +
      `</div>` +
      `<h4 class="ad-rec-title">최근 활동</h4><ul class="ad-rec">${rowsHtml}</ul>` +
      `</div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector(".modal-close").onclick = close;
    ov.addEventListener("click", (e) => e.target === ov && close());
  };

  const toggleActive = (uid, currentlyActive) => {
    const act = !currentlyActive;
    const run = async () => {
      const r = await ABC.api("/api/admin/member/status", {
        token: token(),
        user_id: uid,
        active: act,
      });
      if (!r.ok) return ABC.toast(r.error || "변경에 실패했습니다");
      ABC.toast(act ? "계정을 활성화했습니다" : "계정을 비활성화했습니다");
      load();
    };
    if (act) return run();
    // 비활성화는 확인 후 진행(로그인 즉시 차단됨).
    ABC.confirmAction(
      "이 계정을 비활성화할까요?<br />해당 멤버는 즉시 로그아웃되고 로그인할 수 없습니다.",
      run,
    );
  };

  document.addEventListener("DOMContentLoaded", () => {
    // 로고 → 회사 어드민은 프로젝트 목록, 슈퍼(운영자)는 콘솔 유지.
    $(".pj-logo")?.addEventListener("click", () => {
      location.href = isSuper ? "admin.html" : "projects.html";
    });
    const avatar = $(".pj-top .avatar");
    avatar?.addEventListener("click", ABC.openSettings);
    avatar?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        ABC.openSettings();
      }
    });

    rows.addEventListener("click", (e) => {
      const det = e.target.closest("[data-detail]");
      if (det) return openDetail(det.dataset.detail);
      const tog = e.target.closest("[data-toggle]");
      if (tog) return toggleActive(tog.dataset.toggle, tog.dataset.active === "1");
    });

    $('[data-role="req-list"]')?.addEventListener("click", (e) => {
      const ap = e.target.closest("[data-approve]");
      if (ap) return resolveRequest(ap.dataset.approve, true);
      const rj = e.target.closest("[data-reject]");
      if (rj) return resolveRequest(rj.dataset.reject, false);
    });

    load().catch(() => {
      wrap.hidden = true;
      denied.hidden = false;
    });
  });
})();
