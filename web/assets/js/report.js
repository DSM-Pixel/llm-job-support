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

  const getReportText = () => {
    const title = document.querySelector(".report-page header h2")?.textContent.trim() || "도로 파손 현황 분석 보고서";
    const summary = document.querySelector(".report-page section p")?.textContent.trim() || "";
    return `${title}\n\n${summary}`;
  };

  document.querySelector(".copy-report")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getReportText());
      ABC.toast("보고서 내용이 복사되었습니다");
    } catch {
      ABC.toast("복사를 지원하지 않는 브라우저입니다");
    }
  });

  document.querySelector(".pdf-report")?.addEventListener("click", () => {
    window.print();
  });

  document.querySelector(".share-report")?.addEventListener("click", async () => {
    const title = document.querySelector(".report-page header h2")?.textContent.trim() || "보고서";
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
});
