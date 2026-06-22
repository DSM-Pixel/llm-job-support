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

  analyzeButton?.addEventListener("click", () => {
    const done = ABC.setBusy(analyzeButton, "분석 중");
    window.setTimeout(() => {
      resultList.innerHTML = `
        <li><span class="badge red">상</span>포트홀 — 좌측 하단. 지름 약 35cm, 깊이 추정 6cm. 즉시 보수 대상.</li>
        <li><span class="badge orange">중</span>균열 — 중앙 차선 부근. 표면 실링 및 현장 확인 권장.</li>
        <li><span class="badge orange">중</span>노면 마모 — 우측 하단. 7일 이내 후속 점검 필요.</li>`;
      confidence.textContent = `신뢰도 ${(0.89 + Math.random() * 0.07).toFixed(2)}`;
      done();
      ABC.toast("이미지 분석이 완료되었습니다");
    }, 600);
  });
});
