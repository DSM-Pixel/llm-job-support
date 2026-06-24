document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.querySelector("tbody");
  const search = document.querySelector(".search-upload input");
  const uploadBtn = document.querySelector(".search-upload .primary");

  const ICONS = { 라벨: "◇", 원본: "▧", 공공데이터: "▱", 문서: "▤" };

  const rowHtml = (d) => `<tr>
    <td><input type="checkbox"></td>
    <td><b class="name-cell"><span class="name-icon">${ICONS[d.kind] || "▱"}</span>${ABC.escapeHtml(d.name)}</b></td>
    <td>${ABC.escapeHtml(d.kind)}</td>
    <td>${ABC.escapeHtml(d.count)}</td>
    <td class="mono">${ABC.escapeHtml(d.fmt)}</td>
    <td><span class="status ${d.tone}">${ABC.escapeHtml(d.state)}</span></td>
    <td>${ABC.escapeHtml(d.date)}<small>${ABC.escapeHtml(d.owner)}</small></td>
    <td class="row-actions"><button class="row-menu" type="button" aria-label="더보기">⋮</button></td></tr>`;

  // 서버에서 데이터셋 목록을 받아 테이블을 채운다. 실패 시 HTML 기본 행 유지.
  try {
    const data = await ABC.api("/api/datasets");
    if (tbody && data.datasets) tbody.innerHTML = data.datasets.map(rowHtml).join("");
  } catch {
    /* 기본 행 사용 */
  }

  const filterRows = () => {
    const keyword = (search?.value || "").trim().toLowerCase();
    const active = document.querySelector(".chips .active")?.textContent.trim();
    tbody.querySelectorAll("tr").forEach((row) => {
      const text = row.textContent.toLowerCase();
      const type = row.children[2]?.textContent.trim();
      const matchesKeyword = !keyword || text.includes(keyword);
      const matchesType =
        active === "전체" || type === active || (active === "원본 이미지" && type === "원본");
      row.hidden = !(matchesKeyword && matchesType);
    });
  };

  document.querySelectorAll(".chips .pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      ABC.activateInGroup(pill, ".pill");
      filterRows();
    });
  });
  search?.addEventListener("input", filterRows);

  document.querySelector("thead input[type='checkbox']")?.addEventListener("change", (event) => {
    tbody.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = event.target.checked;
    });
  });

  // 행 아무 곳이나 클릭해도 체크 토글(체크박스·⋮메뉴·이름 편집 중은 제외).
  tbody.addEventListener("click", (e) => {
    if (
      e.target.closest("input[type='checkbox']") ||
      e.target.closest(".row-menu") ||
      e.target.closest("[contenteditable='true']")
    ) {
      return;
    }
    const cb = e.target.closest("tr")?.querySelector("input[type='checkbox']");
    if (cb) cb.checked = !cb.checked;
  });

  // ── 업로드: 파일 선택 → 표에 새 행 추가(업로드 대기) ──────────────
  const guessKind = (name) => {
    const ext = name.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "bmp", "mp4"].includes(ext)) return "원본";
    if (["json", "coco", "xml"].includes(ext)) return "라벨";
    if (["csv"].includes(ext)) return "공공데이터";
    if (["md", "txt", "pdf"].includes(ext)) return "문서";
    return "원본";
  };

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.hidden = true;
  document.body.appendChild(fileInput);

  uploadBtn?.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const files = [...fileInput.files];
    if (!files.length) return;
    const done = ABC.setBusy(uploadBtn, "업로드 중");
    try {
      await ABC.api("/api/datasets/upload", { name: files.map((f) => f.name).join(", ") });
      ABC.logActivity("데이터 업로드", files.map((f) => f.name).join(", "));
      files.forEach((f) => {
        tbody.insertAdjacentHTML(
          "afterbegin",
          rowHtml({
            name: f.name,
            kind: guessKind(f.name),
            count: "—",
            fmt: (f.name.split(".").pop() || "FILE").toUpperCase(),
            state: "업로드 대기",
            tone: "gray",
            date: "방금",
            owner: "나",
          }),
        );
      });
      filterRows();
      ABC.toast(`${files.length}개 파일을 데이터셋에 추가했습니다 (업로드 대기)`);
    } catch {
      /* handled */
    } finally {
      done();
      fileInput.value = "";
    }
  });

  // ── ⋮ 행 메뉴: 미리보기 / 이름 수정 / 삭제 ──────────────────────
  const menu = document.createElement("div");
  menu.className = "row-pop";
  menu.hidden = true;
  menu.innerHTML =
    '<button type="button" data-act="preview">미리보기</button>' +
    '<button type="button" data-act="edit">이름 수정</button>' +
    '<button type="button" data-act="delete">삭제</button>';
  document.body.appendChild(menu);
  let menuRow = null;

  const closeMenu = () => {
    menu.hidden = true;
    menuRow = null;
  };
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".row-pop") && !e.target.closest(".row-menu")) closeMenu();
  });

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".row-menu");
    if (!btn) return;
    menuRow = e.target.closest("tr");
    const r = btn.getBoundingClientRect();
    menu.style.left = `${r.right - 130 + window.scrollX}px`;
    menu.style.top = `${r.bottom + 4 + window.scrollY}px`;
    menu.hidden = false;
  });

  // 미리보기 모달(공통 modal 재사용).
  const previewModal = document.createElement("div");
  previewModal.className = "modal-overlay";
  previewModal.hidden = true;
  previewModal.innerHTML =
    '<div class="modal"><header class="modal-head"><h3>데이터셋 미리보기</h3>' +
    '<button class="modal-close" type="button" aria-label="닫기">✕</button></header>' +
    '<div class="modal-body"><div class="modal-form preview-body"></div></div></div>';
  document.body.appendChild(previewModal);
  previewModal.querySelector(".modal-close").addEventListener("click", () => {
    previewModal.hidden = true;
  });
  previewModal.addEventListener("click", (e) => {
    if (e.target === previewModal) previewModal.hidden = true;
  });

  // 이미지 데이터셋 미리보기용 대표 도로 프레임을 캔버스로 생성(샘플 — 실제 파일 없음).
  const roadFrame = (seed, w = 360, h = 200) => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#3a4150");
    g.addColorStop(1, "#23272f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 360; i++) {
      const x = (Math.sin(seed * 12.9 + i * 7.1) * 0.5 + 0.5) * w;
      const y = (Math.cos(seed * 4.3 + i * 3.7) * 0.5 + 0.5) * h;
      ctx.fillStyle = `rgba(255,255,255,${(i % 5) * 0.012})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.strokeStyle = "rgba(230,225,200,0.6)";
    ctx.lineWidth = 6;
    ctx.setLineDash([22, 18]);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h);
    ctx.lineTo(w * 0.5 + 8, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    const cx = w * (0.3 + (seed % 3) * 0.14);
    const cy = h * 0.62;
    const r = 24 + (seed % 4) * 6;
    ctx.fillStyle = "#15171c";
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.4) {
      const rr = r * (0.78 + 0.3 * Math.sin(a * 3 + seed));
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.7;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();
    return cv.toDataURL("image/jpeg", 0.8);
  };

  const showPreview = (row) => {
    const c = row.children;
    const fields = {
      이름: c[1].innerText.trim(),
      유형: c[2].innerText.trim(),
      "항목 수": c[3].innerText.trim(),
      형식: c[4].innerText.trim(),
      "검수 상태": c[5].innerText.trim(),
      업데이트: c[6].innerText.trim(),
    };
    // 이미지성 데이터셋(원본·라벨, JPG/PNG/BMP/MP4)은 대표 프레임 미리보기를 함께 보여준다.
    const kind = fields["유형"];
    const fmt = fields["형식"].toUpperCase();
    const isImage =
      kind === "원본" ||
      kind === "라벨" ||
      /JPG|JPEG|PNG|BMP|MP4|프레임|COCO/.test(fmt);
    const seed = fields["이름"].length;
    const frames = isImage
      ? `<div class="preview-frames">${[0, 1, 2]
          .map(
            (i) =>
              `<img class="preview-frame" src="${roadFrame(seed + i * 3)}" alt="대표 프레임 ${i + 1}" />`,
          )
          .join("")}</div><p class="preview-note">대표 프레임 미리보기 (샘플)</p>`
      : "";
    const rows = Object.entries(fields)
      .map(
        ([k, v]) =>
          `<div class="field row"><span>${ABC.escapeHtml(k)}</span><b>${ABC.escapeHtml(v)}</b></div>`,
      )
      .join("");
    previewModal.querySelector(".preview-body").innerHTML = frames + rows;
    previewModal.hidden = false;
  };

  // 삭제 확인 모달(공통 modal 재사용) — 삭제 전 한 번 더 묻는다.
  const confirmModal = document.createElement("div");
  confirmModal.className = "modal-overlay";
  confirmModal.hidden = true;
  confirmModal.innerHTML =
    '<div class="modal confirm-modal"><header class="modal-head"><h3>데이터셋 삭제</h3>' +
    '<button class="modal-close" type="button" aria-label="닫기">✕</button></header>' +
    '<div class="modal-body"><p class="confirm-text"></p></div>' +
    '<div class="modal-foot"><button class="btn modal-cancel" type="button">취소</button>' +
    '<button class="btn danger confirm-delete" type="button">삭제</button></div></div>';
  document.body.appendChild(confirmModal);

  let pendingDeleteRow = null;
  const closeConfirm = () => {
    confirmModal.hidden = true;
    pendingDeleteRow = null;
  };
  confirmModal.querySelector(".modal-close").addEventListener("click", closeConfirm);
  confirmModal.querySelector(".modal-cancel").addEventListener("click", closeConfirm);
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirm();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !confirmModal.hidden) closeConfirm();
  });
  confirmModal.querySelector(".confirm-delete").addEventListener("click", () => {
    if (pendingDeleteRow) {
      pendingDeleteRow.remove();
      ABC.toast("데이터셋을 삭제했습니다");
    }
    closeConfirm();
  });

  const askDelete = (row) => {
    const name = row.children[1]?.innerText.trim() || "이 데이터셋";
    confirmModal.querySelector(".confirm-text").innerHTML =
      `<b>${ABC.escapeHtml(name)}</b> 을(를) 삭제할까요?<br />이 작업은 되돌릴 수 없습니다.`;
    pendingDeleteRow = row;
    confirmModal.hidden = false;
  };

  menu.addEventListener("click", (e) => {
    const act = e.target.closest("button")?.dataset.act;
    if (!act || !menuRow) return;
    const row = menuRow;
    closeMenu();
    if (act === "delete") {
      askDelete(row); // 바로 지우지 않고 확인 모달을 띄운다
    } else if (act === "edit") {
      const cell = row.querySelector(".name-cell");
      cell.setAttribute("contenteditable", "true");
      cell.focus();
      ABC.toast("이름을 수정한 뒤 Enter를 누르세요");
      const onKey = (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          cell.removeAttribute("contenteditable");
          cell.removeEventListener("keydown", onKey);
          ABC.toast("이름을 수정했습니다");
        }
      };
      cell.addEventListener("keydown", onKey);
    } else if (act === "preview") {
      showPreview(row);
    }
  });
});
