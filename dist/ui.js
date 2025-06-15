"use strict";
console.log("🚀 UI 스크립트 로드됨");
// UI 요소들
const textListElement = document.getElementById("textList");
const languageSelectElement = document.getElementById("languageSelect");
const refreshBtnElement = document.getElementById("refreshBtn");
const translateBtnElement = document.getElementById("translateBtn");
const loadingElement = document.getElementById("loading");
const statusElement = document.getElementById("status");
console.log("🔍 DOM 요소 찾기:");
console.log("textListElement:", !!textListElement);
console.log("languageSelectElement:", !!languageSelectElement);
// 상태 관리
let currentTexts = [];
let supportedLanguages = {};
// 텍스트 목록 업데이트
function updateTextList(texts) {
    console.log("🎯 updateTextList 호출됨, 텍스트 개수:", texts.length);
    console.log("🎯 받은 텍스트 데이터:", texts);
    console.log("🎯 textListElement:", textListElement);
    currentTexts = texts;
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
        .map((text) => {
        const truncatedContent = text.content.length > 50
            ? text.content.substring(0, 50) + "..."
            : text.content;
        return `
      <div class="text-item" title="${text.content.replace(/"/g, "&quot;")}">
        ${truncatedContent || "[빈 텍스트]"}
      </div>
    `;
    })
        .join("");
    console.log("🎯 생성된 HTML:", textItems);
    textListElement.innerHTML = textItems;
    console.log("🎯 DOM 업데이트 완료, innerHTML 길이:", textListElement.innerHTML.length);
}
// 언어 선택 목록 업데이트
function updateLanguageOptions(languages) {
    supportedLanguages = languages;
    // 기존 옵션 제거 (첫 번째 기본 옵션 제외)
    while (languageSelectElement.children.length > 1) {
        languageSelectElement.removeChild(languageSelectElement.lastChild);
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
function toggleLoading(show) {
    if (show) {
        loadingElement.classList.add("show");
        translateBtnElement.disabled = true;
        refreshBtnElement.disabled = true;
    }
    else {
        loadingElement.classList.remove("show");
        translateBtnElement.disabled = languageSelectElement.value === "";
        refreshBtnElement.disabled = false;
    }
}
// 상태 메시지 표시
function showStatus(message, type = "success") {
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
    parent.postMessage({
        pluginMessage: {
            type: "get-texts",
        },
    }, "*");
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
    const confirmed = confirm(`${currentTexts.length}개의 텍스트를 ${languageName}로 번역하시겠습니까?\n\n` +
        `주의: 이 작업은 되돌릴 수 없습니다.`);
    if (confirmed) {
        toggleLoading(true);
        parent.postMessage({
            pluginMessage: {
                type: "translate-texts",
                targetLanguage: selectedLanguage,
            },
        }, "*");
    }
});
console.log("📡 addEventListener로 메시지 리스너 등록");
// 플러그인으로부터 메시지 수신 (addEventListener 방식)
window.addEventListener("message", (event) => {
    var _a;
    console.log("🟡 UI에서 메시지 받음 (전체):", event);
    console.log("🟡 event.data:", event.data);
    console.log("🟡 event.data.pluginMessage:", event.data.pluginMessage);
    if (!event.data.pluginMessage) {
        console.log("❌ pluginMessage 없음, 무시");
        return;
    }
    console.log("✅ UI 메시지 받음:", (_a = event.data.pluginMessage) === null || _a === void 0 ? void 0 : _a.type);
    const { type, texts, languages, language } = event.data.pluginMessage;
    console.log("📝 텍스트 개수:", texts ? texts.length : 0);
    switch (type) {
        case "initial-texts":
        case "texts-collected":
            console.log("🔄 updateTextList 호출 준비");
            console.log("🔄 받은 texts:", texts);
            console.log("🔄 받은 languages:", languages);
            if (texts && Array.isArray(texts)) {
                updateTextList(texts);
            }
            else {
                console.error("❌ texts가 배열이 아님:", texts);
            }
            if (languages) {
                updateLanguageOptions(languages);
            }
            break;
        case "translation-complete":
            toggleLoading(false);
            showStatus(`${language}로 번역이 완료되었습니다! 🎉`);
            // 번역 후 텍스트 목록 새로고침
            setTimeout(() => {
                parent.postMessage({
                    pluginMessage: {
                        type: "get-texts",
                    },
                }, "*");
            }, 1000);
            break;
        default:
            break;
    }
});
// 초기화: 플러그인에 텍스트 요청
parent.postMessage({
    pluginMessage: {
        type: "get-texts",
    },
}, "*");
