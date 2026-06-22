document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector(".input-wrap input");
  const sendButton = document.querySelector(".input-wrap button");
  const stage = document.querySelector(".query-stage");

  const escapeHtml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const ensureChat = () => {
    let log = stage.querySelector(".chat-log");
    if (log) return log;

    stage.classList.add("chat-mode");
    stage.innerHTML = `
      <div class="chat-log" aria-live="polite">
        <div class="message assistant">
          <div class="message-avatar">AI</div>
          <div class="message-body">
            <p>안녕하세요. 도로 파손 분석, 공공데이터 검색, 보고서 생성, 이미지 라벨링 업무를 자연어로 도와드릴 수 있습니다.</p>
            <div class="message-tools">
              <button type="button" data-prompt="포트홀 영역을 찾아줘">이미지 분석</button>
              <button type="button" data-prompt="도로 파손 신고 현황을 요약해줘">데이터 요약</button>
              <button type="button" data-prompt="최근 3년 도로 파손 현황 보고서를 만들어줘">보고서 생성</button>
            </div>
          </div>
        </div>
      </div>`;

    log = stage.querySelector(".chat-log");
    log.querySelectorAll("[data-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        input.value = button.dataset.prompt;
        input.focus();
      });
    });
    return log;
  };

  const addMessage = (role, html) => {
    const log = ensureChat();
    const message = document.createElement("div");
    message.className = `message ${role}`;
    message.innerHTML = `
      <div class="message-avatar">${role === "user" ? "김연" : "AI"}</div>
      <div class="message-body">${html}</div>`;
    log.appendChild(message);
    log.scrollTop = log.scrollHeight;
    return message;
  };

  const getAnswer = (question) => {
    const text = question.replace(/\s+/g, " ");

    if (/포트홀|이미지|라벨|영역|박스/.test(text)) {
      return `
        <p>이미지 분석 작업으로 연결할 수 있습니다. 현재 요청은 <b>포트홀 위치 탐지와 라벨링</b>에 가장 적합합니다.</p>
        <ol>
          <li>도로 이미지에서 포트홀 후보 영역을 먼저 탐지합니다.</li>
          <li>심각도는 크기, 깊이 추정, 차량 손상 가능성 기준으로 분류합니다.</li>
          <li>결과는 COCO JSON 라벨 또는 보고서 문장으로 저장할 수 있습니다.</li>
        </ol>
        <div class="message-actions">
          <a class="btn primary" href="4. Image Labeling.html">이미지 분석으로 이동</a>
          <a class="btn" href="6. Data Management.html">데이터셋 보기</a>
        </div>`;
    }

    if (/공공|데이터|통계|신고|현황|검색/.test(text)) {
      return `
        <p>공공데이터 기반 질의로 판단됩니다. 도로 파손 신고 현황, 보수 예산, 점검 기준 문서를 함께 검색해 답변을 만들 수 있습니다.</p>
        <p><b>요약:</b> 최근 도로 파손 신고는 증가 추세이며, 수도권 비중이 가장 높고 보수 예산 집행률은 지역별 편차가 있습니다.</p>
        <ul>
          <li>추천 검색어: 도로 파손 신고 현황, 포트홀 보수 기준, 도로보수 예산</li>
          <li>권장 작업: RAG 검색 후 근거 문서와 함께 답변 생성</li>
        </ul>
        <div class="message-actions">
          <a class="btn primary" href="3. RAG System.html">RAG 검색으로 이동</a>
          <a class="btn" href="5. Report.html">보고서 생성</a>
        </div>`;
    }

    if (/보고서|요약|리포트|문서/.test(text)) {
      return `
        <p>보고서 생성 요청으로 이해했습니다. 선택된 데이터 소스를 바탕으로 <b>요약, 통계 표, 출처</b>가 포함된 문서를 구성할 수 있습니다.</p>
        <ol>
          <li>보고서 유형을 현황 분석으로 설정합니다.</li>
          <li>기간은 최근 3년 기준이 적합합니다.</li>
          <li>공공데이터와 Vision AI 검수 결과를 출처로 포함합니다.</li>
        </ol>
        <div class="message-actions">
          <a class="btn primary" href="5. Report.html">보고서 화면으로 이동</a>
        </div>`;
    }

    if (/대응|절차|추천|심각|긴급/.test(text)) {
      return `
        <p>심각도 기반 대응 절차를 추천합니다.</p>
        <ol>
          <li><b>상:</b> 지름 30cm 이상 또는 깊이 5cm 이상이면 24시간 이내 긴급 보수 대상으로 분류합니다.</li>
          <li><b>중:</b> 차량 손상 우려가 있으면 7일 이내 보수 계획에 포함합니다.</li>
          <li><b>하:</b> 정기 점검 주기에 포함하고 재촬영 데이터를 누적합니다.</li>
        </ol>
        <p>근거 문서가 필요하면 RAG 검색으로 전환해 기준 문서를 함께 확인하는 것이 좋습니다.</p>
        <div class="message-actions">
          <a class="btn primary" href="3. RAG System.html">근거 문서 확인</a>
        </div>`;
    }

    return `
      <p>요청을 분석했습니다. 이 질문은 자연어 질의에서 처리한 뒤, 필요한 업무 화면으로 연결할 수 있습니다.</p>
      <p>더 정확한 답변을 위해 <b>분석 대상, 기간, 데이터 종류</b> 중 하나를 포함해서 질문하면 좋습니다.</p>
      <ul>
        <li>예: 최근 3년 도로 파손 신고 현황을 요약해줘</li>
        <li>예: 이 이미지에서 포트홀 위치를 찾아줘</li>
        <li>예: 검색 결과를 보고서로 만들어줘</li>
      </ul>`;
  };

  const submit = () => {
    const question = input.value.trim();
    if (!question) {
      ABC.toast("질문을 입력해주세요");
      input.focus();
      return;
    }

    addMessage("user", `<p>${escapeHtml(question)}</p>`);
    input.value = "";

    const done = ABC.setBusy(sendButton, "...");
    const typing = addMessage("assistant", `<div class="typing"><span></span><span></span><span></span></div>`);

    window.setTimeout(() => {
      typing.querySelector(".message-body").innerHTML = getAnswer(question);
      typing.scrollIntoView({ behavior: "smooth", block: "end" });
      done();
    }, 650);
  };

  document.querySelectorAll(".prompt-grid button, .suggestions .pill").forEach((item) => {
    item.addEventListener("click", () => {
      input.value = item.textContent.trim();
      input.focus();
    });
  });

  sendButton?.addEventListener("click", submit);
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
  });
});
