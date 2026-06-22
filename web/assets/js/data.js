document.addEventListener("DOMContentLoaded", () => {
  const rows = [...document.querySelectorAll("tbody tr")];
  const search = document.querySelector(".search-upload input");

  const filterRows = () => {
    const keyword = search.value.trim().toLowerCase();
    const active = document.querySelector(".chips .active")?.textContent.trim();

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      const type = row.children[2]?.textContent.trim();
      const matchesKeyword = !keyword || text.includes(keyword);
      const matchesType = active === "전체" || type === active || (active === "원본 이미지" && type === "원본");
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
    document.querySelectorAll("tbody input[type='checkbox']").forEach((checkbox) => {
      checkbox.checked = event.target.checked;
    });
  });

  document.querySelector(".search-upload .primary")?.addEventListener("click", (event) => {
    const done = ABC.setBusy(event.currentTarget, "업로드 중");
    window.setTimeout(() => {
      done();
      ABC.toast("업로드 대기열에 추가되었습니다");
    }, 500);
  });
});
