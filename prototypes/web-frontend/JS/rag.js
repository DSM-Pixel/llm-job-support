document.addEventListener("DOMContentLoaded", () => {
  const askInput = document.querySelector(".ask-line input");
  const askButton = document.querySelector(".ask-line .primary");
  const answer = document.querySelector(".answer p");
  const confidence = document.querySelector(".answer-head .status:last-child");

  document.querySelectorAll(".chips .pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      ABC.activateInGroup(pill, ".pill");
      askInput.value = pill.textContent.trim();
    });
  });

  askButton?.addEventListener("click", () => {
    const done = ABC.setBusy(askButton, "검색 중");
    window.setTimeout(() => {
      answer.innerHTML = `<b>${askInput.value}</b><br>관련 문서 3개와 청크 14개를 근거로 답변을 갱신했습니다. 심각 등급은 즉시 조치하고, 보통 등급은 7일 이내 처리하는 기준을 적용합니다.`;
      confidence.textContent = `신뢰도 ${(0.88 + Math.random() * 0.08).toFixed(2)}`;
      done();
      ABC.toast("검색 결과가 갱신되었습니다");
    }, 500);
  });

  document.querySelectorAll(".switch").forEach((switchEl) => {
    switchEl.addEventListener("click", () => switchEl.classList.toggle("off"));
  });

  document.querySelector(".knowledge .primary")?.addEventListener("click", (event) => {
    const done = ABC.setBusy(event.currentTarget, "색인 중");
    window.setTimeout(() => {
      document.querySelector(".indexed").textContent = "✓ 색인됨 — 소스 4개 · 청크 18개";
      done();
      ABC.toast("문서 색인이 완료되었습니다");
    }, 600);
  });

  const uploadInput = document.querySelector(".upload-input");
  const uploadBox = document.querySelector(".upload");
  const fileList = document.querySelector(".file-list");

  uploadInput?.addEventListener("change", () => {
    const files = [...uploadInput.files];
    if (!files.length) return;

    uploadBox.querySelector("b").textContent = `${files.length}개 문서 선택됨`;
    uploadBox.querySelector("small").textContent = files.map((file) => file.name).join(" · ");

    files.forEach((file) => {
      const item = document.createElement("li");
      item.innerHTML = `<i>▤</i><b>${file.name}</b><small>업로드 대기</small>`;
      fileList.prepend(item);
    });

    ABC.toast("문서가 업로드 목록에 추가되었습니다");
  });
});
