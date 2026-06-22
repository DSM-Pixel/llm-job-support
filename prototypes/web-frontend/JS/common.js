const ABC = (() => {
  const toast = (message) => {
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

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.dataset.noToast === "true") return;
    if (button.classList.contains("primary")) return;
    if (button.closest(".quick-grid")) return;
    if (button.closest(".select-list")) return;
    if (button.closest(".radio-list")) return;
    if (button.closest(".mode-tabs")) return;
    toast(`${button.textContent.trim()} 완료`);
  });

  return { toast, setBusy, activateInGroup };
})();
