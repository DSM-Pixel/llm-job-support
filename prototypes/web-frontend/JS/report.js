document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll(".select-list button, .chips .pill")
    .forEach((item) => {
      item.addEventListener("click", () =>
        ABC.activateInGroup(
          item,
          item.tagName === "BUTTON" ? "button" : ".pill",
        ),
      );
    });

  document.querySelectorAll(".source-toggle .switch").forEach((switchEl) => {
    const row = switchEl.closest(".source-toggle");
    row?.classList.toggle("is-off", switchEl.classList.contains("off"));

    switchEl.addEventListener("click", () => {
      switchEl.classList.toggle("off");
      row?.classList.toggle("is-off", switchEl.classList.contains("off"));
    });
  });

  document
    .querySelector(".report-form .primary")
    ?.addEventListener("click", (event) => {
      const done = ABC.setBusy(event.currentTarget, "생성 중");
      window.setTimeout(() => {
        const type =
          document.querySelector(".select-list .active")?.textContent.trim() ||
          "현황 분석";
        const period =
          document.querySelector(".chips .active")?.textContent.trim() ||
          "최근 3년";
        document.querySelector(".report-page header h2").textContent =
          `도로 파손 ${type.replace(/[▥▤▢]/g, "").trim()} 보고서`;
        document.querySelector(".report-page header span").textContent =
          `생성일 2026.6.22 · 소스 3개 · ${period}`;
        done();
        ABC.toast("보고서 미리보기가 갱신되었습니다");
      }, 550);
    });
});
