// 업무 자동화 — 자연어 목표 → AI 에이전트가 업무 절차를 설계하고 기능에 연결.
(() => {
  const $ = (sel) => document.querySelector(sel);
  const input = $(".ag-input");
  const result = $(".ag-result");
  let steps = []; // 마지막 계획의 단계(첫 단계 이동용)

  const renderSteps = (list) => {
    $('[data-role="steps"]').innerHTML = list
      .map(
        (s) =>
          `<li class="ag-step card">` +
          `<div class="ag-step-num">${s.n}</div>` +
          `<div class="ag-step-body">` +
          `<div class="ag-step-top"><b>${ABC.escapeHtml(s.title)}</b>` +
          `<span class="ag-tool"><span class="ag-tool-ic">${ABC.escapeHtml(s.icon)}</span>${ABC.escapeHtml(s.tool_label)}</span></div>` +
          (s.why ? `<p class="ag-why">${ABC.escapeHtml(s.why)}</p>` : "") +
          `</div>` +
          `<a class="btn ag-step-go" href="${ABC.escapeHtml(s.route)}">이 단계 실행 →</a>` +
          `</li>`,
      )
      .join("");
  };

  const render = (data) => {
    steps = data.steps || [];
    $('[data-role="badge"]').outerHTML = `<span class="ag-badge" data-role="badge">${
      data.backend === "GEMINI" ? "AI 생성" : "기본 절차"
    }</span>`;
    $('[data-role="summary"]').textContent = data.summary;
    renderSteps(steps);
    const start = $('[data-role="start"]');
    if (steps.length) {
      start.hidden = false;
      start.onclick = () => (location.href = steps[0].route);
    } else {
      start.hidden = true;
    }
    $('[data-role="run-all"]').hidden = !steps.length;
    $('[data-role="run"]').hidden = true; // 새 계획이면 이전 실행 결과 감춤
    result.hidden = false;
  };

  // ── 원클릭 실행 결과 렌더링 ──
  const esc = (s) => ABC.escapeHtml(s);
  const STATUS = {
    done: { t: "완료", c: "ok" },
    manual: { t: "수동 필요", c: "warn" },
    synth: { t: "종합", c: "info" },
    skipped: { t: "건너뜀", c: "muted" },
    error: { t: "오류", c: "err" },
  };

  // 아주 가벼운 마크다운(## 제목 · - 불릿)만 처리.
  const mdLite = (text) =>
    (text || "")
      .split("\n")
      .map((line) => {
        const t = line.trim();
        if (!t) return "";
        if (t.startsWith("### ")) return `<h5>${esc(t.slice(4))}</h5>`;
        if (t.startsWith("## ")) return `<h4>${esc(t.slice(3))}</h4>`;
        if (t.startsWith("# ")) return `<h4>${esc(t.slice(2))}</h4>`;
        if (/^[-*]\s/.test(t)) return `<div class="ag-li">${esc(t.replace(/^[-*]\s/, ""))}</div>`;
        return `<p>${esc(t)}</p>`;
      })
      .join("");

  let lastDeliverable = null;

  const renderRun = (d) => {
    $('[data-role="run-badge"]').textContent = d.backend === "GEMINI" ? "AI 실행" : "기본 실행";
    $('[data-role="run-steps"]').innerHTML = (d.steps || [])
      .map((s) => {
        const st = STATUS[s.status] || STATUS.done;
        const text = s.text ? `<p class="ag-run-text">${esc(s.text)}</p>` : "";
        const src =
          s.sources && s.sources.length
            ? `<p class="ag-run-src">근거: ${s.sources.map(esc).join(", ")}</p>`
            : "";
        const link =
          s.status === "manual" && s.route
            ? `<a class="ag-run-link" href="${esc(s.route)}">직접 실행 →</a>`
            : "";
        return (
          `<li class="ag-run-step"><div class="ag-run-step-top">` +
          `<span class="ag-run-num">${s.n}</span><b>${esc(s.title)}</b>` +
          `<span class="ag-run-badge ${st.c}">${st.t}</span></div>${text}${src}${link}</li>`
        );
      })
      .join("");

    const deliv = $('[data-role="deliverable"]');
    lastDeliverable = d.deliverable || null;
    if (lastDeliverable) {
      $('[data-role="deliv-title"]').textContent = lastDeliverable.title;
      $('[data-role="deliv-body"]').innerHTML = mdLite(lastDeliverable.content);
      deliv.hidden = false;
    } else {
      deliv.hidden = true;
    }
    $('[data-role="run"]').hidden = false;
  };

  const runAll = async () => {
    const goal = input.value.trim();
    if (!goal) return ABC.toast("목표를 입력해주세요");
    const proj = ABC.getProject && ABC.getProject() ? ABC.getProject().id : "";
    const restore = ABC.setBusy($('[data-role="run-all"]'), "실행 중…");
    $('[data-role="run"]').hidden = false;
    $('[data-role="deliverable"]').hidden = true;
    $('[data-role="run-steps"]').innerHTML =
      '<li class="ag-run-loading">단계를 실행하고 결과를 종합하는 중…</li>';
    $('[data-role="run"]').scrollIntoView({ behavior: "smooth", block: "nearest" });
    try {
      const d = await ABC.api("/api/agent/run", { goal, project: proj });
      renderRun(d);
      ABC.logActivity("업무 자동화", `${goal} (원클릭 실행)`);
    } catch {
      /* api()가 토스트 */
    } finally {
      restore();
    }
  };

  const plan = async (goal) => {
    const g = (goal ?? input.value).trim();
    if (!g) {
      ABC.toast("목표를 입력해주세요");
      return;
    }
    input.value = g;
    const restore = ABC.setBusy($(".ag-go"), "설계 중");
    try {
      const data = await ABC.api("/api/agent/plan", { goal: g });
      render(data);
      ABC.logActivity("업무 자동화", g);
    } catch {
      /* api() 가 이미 토스트 */
    } finally {
      restore();
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    $(".ag-go").addEventListener("click", () => plan());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") plan();
    });
    document.querySelectorAll(".ag-chip").forEach((chip) => {
      chip.addEventListener("click", () => plan(chip.textContent.trim()));
    });

    // 원클릭 실행 + 결과물 복사/저장.
    $('[data-role="run-all"]').addEventListener("click", runAll);
    $('[data-role="deliv-copy"]').addEventListener("click", async () => {
      if (!lastDeliverable) return;
      try {
        await navigator.clipboard.writeText(lastDeliverable.content);
        ABC.toast("결과물을 복사했습니다");
      } catch {
        ABC.toast("복사에 실패했습니다");
      }
    });
    $('[data-role="deliv-save"]').addEventListener("click", () => {
      if (!lastDeliverable) return;
      ABC.saveArtifact({
        id: `agent_${Date.now()}`,
        kind: "rag",
        title: lastDeliverable.title,
        text: lastDeliverable.content,
      });
      ABC.logActivity("업무 자동화", `결과물 저장 — ${lastDeliverable.title}`);
      ABC.toast("결과물을 저장했습니다 (데이터·보고서에서 확인)");
    });

    // 이 화면에서 AI 대화는 '업무 절차' 관점으로.
    ABC.registerAskHandler(
      async (q) => (await ABC.api("/api/agent/plan", { goal: q })).summary,
      "업무 목표를 적으면 절차를 설계해 드려요",
    );

    // 자동 설계 금지 — 버튼을 눌러야 설계한다. 단, 다른 화면에서 ?q= 로
    // 넘어온 경우(명시적 의도)에만 자동 실행.
    const q = new URLSearchParams(location.search).get("q");
    if (q) plan(q);
  });
})();
