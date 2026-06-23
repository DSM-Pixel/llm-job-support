document.addEventListener("DOMContentLoaded", () => {
  const esc = ABC.escapeHtml;
  const reportPage = document.querySelector(".report-page");

  document.querySelectorAll(".select-list button").forEach((item) => {
    item.addEventListener("click", () => ABC.activateInGroup(item, "button"));
  });

  // 기간 입력(시작/종료). 비어 있으면 기본값(최근 30일 ~ 오늘)을 채운다.
  const startEl = document.querySelector(".date-start");
  const endEl = document.querySelector(".date-end");
  // 로컬 기준 YYYY-MM-DD (toISOString은 UTC라 KST에서 하루 어긋나므로 보정).
  const fmtDate = (d) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  if (endEl && !endEl.value) endEl.value = fmtDate(new Date());
  if (startEl && !startEl.value) {
    startEl.value = fmtDate(new Date(Date.now() - 30 * 86400000));
  }
  // 시작/종료 → "YYYY-MM-DD ~ YYYY-MM-DD" 라벨(둘 다 없으면 전체 기간).
  const periodLabel = () => {
    const s = startEl?.value || "";
    const e = endEl?.value || "";
    return s || e ? `${s} ~ ${e}` : "전체 기간";
  };

  document.querySelectorAll(".source-toggle .switch").forEach((switchEl) => {
    const row = switchEl.closest(".source-toggle");
    row?.classList.toggle("is-off", switchEl.classList.contains("off"));
    switchEl.addEventListener("click", () => {
      switchEl.classList.toggle("off");
      row?.classList.toggle("is-off", switchEl.classList.contains("off"));
    });
  });

  // 데이터 소스(통계 차트 토글 행은 제외) 중 켜진 것.
  const activeSources = () =>
    [...document.querySelectorAll(".source-toggle")]
      .filter((row) => !row.textContent.includes("통계 차트"))
      .filter((row) => !row.querySelector(".switch")?.classList.contains("off"))
      .map((row) => row.querySelector("span, b")?.textContent.trim())
      .filter(Boolean);

  // '통계 차트 포함' 토글 상태.
  const includeChart = () => {
    const row = [...document.querySelectorAll(".source-toggle")].find((r) =>
      r.textContent.includes("통계 차트"),
    );
    return !row?.querySelector(".switch")?.classList.contains("off");
  };

  // 본문(여러 문단 + '- ' 불릿)을 문단/목록 HTML로 렌더.
  const renderBody = (body) => {
    const lines = String(body || "")
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    let html = "";
    let inList = false;
    for (const ln of lines) {
      if (/^[-*•]\s+/.test(ln)) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${esc(ln.replace(/^[-*•]\s+/, ""))}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<p>${esc(ln)}</p>`;
      }
    }
    if (inList) html += "</ul>";
    return html || "<p></p>";
  };

  // 보고서에 넣을 자료. 이미지(분석·라벨·직접첨부) 또는 RAG 도출 결과.
  // 보고서를 재생성해도 유지되도록 모듈 상태로 둔다.
  // item = {type:"image", src, caption} | {type:"rag", question, answer, source, snippet}
  let reportItems = [];

  // 첨부 자료를 보고서 문서(출처 위)에 섹션으로 주입/갱신.
  const renderItemsIntoReport = () => {
    if (!reportPage) return;
    reportPage.querySelector(".report-attachments")?.remove();
    if (!reportItems.length) return;
    const images = reportItems.filter((it) => it.type === "image");
    const rags = reportItems.filter((it) => it.type === "rag");
    let inner = "";
    if (images.length) {
      inner +=
        `<div class="report-img-grid">` +
        images
          .map(
            (it) =>
              `<figure><img src="${it.src}" alt="" /><figcaption contenteditable="true">${esc(it.caption || "")}</figcaption></figure>`,
          )
          .join("") +
        `</div>`;
    }
    inner += rags
      .map(
        (it) =>
          `<div class="report-finding"><b>RAG 도출 결과</b>` +
          `<p contenteditable="true">질문: ${esc(it.question || "")}</p>` +
          `<p contenteditable="true">결과: ${esc(it.answer || "")}</p>` +
          (it.source
            ? `<p class="rf-src">근거: ${esc(it.source)}${it.snippet ? ` — ${esc(it.snippet)}` : ""}</p>`
            : "") +
          `</div>`,
      )
      .join("");
    const section = `<section class="report-attachments"><h3 contenteditable="true">근거 자료 · 내 작업 결과</h3>${inner}</section>`;
    const footer = reportPage.querySelector("footer");
    if (footer) footer.insertAdjacentHTML("beforebegin", section);
    else reportPage.insertAdjacentHTML("beforeend", section);
  };

  // 구조화 응답 → 편집 가능한 제출 보고서 문서로 렌더.
  const renderReport = (r) => {
    const sections = (r.sections || [])
      .map(
        (s) =>
          `<section><h3 contenteditable="true">${esc(s.heading)}</h3><div class="sec-body" contenteditable="true">${renderBody(s.body)}</div></section>`,
      )
      .join("");

    let table = "";
    if (r.table) {
      const head = r.table.columns.map((c) => `<th>${esc(c)}</th>`).join("");
      const body = r.table.rows
        .map((row) => `<tr>${row.map((c) => `<td contenteditable="true">${esc(c)}</td>`).join("")}</tr>`)
        .join("");
      table = `<section><h3 contenteditable="true">${esc(r.table.caption)}</h3><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
    }

    const sources = (r.sources || [])
      .map((s) =>
        s && typeof s === "object"
          ? `<a class="pill src-link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
          : `<span class="pill">${esc(s)}</span>`,
      )
      .join("");

    reportPage.innerHTML = `
      <header>
        <p>${esc(r.org)} · ${esc(r.report_type)}</p>
        <h2 contenteditable="true">${esc(r.title)}</h2>
        <span>${esc(r.subtitle)}</span>
      </header>
      ${sections}
      ${table}
      <footer><b>출처</b>${sources}</footer>`;
    renderItemsIntoReport(); // 재생성 시에도 첨부 자료 유지
  };

  // ── 내 작업에서 가져오기(아티팩트 picker) ───────────────────────
  const artifactListEl = document.querySelector(".artifact-list");

  const renderArtifactPicker = () => {
    if (!artifactListEl) return;
    const arts = ABC.getArtifacts().slice().reverse(); // 최신 먼저
    if (!arts.length) {
      artifactListEl.innerHTML =
        `<p class="artifact-empty">아직 분석·검색한 자료가 없습니다. 이미지 분석·라벨링이나 RAG 검색을 사용하면 여기에 나타납니다.</p>`;
      return;
    }
    artifactListEl.innerHTML = arts
      .map((a) => {
        const thumb = a.image
          ? `<img src="${a.image}" alt="" />`
          : `<span class="artifact-ic">${a.kind === "rag" ? "⌕" : "▣"}</span>`;
        const sub = a.kind === "rag" ? a.question || a.title : a.caption || a.title;
        return `<div class="artifact-item" data-ts="${a.ts}"><div class="artifact-thumb">${thumb}</div><div class="artifact-meta"><b>${esc(a.title)}</b><small>${esc(sub || "")}</small></div><button type="button" class="btn artifact-add">추가</button></div>`;
      })
      .join("");
  };

  artifactListEl?.addEventListener("click", (e) => {
    if (!e.target.closest(".artifact-add")) return;
    const ts = Number(e.target.closest(".artifact-item")?.dataset.ts);
    const a = ABC.getArtifacts().find((x) => x.ts === ts);
    if (!a) return;
    if (a.kind === "rag") {
      reportItems.push({
        type: "rag",
        question: a.question,
        answer: a.answer,
        source: a.source,
        snippet: a.snippet,
      });
    } else if (a.image) {
      reportItems.push({ type: "image", src: a.image, caption: a.caption || a.title });
    }
    renderThumbs();
    renderItemsIntoReport();
    ABC.toast("보고서에 자료를 추가했습니다");
  });

  renderArtifactPicker();

  // ── 직접 사진 첨부(왼쪽 패널) ───────────────────────────────────
  const imgInput = document.querySelector(".report-image-input");
  const thumbsEl = document.querySelector(".report-thumbs");

  // 이미지 타입 자료만 썸네일로 보여주고 ✕로 개별 삭제.
  const renderThumbs = () => {
    if (!thumbsEl) return;
    thumbsEl.innerHTML = reportItems
      .map((it, i) =>
        it.type === "image"
          ? `<div class="report-thumb"><img src="${it.src}" alt="첨부 ${i + 1}" /><button type="button" class="thumb-del" data-i="${i}" aria-label="삭제">✕</button></div>`
          : "",
      )
      .join("");
  };

  document
    .querySelector(".add-report-image")
    ?.addEventListener("click", () => imgInput?.click());

  imgInput?.addEventListener("change", () => {
    const files = [...(imgInput.files || [])].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    let remaining = files.length;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        reportItems.push({ type: "image", src: String(reader.result || ""), caption: "첨부 사진" });
        if (--remaining === 0) {
          renderThumbs();
          renderItemsIntoReport();
          ABC.toast(`사진 ${files.length}장을 보고서에 추가했습니다`);
        }
      };
      reader.readAsDataURL(file);
    });
    imgInput.value = ""; // 같은 파일 다시 선택 가능
  });

  thumbsEl?.addEventListener("click", (e) => {
    const del = e.target.closest(".thumb-del");
    if (!del) return;
    reportItems.splice(Number(del.dataset.i), 1);
    renderThumbs();
    renderItemsIntoReport();
  });

  // web=true 면 인터넷 웹 검색(Gemini 그라운딩) 기반, false 면 빠른 예시.
  // query 가 있으면(예: RAG에서 넘어온 질문) 그 주제로 생성.
  const generate = async (button, web, query) => {
    const reportType =
      document.querySelector(".select-list .active")?.textContent.trim() || "현황 분석";
    const period = periodLabel();
    const done = button ? ABC.setBusy(button, web ? "웹 검색 중…" : "생성 중") : () => {};
    try {
      const result = await ABC.api(web ? "/api/report/web" : "/api/report", {
        report_type: reportType,
        period,
        sources: activeSources(),
        include_chart: includeChart(),
        query: query || "",
      });
      renderReport(result);
      if (button) {
        ABC.toast(
          result.backend === "GEMINI_WEB"
            ? "웹 검색으로 보고서를 생성했습니다 (출처 클릭 가능, 본문 수정 가능)"
            : "보고서를 생성했습니다 (본문 수정 가능)",
        );
      }
    } catch {
      /* api()가 toast */
    } finally {
      done();
    }
  };

  // 내 웹 활동(질의·검색·이미지 분석·라벨·업로드)을 날짜 범위로 필터해 분석·통계 보고서 생성.
  const generateActivity = async (button) => {
    const reportType =
      document.querySelector(".select-list .active")?.textContent.trim() || "활동 요약";
    const start = startEl?.value || "";
    const end = endEl?.value || "";
    // localStorage 활동을 날짜 범위(ts 기준)로 필터.
    const startMs = start ? new Date(`${start}T00:00:00`).getTime() : -Infinity;
    const endMs = end ? new Date(`${end}T23:59:59`).getTime() : Infinity;
    const activities = ABC.getActivity().filter((a) => a.ts >= startMs && a.ts <= endMs);
    const done = button ? ABC.setBusy(button, "분석 중…") : () => {};
    try {
      const result = await ABC.api("/api/report/activity", {
        activities,
        start,
        end,
        report_type: reportType,
        include_chart: includeChart(),
      });
      renderReport(result);
      if (button) {
        ABC.toast(
          activities.length
            ? `내 활동 ${activities.length}건을 분석해 보고서를 생성했습니다 (본문 수정 가능)`
            : "선택한 기간에 기록된 활동이 없습니다 — 질의·검색·이미지 분석을 사용하면 집계됩니다",
        );
      }
    } catch {
      /* api()가 toast */
    } finally {
      done();
    }
  };

  // "보고서 생성" 버튼 = 내 활동 기반 통계 보고서 생성(기본 동작).
  document
    .querySelector(".report-form .primary")
    ?.addEventListener("click", (e) => generateActivity(e.currentTarget));

  // RAG 검색 결과를 그대로 이어받아 보고서로 생성.
  const generateFromRag = async (ctx) => {
    const reportType =
      document.querySelector(".select-list .active")?.textContent.trim() || "현황 분석";
    const period = periodLabel();
    const btn = document.querySelector(".report-form .primary");
    const done = ABC.setBusy(btn, "생성 중…");
    try {
      const result = await ABC.api("/api/report/from-rag", {
        question: ctx.question,
        answer: ctx.answer,
        sources: ctx.sources,
        report_type: reportType,
        period,
        include_chart: includeChart(),
      });
      renderReport(result);
      ABC.toast("RAG 검색 내용으로 보고서를 생성했습니다 (본문 수정 가능)");
    } catch {
      /* api()가 toast */
    } finally {
      done();
    }
  };

  const params = new URLSearchParams(location.search);
  let ragCtx = null;
  if (params.get("from") === "rag") {
    try {
      ragCtx = JSON.parse(sessionStorage.getItem("ragReport") || "null");
    } catch {
      ragCtx = null;
    }
  }
  const incomingQuery = params.get("q");

  if (ragCtx) {
    generateFromRag(ragCtx);
  } else if (incomingQuery) {
    ABC.toast(`‘${incomingQuery}’ 관련 보고서를 생성합니다…`);
    generate(document.querySelector(".report-form .primary"), true, incomingQuery);
  } else {
    // 기본 진입: 내 웹 활동을 분석한 활동 요약 보고서.
    generateActivity(null);
  }

  // 내보내기/공유는 (수정 반영된) 문서 전체 텍스트를 사용.
  const getReportText = () => reportPage?.innerText.trim() || "보고서";

  document.querySelector(".copy-report")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getReportText());
      ABC.toast("보고서 내용이 복사되었습니다");
    } catch {
      ABC.toast("복사를 지원하지 않는 브라우저입니다");
    }
  });

  document.querySelector(".pdf-report")?.addEventListener("click", () => window.print());

  document.querySelector(".share-report")?.addEventListener("click", async () => {
    const title = reportPage?.querySelector("h2")?.textContent.trim() || "보고서";
    const text = getReportText();
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        ABC.toast("공유를 완료했습니다");
        return;
      }
      await navigator.clipboard.writeText(text);
      ABC.toast("공유 기능이 없어 보고서 내용을 복사했습니다");
    } catch {
      ABC.toast("공유를 취소했거나 지원하지 않습니다");
    }
  });

  // AI 대화 패널이 '이 보고서 내용만' 근거로 답하도록 핸들러 등록.
  ABC.registerAskHandler(
    async (q) => (await ABC.api("/api/ask/context", { context: reportPage.innerText, question: q })).answer,
    "이 보고서 내용을 근거로 답합니다",
  );
});
