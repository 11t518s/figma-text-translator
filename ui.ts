console.log("🚀 UI 스크립트 로드됨");
console.log("📅 현재 시간:", new Date().toISOString());
console.log("🌐 User Agent:", navigator.userAgent);

// DOM이 완전히 로드되었는지 확인
document.addEventListener("DOMContentLoaded", function () {
  console.log("📋 DOMContentLoaded 이벤트 발생");
});

// 즉시 실행하여 연결 확인
setTimeout(() => {
  console.log("⚡ ui.js 스크립트가 정상적으로 실행되고 있습니다!");

  // DOM 요소들이 존재하는지 확인
  const testElements = [
    "textList",
    "uxWritingList",
    "languageSelect",
    "refreshBtn",
    "translateBtn",
  ];

  testElements.forEach((id) => {
    const element = document.getElementById(id);
    console.log(`🔍 ${id}:`, element ? "✅ 존재" : "❌ 없음");
  });
}, 100);

// UI 요소들 찾기
function findUIElements() {
  const elements = {
    textListElement: document.getElementById("textList") as HTMLDivElement,
    uxWritingListElement: document.getElementById(
      "uxWritingList"
    ) as HTMLDivElement,
    languageSelectElement: document.getElementById(
      "languageSelect"
    ) as HTMLSelectElement,
    refreshBtnElement: document.getElementById(
      "refreshBtn"
    ) as HTMLButtonElement,
    translateBtnElement: document.getElementById(
      "translateBtn"
    ) as HTMLButtonElement,
    loadingElement: document.getElementById("loading") as HTMLDivElement,
    statusElement: document.getElementById("status") as HTMLDivElement,
  };

  console.log("🔍 DOM 요소 찾기 결과:");
  Object.entries(elements).forEach(([key, element]) => {
    console.log(`  ${key}:`, !!element, element?.tagName);
  });

  return elements;
}

// DOM 요소들
const ui = findUIElements();
const textListElement = ui.textListElement;
const uxWritingListElement = ui.uxWritingListElement;
const languageSelectElement = ui.languageSelectElement;
const refreshBtnElement = ui.refreshBtnElement;
const translateBtnElement = ui.translateBtnElement;
const loadingElement = ui.loadingElement;
const statusElement = ui.statusElement;

// 상태 관리
let currentTexts: Array<{ id: string; content: string; isUxMode?: boolean }> =
  [];
let currentUxTexts: Array<{ id: string; content: string; uxContent: string }> =
  [];
let supportedLanguages: { [key: string]: string } = {};

// 왼쪽 패널: 원본 텍스트 목록 업데이트
function updateOriginalTextList(
  texts: Array<{ id: string; content: string; isUxMode?: boolean }>
) {
  console.log("📝 원본 텍스트 목록 업데이트, 개수:", texts.length);
  currentTexts = texts;

  if (!textListElement) {
    console.error("❌ textListElement가 없습니다!");
    return;
  }

  if (texts.length === 0) {
    textListElement.innerHTML = `
      <div class="empty-state">
        <div class="icon">🤔</div>
        <div>텍스트가 발견되지 않았습니다</div>
        <div>페이지에 텍스트를 추가한 후 새로고침해보세요</div>
      </div>
    `;
    return;
  }

  const textItems = texts
    .map((text, index) => {
      const truncatedContent =
        text.content.length > 50
          ? text.content.substring(0, 50) + "..."
          : text.content;

      const isActive = text.isUxMode === false || text.isUxMode === undefined;
      const activeClass = isActive ? "active" : "";

      return `
      <div class="text-item ${activeClass}" data-id="${
        text.id
      }" data-index="${index}" title="${text.content.replace(/"/g, "&quot;")}">
        ${truncatedContent || "[빈 텍스트]"}
        ${isActive ? '<div class="text-item-badge">현재</div>' : ""}
      </div>
    `;
    })
    .join("");

  textListElement.innerHTML = textItems;

  // 클릭 이벤트: 원본 텍스트로 변경
  textListElement.querySelectorAll(".text-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLElement;
      const nodeId = target.getAttribute("data-id");
      const index = parseInt(target.getAttribute("data-index") || "0");

      if (nodeId) {
        console.log("📝 원본 텍스트로 변경:", nodeId);

        // 플러그인에 원본 텍스트 적용 요청
        parent.postMessage(
          {
            pluginMessage: {
              type: "apply-original-text",
              nodeId: nodeId,
            },
          },
          "*"
        );

        // UI 상태 즉시 업데이트
        currentTexts[index].isUxMode = false;
        updateOriginalTextList(currentTexts);
        updateUxWritingList(currentUxTexts);
      }
    });
  });

  console.log("✅ 원본 텍스트 목록 업데이트 완료");
}

// 오른쪽 패널: UX 라이팅 텍스트 목록 업데이트
function updateUxWritingList(
  uxTexts: Array<{ id: string; content: string; uxContent: string }>
) {
  console.log("📝 UX 라이팅 목록 업데이트, 개수:", uxTexts.length);
  currentUxTexts = uxTexts;

  if (!uxWritingListElement) {
    console.error("❌ uxWritingListElement가 없습니다!");
    return;
  }

  if (uxTexts.length === 0) {
    uxWritingListElement.innerHTML = `
      <div class="empty-state">
        <div class="icon">📝</div>
        <div>UX Writing을 생성하는 중...</div>
      </div>
    `;
    return;
  }

  const uxItems = uxTexts
    .map((text, index) => {
      const truncatedContent =
        text.uxContent.length > 50
          ? text.uxContent.substring(0, 50) + "..."
          : text.uxContent;

      // 현재 텍스트가 UX 모드인지 확인
      const currentText = currentTexts.find((t) => t.id === text.id);
      const isActive = currentText?.isUxMode === true;
      const activeClass = isActive ? "active" : "";

      return `
      <div class="ux-item ${activeClass}" data-id="${
        text.id
      }" data-index="${index}" title="${text.uxContent.replace(
        /"/g,
        "&quot;"
      )}">
        ${truncatedContent || "[빈 텍스트]"}
        ${isActive ? '<div class="text-item-badge">현재</div>' : ""}
      </div>
    `;
    })
    .join("");

  uxWritingListElement.innerHTML = uxItems;

  // 클릭 이벤트: UX 라이팅 텍스트로 변경
  uxWritingListElement.querySelectorAll(".ux-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const target = e.currentTarget as HTMLElement;
      const nodeId = target.getAttribute("data-id");
      const index = parseInt(target.getAttribute("data-index") || "0");

      if (nodeId) {
        console.log("📝 UX 라이팅 텍스트로 변경:", nodeId);

        // 플러그인에 UX 라이팅 텍스트 적용 요청
        parent.postMessage(
          {
            pluginMessage: {
              type: "apply-ux-text",
              nodeId: nodeId,
              uxContent: uxTexts[index].uxContent,
            },
          },
          "*"
        );

        // UI 상태 즉시 업데이트
        const textIndex = currentTexts.findIndex((t) => t.id === nodeId);
        if (textIndex !== -1) {
          currentTexts[textIndex].isUxMode = true;
          updateOriginalTextList(currentTexts);
          updateUxWritingList(currentUxTexts);
        }
      }
    });
  });

  console.log("✅ UX 라이팅 목록 업데이트 완료");
}

// 언어 선택 목록 업데이트
function updateLanguageOptions(languages: { [key: string]: string }) {
  supportedLanguages = languages;

  // 기존 옵션 제거 (첫 번째 기본 옵션 제외)
  while (languageSelectElement.children.length > 1) {
    languageSelectElement.removeChild(languageSelectElement.lastChild!);
  }

  // 새 언어 옵션 추가
  Object.entries(languages).forEach(([code, name]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    languageSelectElement.appendChild(option);
  });
}

// 로딩 상태 토글
function toggleLoading(show: boolean) {
  if (show) {
    loadingElement.classList.add("show");
    translateBtnElement.disabled = true;
    refreshBtnElement.disabled = true;
  } else {
    loadingElement.classList.remove("show");
    translateBtnElement.disabled = languageSelectElement.value === "";
    refreshBtnElement.disabled = false;
  }
}

// 상태 메시지 표시
function showStatus(message: string, type: "success" | "error" = "success") {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  statusElement.style.display = "block";

  // 3초 후 자동 숨김
  setTimeout(() => {
    statusElement.style.display = "none";
  }, 3000);
}

// 언어 선택 변경 이벤트
languageSelectElement.addEventListener("change", () => {
  const hasLanguage = languageSelectElement.value !== "";
  const hasTexts = currentTexts.length > 0;
  translateBtnElement.disabled = !hasLanguage || !hasTexts;
});

// 새로고침 버튼 클릭 이벤트
refreshBtnElement.addEventListener("click", () => {
  parent.postMessage(
    {
      pluginMessage: {
        type: "get-texts",
      },
    },
    "*"
  );

  // 텍스트 검색 중 표시
  textListElement.innerHTML = `
    <div class="empty-state">
      <div class="icon">🔍</div>
      <div>텍스트를 검색하는 중...</div>
    </div>
  `;
});

// 번역 버튼 클릭 이벤트
translateBtnElement.addEventListener("click", () => {
  const selectedLanguage = languageSelectElement.value;

  if (!selectedLanguage) {
    alert("번역할 언어를 선택해주세요.");
    return;
  }

  if (currentTexts.length === 0) {
    alert("번역할 텍스트가 없습니다.");
    return;
  }

  // 확인 다이얼로그
  const languageName = supportedLanguages[selectedLanguage];
  const confirmed = confirm(
    `${currentTexts.length}개의 텍스트를 ${languageName}로 번역하시겠습니까?\n\n` +
      `주의: 이 작업은 되돌릴 수 없습니다.`
  );

  if (confirmed) {
    toggleLoading(true);

    parent.postMessage(
      {
        pluginMessage: {
          type: "translate-texts",
          targetLanguage: selectedLanguage,
        },
      },
      "*"
    );
  }
});

// 플러그인으로부터 메시지 수신
window.onmessage = (event) => {
  console.log("🟡 UI에서 메시지 받음:", event);

  if (!event.data.pluginMessage) {
    console.log("❌ pluginMessage 없음, 무시");
    return;
  }

  const { type, texts, uxTexts, languages, language } =
    event.data.pluginMessage;
  console.log("✅ UI 메시지 처리:", type);

  switch (type) {
    case "initial-texts":
    case "texts-collected":
      console.log("🔄 텍스트와 언어 업데이트");

      if (texts && Array.isArray(texts)) {
        console.log("📝 텍스트 데이터:", texts);
        updateOriginalTextList(texts);
      } else {
        console.error("❌ texts가 배열이 아님:", texts);
      }

      if (languages) {
        console.log("🌐 언어 데이터:", languages);
        updateLanguageOptions(languages);
      }
      break;

    case "ux-texts-ready":
      console.log("🔄 UX 라이팅 준비 완료");

      if (uxTexts && Array.isArray(uxTexts)) {
        console.log("📝 UX 텍스트 데이터:", uxTexts);
        updateUxWritingList(uxTexts);
      } else {
        console.error("❌ uxTexts가 배열이 아님:", uxTexts);
      }
      break;

    case "translation-complete":
      console.log("🎉 번역 완료!");
      toggleLoading(false);
      showStatus(`${language}로 번역이 완료되었습니다! 🎉`);

      // 번역 후 텍스트 목록 새로고침
      setTimeout(() => {
        parent.postMessage(
          {
            pluginMessage: {
              type: "get-texts",
            },
          },
          "*"
        );
      }, 1000);
      break;

    default:
      console.log("🔄 알 수 없는 메시지 타입:", type);
      break;
  }
};

console.log("📡 메시지 리스너 등록 완료");

// 초기화: 플러그인에 텍스트 요청
setTimeout(() => {
  console.log("📤 초기 텍스트 요청 전송");
  parent.postMessage(
    {
      pluginMessage: {
        type: "get-texts",
      },
    },
    "*"
  );
}, 100);

// 테스트용 더미 데이터 표시
function showTestData() {
  console.log("🧪 테스트 데이터 표시");

  if (textListElement) {
    textListElement.innerHTML = `
      <div style="padding: 10px; background: yellow; margin: 5px;">
        🧪 테스트: 왼쪽 패널 작동 중
      </div>
    `;
  }

  if (uxWritingListElement) {
    uxWritingListElement.innerHTML = `
      <div style="padding: 10px; background: lightblue; margin: 5px;">
        🧪 테스트: 오른쪽 패널 작동 중
      </div>
    `;
  }
}

// 즉시 테스트 데이터 표시
setTimeout(showTestData, 100);
