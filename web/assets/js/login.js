// 로그인·회원가입 — 필수 동의(이용약관·개인정보) 없으면 가입 불가.
// 성공 시 gnsoft.auth 에 세션 저장 → 프로젝트 선택 화면으로.
(() => {
  const $ = (s) => document.querySelector(s);

  // 이미 로그인돼 있으면 바로 프로젝트 선택으로.
  try {
    if (localStorage.getItem("gnsoft.auth")) {
      location.replace("projects.html");
      return;
    }
  } catch {
    /* 무시 */
  }

  // ── 약관·개인정보 전문 (개인정보보호법 제15조 고지 항목 포함) ──
  const DOCS = {
    terms: {
      title: "서비스 이용약관",
      body: `제1조 (목적)
이 약관은 지엔소프트(주)(이하 "회사")가 제공하는 GNSoft AI 플랫폼(이하 "서비스")의 이용 조건 및 절차, 회사와 회원 간의 권리·의무를 규정함을 목적으로 합니다.

제2조 (정의)
"서비스"란 자연어 질의, 문서 지식 검색, 공공데이터 통계, 이미지 분석·라벨링, 업무 자동화, 보고서 생성 등 회사가 제공하는 일체의 기능을 말합니다. "회원"이란 본 약관에 동의하고 계정을 등록한 자를 말합니다.

제3조 (약관의 효력과 변경)
회사는 약관을 변경할 수 있으며, 변경 시 적용일 7일 전부터 서비스 내 공지합니다. 회원이 변경 약관에 동의하지 않는 경우 탈퇴할 수 있습니다.

제4조 (서비스의 제공과 중단)
회사는 시스템 점검·장애 등 부득이한 경우 서비스 제공을 일시 중단할 수 있으며, 사전 또는 사후에 공지합니다. 본 서비스는 프로젝트형 일경험 데모 플랫폼으로, AI가 생성한 결과(분석·라벨·보고서)는 참고용이며 정확성을 보증하지 않습니다.

제5조 (회원의 의무)
회원은 타인의 정보 도용, 서비스의 부정 이용, 개인정보(차량번호·얼굴 등)가 포함된 데이터의 무단 업로드를 해서는 안 됩니다. 업로드 데이터의 권리·라이선스 책임은 회원에게 있습니다.

제6조 (지식재산권)
서비스와 그 구성요소에 대한 권리는 회사에 있으며, 회원이 업로드한 데이터의 권리는 회원에게 있습니다.

제7조 (면책)
회사는 천재지변, 회원의 귀책사유로 인한 손해에 대해 책임지지 않습니다.

제8조 (준거법)
본 약관은 대한민국 법률에 따라 해석됩니다.`,
    },
    privacy: {
      title: "개인정보 수집·이용 동의",
      body: `지엔소프트(주)는 「개인정보 보호법」 제15조에 따라 아래와 같이 개인정보를 수집·이용합니다.

1. 수집 항목
- (필수) 이메일 주소, 이름, 비밀번호(암호화하여 저장)
- (선택) 회사·기관명, 부서·직함

2. 수집·이용 목적
- 회원 식별 및 로그인 등 서비스 제공
- 프로젝트·작업 기록의 계정 연결
- 문의 대응 및 공지 전달

3. 보유·이용 기간
- 회원 탈퇴 시 지체 없이 파기합니다.
- 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.

4. 제3자 제공
- 수집한 개인정보를 제3자에게 제공하지 않습니다.

5. 동의 거부 권리 및 불이익
- 귀하는 개인정보 수집·이용에 동의하지 않을 권리가 있습니다.
- 다만 필수 항목 동의를 거부할 경우 회원가입 및 서비스 이용이 제한됩니다.

6. 개인정보 처리 위탁
- 서비스 운영을 위한 처리 위탁이 발생할 경우 사전 고지합니다.

문의: 지엔소프트(주) 개인정보 보호책임자 (대전 유성구 문지로 272-16 AI인공지능센터)`,
    },
  };

  // ── 폼 안 인라인 알림 — 화면 구석 토스트 대신 카드 안에 크게 표시 ──
  const alertIn = (form, msg, ok = false) => {
    const el = form.querySelector(".lg-alert");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("ok", ok);
    el.hidden = false;
  };
  const clearAlerts = () => {
    document.querySelectorAll(".lg-alert").forEach((el) => {
      el.hidden = true;
    });
  };

  const api = async (path, body) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  // ── 성공 처리: 세션 저장 + 프로필 설정 동기화 → 프로젝트 선택 ──
  const enter = (data) => {
    try {
      localStorage.setItem(
        "gnsoft.auth",
        JSON.stringify({ token: data.token, ...data.user }),
      );
      // 사이드바 프로필(이름·소속)을 계정 정보로 동기화.
      const s = JSON.parse(localStorage.getItem("gnsoft.settings") || "{}");
      s.name = data.user.name;
      // 슈퍼 어드민(순수 운영자)은 소속·직함이 없다.
      s.team = data.user.is_super
        ? ""
        : [data.user.company, data.user.team].filter(Boolean).join(" · ");
      localStorage.setItem("gnsoft.settings", JSON.stringify(s));
    } catch {
      /* 무시 */
    }
    // 슈퍼 어드민(순수 운영자)은 관리 전용 콘솔로, 그 외에는 프로젝트 선택으로.
    location.replace(data.user && data.user.is_super ? "admin.html" : "projects.html");
  };

  // ── 회원가입 모달 열기/닫기 ──
  const modalOf = { signup: $("#signup-modal") };
  const openModal = (key) => {
    clearAlerts(); // 열 때 이전 알림은 지운다
    // 회원가입은 항상 입력 폼부터(이전에 인증 단계로 넘어갔던 상태 초기화).
    if (key === "signup" && typeof showSignupForm === "function") showSignupForm();
    if (modalOf[key]) modalOf[key].hidden = false;
  };
  const closeModal = (key) => {
    if (modalOf[key]) modalOf[key].hidden = true;
  };
  document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openModal(b.dataset.open)));
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal(b.dataset.close)));
  // 모달의 ✕ 버튼 · 바깥 배경 클릭으로 닫기
  Object.entries(modalOf).forEach(([key, overlay]) => {
    overlay.querySelector(".modal-close").addEventListener("click", () => closeModal(key));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(key);
    });
  });

  // ── 로그인 ↔ 비밀번호 찾기 — 모달 없이 카드 안에서 전환 ──
  const cardForms = { login: $('[data-form="login"]'), reset: $('[data-form="reset"]') };
  const showView = (name) => {
    clearAlerts();
    Object.entries(cardForms).forEach(([k, f]) => (f.hidden = k !== name));
  };
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));

  // ── 동의 체크(전체 동의 연동) ──
  const consents = () => [...document.querySelectorAll('[data-consent]:not([data-consent="all"])')];
  const allBox = $('[data-consent="all"]');
  allBox?.addEventListener("change", () => {
    consents().forEach((c) => (c.checked = allBox.checked));
  });
  consents().forEach((c) =>
    c.addEventListener("change", () => {
      allBox.checked = consents().every((x) => x.checked);
    }),
  );

  // ── 약관 전문 모달 ──
  const docModal = $("#doc-modal");
  let curDoc = null;
  document.querySelectorAll(".lg-view").forEach((b) =>
    b.addEventListener("click", () => {
      curDoc = b.dataset.doc;
      docModal.querySelector(".doc-title").textContent = DOCS[curDoc].title;
      docModal.querySelector(".doc-body").textContent = DOCS[curDoc].body;
      docModal.hidden = false;
    }),
  );
  docModal.querySelector(".modal-close").addEventListener("click", () => (docModal.hidden = true));
  docModal.addEventListener("click", (e) => {
    if (e.target === docModal) docModal.hidden = true;
  });
  docModal.querySelector(".doc-agree").addEventListener("click", () => {
    const cb = document.querySelector(`[data-consent="${curDoc}"]`);
    if (cb) {
      cb.checked = true;
      cb.dispatchEvent(new Event("change"));
    }
    docModal.hidden = true;
  });

  // ── 회사 검색·선택 (검색창 하나로 통합) ──
  // 회사 이름을 치면 등록된 회사가 뜨고, 없으면 드롭다운에서 바로 '새로 등록'.
  //   기존 회사 선택 → 직원(company_id) · 새 회사 등록 → 관리자 신청(admin_request)
  const signupForm = $('[data-form="signup"]');
  const compSearch = signupForm.querySelector('[name="company_search"]');
  const compList = signupForm.querySelector(".lg-combo-list");
  const compHint = signupForm.querySelector('[data-role="company-hint"]');
  const HINT_DEFAULT = compHint.innerHTML;
  let selectedCompanyId = "";
  let newCompanyName = "";
  const _norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase();
  const esc = (s) => String(s).replace(/</g, "&lt;");

  const renderComps = (items) => {
    const q = compSearch.value.trim();
    const rows = items.map(
      (x) => `<button type="button" class="lg-combo-item" data-id="${x.id}">${esc(x.name)}</button>`,
    );
    // 입력값과 (정규화) 일치하는 회사가 없으면 '새로 등록' 항목을 준다.
    const exact = items.some((x) => _norm(x.name) === _norm(q));
    if (q && !exact) {
      rows.push(
        `<button type="button" class="lg-combo-item lg-combo-new" data-new="1">` +
          `<b>‘${esc(q)}’</b> 새 회사로 등록 <span>· 관리자 신청</span></button>`,
      );
    }
    if (!rows.length) {
      compList.hidden = true;
      return;
    }
    compList.innerHTML = rows.join("");
    compList.hidden = false;
  };
  const searchComps = async () => {
    // 편집하면 이전 선택은 무효화(정확히 고른 것만 유효).
    selectedCompanyId = "";
    newCompanyName = "";
    compHint.innerHTML = HINT_DEFAULT;
    try {
      const res = await fetch(`/api/companies?q=${encodeURIComponent(compSearch.value.trim())}`);
      const d = await res.json();
      renderComps(d.companies || []);
    } catch {
      compList.hidden = true;
    }
  };
  let compTimer = null;
  compSearch?.addEventListener("input", () => {
    clearTimeout(compTimer);
    compTimer = setTimeout(searchComps, 160);
  });
  compSearch?.addEventListener("focus", searchComps);
  compList?.addEventListener("click", (e) => {
    const item = e.target.closest(".lg-combo-item");
    if (!item) return;
    if (item.dataset.new) {
      // 새 회사 등록 = 관리자 신청.
      newCompanyName = compSearch.value.trim();
      selectedCompanyId = "";
      compHint.innerHTML = `✓ 새 회사 <b>‘${esc(newCompanyName)}’</b> 등록 — 승인 후 관리자 권한이 활성화됩니다.`;
    } else {
      selectedCompanyId = item.dataset.id;
      newCompanyName = "";
      compSearch.value = item.textContent;
      compHint.textContent = "✓ 회사를 선택했습니다.";
    }
    compList.hidden = true;
  });
  document.addEventListener("click", (e) => {
    if (compList && !compList.contains(e.target) && e.target !== compSearch) compList.hidden = true;
  });

  // ── 로그인 ──
  $('[data-form="login"]').addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    clearAlerts();
    try {
      const r = await api("/api/auth/login", {
        email: f.email.value.trim(),
        password: f.password.value,
      });
      if (!r.ok) return alertIn(f, r.error || "로그인에 실패했습니다");
      enter(r);
    } catch {
      alertIn(f, "서버 연결에 실패했습니다");
    }
  });

  // ── 회원가입 ──
  $('[data-form="signup"]').addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    clearAlerts();
    if (f.password.value !== f.password2.value) return alertIn(f, "비밀번호가 서로 다릅니다");
    const agree = (k) => document.querySelector(`[data-consent="${k}"]`).checked;
    if (!agree("terms") || !agree("privacy")) {
      return alertIn(f, "필수 약관(이용약관·개인정보 수집이용)에 동의해주세요");
    }
    // 소속: 기존 회사 선택 → 직원(company_id), 새 회사 등록 → 관리자 신청.
    const companyPayload = {};
    if (selectedCompanyId) {
      companyPayload.company_id = selectedCompanyId;
    } else if (newCompanyName) {
      companyPayload.company = newCompanyName;
      companyPayload.admin_request = true;
    } else {
      return alertIn(f, "회사를 검색해 선택하거나, 목록에 없으면 ‘새 회사로 등록’을 선택해주세요");
    }
    try {
      const r = await api("/api/auth/signup", {
        email: f.email.value.trim(),
        password: f.password.value,
        name: f.name.value.trim(),
        team: f.team.value.trim(),
        agree_terms: agree("terms"),
        agree_privacy: agree("privacy"),
        agree_marketing: agree("marketing"),
        ...companyPayload,
      });
      if (!r.ok) return alertIn(f, r.error || "가입에 실패했습니다");
      // 계정은 아직 안 만들어졌다 — 이메일 인증(코드 입력) 단계로 전환.
      pendingEmail = f.email.value.trim();
      showVerify(pendingEmail, r.dev_code);
    } catch {
      alertIn(f, "서버 연결에 실패했습니다");
    }
  });

  // ── 이메일 인증(코드 입력) ──
  let pendingEmail = "";
  const signupModal = $("#signup-modal");
  const verifyPanel = signupModal.querySelector('[data-role="verify"]');
  const verifyAlertEl = signupModal.querySelector('[data-role="verify-alert"]');
  const devcodeEl = signupModal.querySelector('[data-role="devcode"]');
  const codeInput = signupModal.querySelector('[name="verify_code"]');

  const vAlert = (msg, ok = false) => {
    verifyAlertEl.textContent = msg;
    verifyAlertEl.classList.toggle("ok", ok);
    verifyAlertEl.hidden = false;
  };
  const showDevCode = (code) => {
    if (code) {
      devcodeEl.textContent = `데모용 코드(메일 미설정): ${code}`;
      devcodeEl.hidden = false;
    } else {
      devcodeEl.hidden = true;
    }
  };
  const showVerify = (email, devCode) => {
    signupForm.hidden = true;
    verifyPanel.hidden = false;
    verifyAlertEl.hidden = true;
    signupModal.querySelector('[data-role="verify-email"]').textContent = email;
    codeInput.value = "";
    showDevCode(devCode);
    codeInput.focus();
  };
  const showSignupForm = () => {
    verifyPanel.hidden = true;
    signupForm.hidden = false;
  };

  const submitVerify = async () => {
    const code = codeInput.value.trim();
    if (code.length !== 6) return vAlert("6자리 인증 코드를 입력해주세요");
    try {
      const r = await api("/api/auth/verify-signup", { email: pendingEmail, code });
      if (!r.ok) return vAlert(r.error || "인증에 실패했습니다");
      vAlert(r.message || "인증 완료!", true);
      setTimeout(() => enter(r), 700);
    } catch {
      vAlert("서버 연결에 실패했습니다");
    }
  };
  signupModal.querySelector('[data-role="verify-btn"]').addEventListener("click", submitVerify);
  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitVerify();
  });
  signupModal.querySelector('[data-role="resend"]').addEventListener("click", async () => {
    try {
      const r = await api("/api/auth/resend-code", { email: pendingEmail });
      if (!r.ok) return vAlert(r.error || "재전송에 실패했습니다");
      vAlert("인증 코드를 다시 보냈습니다. 메일함을 확인해주세요.", true);
      showDevCode(r.dev_code);
    } catch {
      vAlert("서버 연결에 실패했습니다");
    }
  });
  signupModal.querySelector('[data-role="verify-back"]').addEventListener("click", showSignupForm);

  // ── 비밀번호 찾기 — 이메일로 재설정 링크 요청 ──
  $('[data-form="reset"]').addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    clearAlerts();
    try {
      const r = await api("/api/auth/reset-request", { email: f.email.value.trim() });
      if (!r.ok) return alertIn(f, r.error || "요청에 실패했습니다");
      // 데모: 메일러가 없어 백엔드가 재설정 링크(dev_link)를 함께 준다 → 화면에 노출.
      const msg = r.dev_link
        ? `재설정 링크(데모): ${location.origin}${r.dev_link}`
        : r.message || "재설정 링크를 이메일로 보냈습니다. 메일함을 확인해주세요.";
      alertIn(f, msg, true);
      f.reset();
    } catch {
      alertIn(f, "서버 연결에 실패했습니다");
    }
  });
})();
