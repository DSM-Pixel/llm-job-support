const ABC = (() => {
  // ── 설정 (localStorage 영속) ──────────────────────────────────────
  const SETTINGS_KEY = "gnsoft.settings";
  const DEFAULT_SETTINGS = {
    engine: "Gemini",
    minConf: 0,
    defaultClass: "포트홀",
    notify: true,
  };

  const loadSettings = () => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  };

  let settings = loadSettings();
  const getSettings = () => ({ ...settings });
  const saveSettings = (next) => {
    settings = { ...settings, ...next };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* localStorage 불가 시 무시 */
    }
  };

  const toast = (message) => {
    if (settings.notify === false) return; // 알림 끄기 설정 존중
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }

    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(el.timer);
    el.timer = window.setTimeout(() => el.classList.remove("show"), 1800);
  };

  const setBusy = (button, text = "처리 중") => {
    if (!button) return () => {};
    const original = button.textContent;
    button.disabled = true;
    button.classList.add("is-loading");
    button.textContent = text;

    return () => {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.textContent = original;
    };
  };

  const activateInGroup = (target, selector) => {
    const group = target.parentElement;
    if (!group) return;
    group.querySelectorAll(selector).forEach((item) => item.classList.remove("active"));
    target.classList.add("active");
  };

  // 백엔드 API 호출 헬퍼. GET: api(path) / POST: api(path, bodyObject).
  const api = async (path, body) => {
    const options = body
      ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : { method: "GET" };
    try {
      const response = await fetch(path, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      toast("서버 연결에 실패했습니다");
      throw error;
    }
  };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  // (이전엔 아무 버튼이나 누르면 "~ 완료" 토스트를 띄웠으나, 실제 동작이 없는
  //  버튼도 완료된 것처럼 보여 오해를 주므로 제거했다. 각 핸들러가 직접 토스트한다.)

  // ── 설정 모달 (모든 페이지 사이드바의 ⚙) ────────────────────────
  const buildSettingsModal = () => {
    if (document.querySelector("#settings-modal")) return document.querySelector("#settings-modal");
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "settings-modal";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="설정">
        <header class="modal-head">
          <h3>⚙ 설정</h3>
          <button class="modal-close" type="button" aria-label="닫기">✕</button>
        </header>
        <div class="modal-body">
          <div class="modal-form">
            <label class="field">탐지 엔진
              <select name="engine">
                <option value="Gemini">Gemini (VLM)</option>
                <option value="YOLO-World">YOLO-World</option>
              </select>
            </label>
            <label class="field">기본 신뢰도 임계값 <span class="set-conf-val"></span>
              <input type="range" name="minConf" min="0" max="100" step="5" />
            </label>
            <label class="field">기본 클래스명
              <input type="text" name="defaultClass" />
            </label>
            <label class="field row">토스트 알림 표시
              <input type="checkbox" name="notify" />
            </label>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn modal-cancel" type="button">취소</button>
          <button class="btn primary modal-save-settings" type="button">저장</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.hidden = true;
    };
    overlay._fill = () => {
      overlay.querySelector("[name=engine]").value = settings.engine;
      overlay.querySelector("[name=minConf]").value = settings.minConf;
      overlay.querySelector("[name=defaultClass]").value = settings.defaultClass;
      overlay.querySelector("[name=notify]").checked = settings.notify !== false;
      overlay.querySelector(".set-conf-val").textContent = `${settings.minConf}%`;
    };

    overlay.querySelector("[name=minConf]").addEventListener("input", (e) => {
      overlay.querySelector(".set-conf-val").textContent = `${e.target.value}%`;
    });
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.querySelector(".modal-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector(".modal-save-settings").addEventListener("click", () => {
      saveSettings({
        engine: overlay.querySelector("[name=engine]").value,
        minConf: Number(overlay.querySelector("[name=minConf]").value) || 0,
        defaultClass: overlay.querySelector("[name=defaultClass]").value.trim() || "객체",
        notify: overlay.querySelector("[name=notify]").checked,
      });
      close();
      toast("설정을 저장했습니다");
    });
    return overlay;
  };

  const openSettings = () => {
    const overlay = buildSettingsModal();
    overlay._fill();
    overlay.hidden = false;
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".gear").forEach((gear) => {
      gear.style.cursor = "pointer";
      gear.setAttribute("role", "button");
      gear.setAttribute("tabindex", "0");
      gear.addEventListener("click", openSettings);
      gear.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openSettings();
        }
      });
    });
    document.addEventListener("keydown", (e) => {
      const modal = document.querySelector("#settings-modal");
      if (e.key === "Escape" && modal && !modal.hidden) modal.hidden = true;
    });

    // 상단 ?/♧ 정리: 클로바(♧) 제거, ?는 사용법 모달로.
    document.querySelectorAll(".top-actions span").forEach((s) => {
      const t = s.textContent.trim();
      if (t === "♧" || t === "♣") {
        s.remove();
      } else if (t === "?") {
        s.classList.add("help-trigger");
        s.title = "사용법 보기";
        s.style.cursor = "pointer";
        s.setAttribute("role", "button");
        s.addEventListener("click", () => openHelp());
      }
    });
  });

  // ── 사용법 모달 (화살표로 페이지별 안내) ────────────────────────
  const HELP_SLIDES = [
    {
      key: "dashboard",
      title: "메인 대시보드",
      body: [
        "오늘의 운영 현황(색인 문서·라벨·모델 정확도·처리량)을 한눈에 봅니다.",
        "‘빠른 작업’ 카드로 RAG 검색·라벨링·보고서·질의 화면으로 바로 이동합니다.",
      ],
    },
    {
      key: "query",
      title: "자연어 질의",
      body: [
        "궁금한 것을 자연어로 물어보면 웹 검색 기반으로 답하고 출처를 함께 보여줍니다.",
        "질문 의도에 맞는 작업 화면(RAG·라벨링·보고서) 바로가기 버튼도 제시합니다.",
      ],
    },
    {
      key: "rag",
      title: "RAG 공공데이터 검색",
      body: [
        "질문하면 색인된 문서를 근거로 답하고, 아래에 근거 파일·내용을 보여줍니다.",
        "내 문서 업로드·웹 검색으로 문서를 추가하고, 참고 파일을 클릭해 열람하거나 ✕로 삭제합니다.",
      ],
    },
    {
      key: "labeling",
      title: "이미지 분석·라벨링",
      body: [
        "이미지를 ‘교체’로 올린 뒤 ‘분석하기’로 설명 분석, ‘크게 열어 라벨링’으로 박스 라벨링을 합니다.",
        "모달에서 드래그로 박스 그리기·AI 자동 탐지·COCO/YOLO 내보내기·저장이 가능하고, 이미지에 대해 AI에게 물어볼 수 있습니다.",
      ],
    },
    {
      key: "report",
      title: "요약·보고서 생성",
      body: [
        "유형·데이터 소스·기간·통계차트 포함 여부를 고르고 ‘보고서 생성’을 누르면 웹 검색 기반으로 문서를 만듭니다.",
        "본문은 클릭해서 직접 수정할 수 있고, 보고서 내용에 대해 AI에게 물어볼 수 있습니다.",
      ],
    },
    {
      key: "data",
      title: "데이터 관리",
      body: [
        "데이터셋을 검색·필터하고, ‘업로드’로 파일을 추가합니다.",
        "각 행의 ⋮ 메뉴에서 미리보기·이름 수정·삭제를 할 수 있습니다.",
      ],
    },
  ];

  let helpModal = null;
  let helpIndex = 0;

  const buildHelpModal = () => {
    if (helpModal) return helpModal;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "help-modal";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="modal help-modal" role="dialog" aria-modal="true" aria-label="사용법">
        <header class="modal-head"><h3>사용법 안내</h3>
          <button class="modal-close" type="button" aria-label="닫기">✕</button></header>
        <div class="modal-body">
          <div class="help-slide">
            <div class="help-badge"></div>
            <h4 class="help-title"></h4>
            <ul class="help-list"></ul>
          </div>
        </div>
        <div class="modal-foot help-foot">
          <button class="btn help-prev" type="button">← 이전</button>
          <span class="help-dots"></span>
          <button class="btn primary help-next" type="button">다음 →</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.hidden = true;
    };
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector(".help-prev").addEventListener("click", () => {
      helpIndex = (helpIndex - 1 + HELP_SLIDES.length) % HELP_SLIDES.length;
      renderHelp();
    });
    overlay.querySelector(".help-next").addEventListener("click", () => {
      helpIndex = (helpIndex + 1) % HELP_SLIDES.length;
      renderHelp();
    });
    document.addEventListener("keydown", (e) => {
      if (overlay.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") overlay.querySelector(".help-next").click();
      if (e.key === "ArrowLeft") overlay.querySelector(".help-prev").click();
    });
    helpModal = overlay;
    return overlay;
  };

  const renderHelp = () => {
    const s = HELP_SLIDES[helpIndex];
    const m = helpModal;
    m.querySelector(".help-badge").textContent = `${helpIndex + 1} / ${HELP_SLIDES.length}`;
    m.querySelector(".help-title").textContent = s.title;
    m.querySelector(".help-list").innerHTML = s.body
      .map((b) => `<li>${escapeHtml(b)}</li>`)
      .join("");
    m.querySelector(".help-dots").innerHTML = HELP_SLIDES.map(
      (_, i) => `<i class="help-dot${i === helpIndex ? " on" : ""}"></i>`,
    ).join("");
  };

  const openHelp = () => {
    buildHelpModal();
    // 현재 페이지에 해당하는 슬라이드부터 시작.
    const path = (location.pathname.split("/").pop() || "").replace(".html", "");
    const idx = HELP_SLIDES.findIndex((s) => path.includes(s.key));
    helpIndex = idx >= 0 ? idx : 0;
    renderHelp();
    helpModal.hidden = false;
  };

  return {
    toast,
    setBusy,
    activateInGroup,
    api,
    escapeHtml,
    getSettings,
    saveSettings,
    openSettings,
    openHelp,
  };
})();
