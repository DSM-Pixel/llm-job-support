document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".mode-tabs button").forEach((button) => {
    button.addEventListener("click", () => ABC.activateInGroup(button, "button"));
  });

  document.querySelectorAll(".radio-list label").forEach((label) => {
    label.addEventListener("click", () => ABC.activateInGroup(label, "label"));
  });

  const analyzeButton = document.querySelector(".label-panel .primary");
  const resultList = document.querySelector(".finding-list");
  const confidence = document.querySelector(".result-card .status");
  const customInput = document.querySelector(".label-panel textarea");

  // ── 이미지 업로드/교체 ──────────────────────────────────────────
  const fileInput = document.querySelector(".image-input");
  const previewImg = document.querySelector(".preview-img");
  const preview = document.querySelector(".road-preview");
  const sampleName = document.querySelector(".sample-name");
  let imageName = sampleName?.textContent.trim() || "";

  document.querySelector(".replace-image")?.addEventListener("click", (event) => {
    event.preventDefault();
    fileInput?.click();
  });

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (previewImg.src) URL.revokeObjectURL(previewImg.src);
    previewImg.src = URL.createObjectURL(file);
    previewImg.hidden = false;
    preview?.classList.add("has-image");
    imageName = file.name;
    if (sampleName) sampleName.textContent = file.name;
    ABC.toast("이미지를 교체했습니다");
  });

  analyzeButton?.addEventListener("click", async () => {
    const preset =
      document.querySelector(".radio-list .active")?.textContent.trim() ||
      "도로 파손/포트홀 찾기";
    const customPrompt = customInput?.value.trim() || "";

    const done = ABC.setBusy(analyzeButton, "분석 중");
    try {
      const result = await ABC.api("/api/labeling/detect", {
        preset,
        custom_prompt: customPrompt,
        image_name: imageName,
      });
      resultList.innerHTML = result.labels
        .map((label) => {
          const text = label.class_name
            ? `<b>${ABC.escapeHtml(label.class_name)}</b> — ${ABC.escapeHtml(label.note)}`
            : ABC.escapeHtml(label.note);
          return `<li><span class="badge ${label.tone}">${ABC.escapeHtml(label.grade)}</span>${text}</li>`;
        })
        .join("");
      confidence.textContent = `신뢰도 ${result.confidence.toFixed(2)}`;
      ABC.toast("이미지 분석이 완료되었습니다");
    } catch {
      /* api()가 toast 표시 */
    } finally {
      done();
    }
  });
});
