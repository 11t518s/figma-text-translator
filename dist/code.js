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
// 모킹 UX 라이팅 개선 함수
// 나중에 OpenAI API로 교체할 예정
function mockUxWriting(text) {
    return text + "유엑스라이팅결과값";
}
// 실제 UX 라이팅 개선 함수 (미래 OpenAI API 사용)
async function improveUxWriting(text, apiKey) {
    if (!apiKey) {
        // API 키가 없을 때 모킹 함수 사용
        return mockUxWriting(text);
    }
    try {
        // 추후 OpenAI API 구현 예정
        // const response = await fetch("https://api.openai.com/v1/chat/completions", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //     Authorization: `Bearer ${apiKey}`,
        //   },
        //   body: JSON.stringify({
        //     model: "gpt-3.5-turbo",
        //     messages: [
        //       {
        //         role: "system",
        //         content: "You are a UX writing expert. Improve the given text to be more user-friendly, clear, and concise while maintaining the original meaning."
        //       },
        //       {
        //         role: "user",
        //         content: text
        //       }
        //     ]
        //   })
        // });
        return mockUxWriting(text);
    }
    catch (error) {
        console.error("UX Writing 개선 오류:", error);
        return text;
    }
}
// 페이지의 모든 텍스트 노드 수집
function collectAllTextNodes() {
    const textNodes = [];
    function traverse(node) {
        if (node.type === "TEXT") {
            const textInfo = {
                id: node.id,
                content: node.characters,
                node: node,
                originalContent: node.characters,
                isUxMode: false,
            };
            textNodes.push(textInfo);
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
// 텍스트와 UX 개선 텍스트 생성
async function generateUxWritingContent(textNodes) {
    const result = [];
    for (const textInfo of textNodes) {
        const uxContent = await improveUxWriting(textInfo.content);
        result.push({
            id: textInfo.id,
            content: textInfo.content,
            uxContent: uxContent,
        });
    }
    return result;
}
// 특정 텍스트 노드의 내용 토글
async function toggleTextContent(nodeId, useUxWriting) {
    const node = figma.getNodeById(nodeId);
    if (!node || node.type !== "TEXT") {
        console.error("텍스트 노드를 찾을 수 없습니다:", nodeId);
        return;
    }
    const textNode = node;
    try {
        // 폰트 로드
        await figma.loadFontAsync(textNode.fontName);
        // 텍스트 노드 정보 찾기
        const allTextNodes = collectAllTextNodes();
        const targetTextInfo = allTextNodes.find((t) => t.id === nodeId);
        if (!targetTextInfo) {
            console.error("텍스트 정보를 찾을 수 없습니다:", nodeId);
            return;
        }
        if (useUxWriting) {
            // UX 라이팅 모드로 변경
            if (!targetTextInfo.uxContent) {
                targetTextInfo.uxContent = await improveUxWriting(targetTextInfo.originalContent || targetTextInfo.content);
            }
            textNode.characters = targetTextInfo.uxContent;
            targetTextInfo.isUxMode = true;
        }
        else {
            // 원본 텍스트로 복원
            textNode.characters =
                targetTextInfo.originalContent || targetTextInfo.content;
            targetTextInfo.isUxMode = false;
        }
    }
    catch (error) {
        console.error(`텍스트 토글 실패 (ID: ${nodeId}):`, error);
    }
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
                isUxMode: node.isUxMode || false,
            }));
            // 즉시 기본 데이터 전송
            figma.ui.postMessage({
                type: "texts-collected",
                texts: textData,
                languages: SUPPORTED_LANGUAGES,
            });
            // UX 라이팅 컨텐츠 비동기 생성 (나중에)
            if (textData.length > 0) {
                setTimeout(() => {
                    generateUxWritingContent(textNodes)
                        .then((uxData) => {
                        figma.ui.postMessage({
                            type: "ux-texts-ready",
                            uxTexts: uxData,
                        });
                    })
                        .catch((error) => {
                        console.error("UX 라이팅 생성 오류:", error);
                    });
                }, 300);
            }
        }
        else if (msg.type === "apply-original-text") {
            // 원본 텍스트 적용
            const { nodeId } = msg;
            const node = figma.getNodeById(nodeId);
            if (!node || node.type !== "TEXT") {
                console.error("텍스트 노드를 찾을 수 없습니다:", nodeId);
                return;
            }
            const textNode = node;
            const allTextNodes = collectAllTextNodes();
            const targetTextInfo = allTextNodes.find((t) => t.id === nodeId);
            if (!targetTextInfo) {
                console.error("텍스트 정보를 찾을 수 없습니다:", nodeId);
                return;
            }
            try {
                await figma.loadFontAsync(textNode.fontName);
                textNode.characters =
                    targetTextInfo.originalContent || targetTextInfo.content;
                targetTextInfo.isUxMode = false;
                figma.notify("원본 텍스트로 변경되었습니다! 📝");
            }
            catch (error) {
                console.error(`원본 텍스트 적용 실패 (ID: ${nodeId}):`, error);
            }
        }
        else if (msg.type === "apply-ux-text") {
            // UX 라이팅 텍스트 적용
            const { nodeId, uxContent } = msg;
            const node = figma.getNodeById(nodeId);
            if (!node || node.type !== "TEXT") {
                console.error("텍스트 노드를 찾을 수 없습니다:", nodeId);
                return;
            }
            const textNode = node;
            const allTextNodes = collectAllTextNodes();
            const targetTextInfo = allTextNodes.find((t) => t.id === nodeId);
            if (!targetTextInfo) {
                console.error("텍스트 정보를 찾을 수 없습니다:", nodeId);
                return;
            }
            try {
                await figma.loadFontAsync(textNode.fontName);
                textNode.characters = uxContent;
                targetTextInfo.isUxMode = true;
                targetTextInfo.uxContent = uxContent;
                figma.notify("UX 라이팅으로 변경되었습니다! ✨");
            }
            catch (error) {
                console.error(`UX 텍스트 적용 실패 (ID: ${nodeId}):`, error);
            }
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
        isUxMode: node.isUxMode || false,
    }));
    // 즉시 기본 데이터 전송
    const messageData = {
        type: "initial-texts",
        texts: initialTextData,
        languages: SUPPORTED_LANGUAGES,
    };
    console.log("📤 UI로 초기 메시지 전송:", messageData);
    figma.ui.postMessage(messageData);
    console.log("📤 초기 메시지 전송 완료");
    console.log(`초기 텍스트 ${initialTextData.length}개를 수집했습니다`);
    // UX 라이팅 컨텐츠 비동기 생성 (나중에)
    if (initialTextData.length > 0) {
        setTimeout(() => {
            generateUxWritingContent(initialTextNodes)
                .then((uxData) => {
                figma.ui.postMessage({
                    type: "ux-texts-ready",
                    uxTexts: uxData,
                });
                console.log("📤 UX 라이팅 데이터 전송 완료");
            })
                .catch((error) => {
                console.error("UX 라이팅 생성 오류:", error);
            });
        }, 500);
    }
}
catch (error) {
    console.error("초기 텍스트 수집 오류:", error);
}
