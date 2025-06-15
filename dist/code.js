"use strict";
// 간단한 테스트용 Figma 플러그인
console.log("플러그인이 시작되었습니다!");
// 지원할 언어 목록
const SUPPORTED_LANGUAGES = {
    ko: "한국어",
    en: "English",
    ja: "日本語",
    zh: "中文",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
};
// 모킹 번역 함수 (실제 OpenAI API 대신 사용)
// 나중에 OpenAI API로 교체할 예정
function mockTranslate(text, targetLanguage) {
    // 사용자 요청: 간단하게 언어명으로 바뀌게 하기
    const languageNames = {
        ko: "한국어",
        en: "English",
        ja: "日本語",
        zh: "中文",
        es: "Español",
        fr: "Français",
        de: "Deutsch",
    };
    return languageNames[targetLanguage] || targetLanguage;
}
// 페이지의 모든 텍스트 노드 수집
function collectAllTextNodes() {
    const textNodes = [];
    function traverse(node) {
        if (node.type === "TEXT") {
            textNodes.push({
                id: node.id,
                content: node.characters,
                node: node,
            });
        }
        if ("children" in node) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }
    // 현재 페이지의 모든 노드 순회
    const currentPage = figma.currentPage;
    for (const child of currentPage.children) {
        traverse(child);
    }
    return textNodes;
}
// 텍스트 번역 및 적용
async function translateAndApplyTexts(textNodes, targetLanguage) {
    for (const textInfo of textNodes) {
        try {
            // 폰트 로드 (필요한 경우)
            await figma.loadFontAsync(textInfo.node.fontName);
            // 번역 수행
            const translatedText = mockTranslate(textInfo.content, targetLanguage);
            // 텍스트 적용
            textInfo.node.characters = translatedText;
        }
        catch (error) {
            console.error(`텍스트 번역 실패 (ID: ${textInfo.id}):`, error);
        }
    }
}
// UI 시작 - 에러 핸들링 추가
try {
    figma.showUI(__html__, {
        width: 400,
        height: 600,
        themeColors: true,
    });
    console.log("UI가 성공적으로 시작되었습니다");
}
catch (error) {
    console.error("UI 시작 오류:", error);
    figma.closePlugin("UI를 시작할 수 없습니다");
}
// 메시지 처리
figma.ui.onmessage = async (msg) => {
    console.log("메시지 수신:", msg);
    try {
        if (msg.type === "get-texts") {
            // 텍스트 수집
            const textNodes = collectAllTextNodes();
            const textData = textNodes.map((node) => ({
                id: node.id,
                content: node.content,
            }));
            figma.ui.postMessage({
                type: "texts-collected",
                texts: textData,
                languages: SUPPORTED_LANGUAGES,
            });
        }
        else if (msg.type === "translate-texts") {
            const { targetLanguage } = msg;
            // 모든 텍스트 노드 다시 수집 (변경 사항 반영)
            const textNodes = collectAllTextNodes();
            // 번역 및 적용
            await translateAndApplyTexts(textNodes, targetLanguage);
            // 완료 메시지
            figma.ui.postMessage({
                type: "translation-complete",
                language: SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage,
            });
            figma.notify(`${SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage}로 번역이 완료되었습니다!`);
        }
        else if (msg.type === "close") {
            figma.closePlugin();
        }
        else if (msg.type === "ui-test-message") {
            console.log("✅ UI에서 테스트 메시지 받음!");
            figma.notify("UI 연결 성공!");
        }
    }
    catch (error) {
        console.error("메시지 처리 오류:", error);
        figma.notify("오류가 발생했습니다: " + error.message);
    }
};
// 초기 텍스트 수집
try {
    const initialTextNodes = collectAllTextNodes();
    const initialTextData = initialTextNodes.map((node) => ({
        id: node.id,
        content: node.content,
    }));
    const messageData = {
        type: "initial-texts",
        texts: initialTextData,
        languages: SUPPORTED_LANGUAGES,
    };
    console.log("📤 UI로 메시지 전송:", messageData);
    figma.ui.postMessage(messageData);
    console.log("📤 메시지 전송 완료");
    console.log(`초기 텍스트 ${initialTextData.length}개를 수집했습니다`);
}
catch (error) {
    console.error("초기 텍스트 수집 오류:", error);
}
