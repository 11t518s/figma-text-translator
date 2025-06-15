// 간단한 테스트용 Figma 플러그인
console.log("플러그인이 시작되었습니다!");

// =============== TRANSLATOR 모듈 (인라인) ===============
/**
 * 모킹 번역 함수 (실제 OpenAI API 대신 사용)
 * API 키가 없을 때 사용되는 기본 번역 로직
 */
function mockTranslate(text: string, targetLanguage: string): string {
  // 사용자 요청: 간단하게 언어명으로 바뀌게 하기
  const languageNames: { [key: string]: string } = {
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

// =============== UX WRITER 모듈 (인라인) ===============
interface UxWritingRequest {
  text: string;
  context?: string;
  tone?: "friendly" | "professional" | "casual" | "formal";
  target?: "button" | "label" | "message" | "description" | "title";
}

// 전역 텍스트 노드 캐시 제거 - 실시간 처리로 변경

/**
 * 모킹 UX Writing 개선 함수
 * API 키가 없을 때 사용되는 기본 개선 로직
 */
function mockUxWriting(text: string): string {
  // 이미 UX Writing이 적용된 텍스트인지 확인 (__ 패턴)
  if (text.startsWith("__") && text.endsWith("__")) {
    return text; // 이미 적용된 경우 그대로 반환
  }

  // 단순한 개선 규칙들
  let improved = text;

  // 1. 기본 개선사항들
  const improvements = [
    // 더 친근한 표현으로 변경
    { from: /오류/g, to: "문제" },
    { from: /실패/g, to: "완료되지 않음" },
    { from: /불가능/g, to: "지원되지 않음" },
    { from: /금지/g, to: "허용되지 않음" },

    // 더 명확한 액션 단어 사용
    { from: /클릭/g, to: "선택" },
    { from: /입력/g, to: "작성" },
    { from: /확인/g, to: "완료" },

    // 더 사용자 중심의 언어
    { from: /시스템/g, to: "앱" },
    { from: /데이터/g, to: "정보" },
    { from: /프로세스/g, to: "과정" },
  ];

  improvements.forEach(({ from, to }) => {
    improved = improved.replace(from, to);
  });

  // 2. 길이에 따른 개선
  if (improved.length > 20) {
    // 긴 텍스트는 더 간결하게
    improved = improved.replace(/입니다/g, "됨");
    improved = improved.replace(/해주세요/g, "하세요");
    improved = improved.replace(/하였습니다/g, "했습니다");
  }

  // 3. __ 패턴으로 감싸기
  return `__${improved}__`;
}

/**
 * 텍스트 배열을 배치로 UX Writing 개선
 * @param apiKey OpenAI API 키 (선택사항)
 * @param texts 개선할 텍스트 배열
 * @param options 개선 옵션
 * @param onProgress 진행률 콜백 (선택사항)
 * @returns 개선된 텍스트 배열
 */
async function improveUxWritingBatch(
  apiKey: string | null,
  texts: string[],
  options: Partial<UxWritingRequest> = {},
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    if (text.trim() === "") {
      results.push(text);
      continue;
    }

    let improvedText: string;

    if (apiKey) {
      // OpenAI API 사용 (추후 구현)
      console.log("OpenAI API 호출 예정:", text);
      improvedText = mockUxWriting(text);
    } else {
      // 모킹 함수 사용
      improvedText = mockUxWriting(text);
    }

    results.push(improvedText);

    // 진행률 콜백 호출
    if (onProgress) {
      onProgress(i + 1, texts.length);
    }

    // API 레이트 리밋을 위한 짧은 지연
    if (apiKey && i < texts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

// =============== FIGMA 플러그인 메인 로직 ===============

// 지원할 언어 목록
const SUPPORTED_LANGUAGES: { [key: string]: string } = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

// 텍스트 노드 정보 인터페이스
interface TextNodeInfo {
  id: string;
  content: string;
  node: TextNode;
  originalContent?: string; // 원본 텍스트 저장
  uxContent?: string; // UX 라이팅 개선된 텍스트
  isUxMode?: boolean; // 현재 UX 모드인지 여부
}

// 실제 UX 라이팅 개선 함수 (미래 OpenAI API 사용)
async function improveUxWriting(
  text: string,
  apiKey?: string
): Promise<string> {
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
  } catch (error) {
    console.error("UX Writing 개선 오류:", error);
    return text;
  }
}

// 페이지의 모든 텍스트 노드 수집
function collectAllTextNodes(): TextNodeInfo[] {
  const textNodes: TextNodeInfo[] = [];

  function traverse(node: SceneNode) {
    if (node.type === "TEXT") {
      const textNode = node as TextNode;
      const isUxMode = textNode.getPluginData("isUxMode") === "true";
      const originalContent =
        textNode.getPluginData("originalText") || textNode.characters;

      const textInfo: TextNodeInfo = {
        id: node.id,
        content: textNode.characters,
        node: textNode,
        originalContent: originalContent,
        isUxMode: isUxMode,
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
async function generateUxWritingContent(
  textNodes: TextNodeInfo[]
): Promise<Array<{ id: string; content: string; uxContent: string }>> {
  const result = [];

  // 모든 텍스트를 배치로 처리
  const texts = textNodes.map((node) => node.content);

  try {
    // 배치 UX Writing 개선 (현재는 모킹 함수 사용)
    const improvedTexts = await improveUxWritingBatch(
      null, // API 키 없이 모킹 사용
      texts,
      { tone: "friendly" }, // 기본 옵션
      (current: number, total: number) => {
        console.log(`UX Writing 진행률: ${current}/${total}`);
      }
    );

    // 결과 매핑
    for (let i = 0; i < textNodes.length; i++) {
      result.push({
        id: textNodes[i].id,
        content: textNodes[i].content,
        uxContent: improvedTexts[i] || mockUxWriting(textNodes[i].content),
      });
    }
  } catch (error) {
    console.error("배치 UX Writing 처리 오류:", error);

    // 오류 시 개별 처리로 fallback
    for (const textInfo of textNodes) {
      result.push({
        id: textInfo.id,
        content: textInfo.content,
        uxContent: mockUxWriting(textInfo.content),
      });
    }
  }

  return result;
}

// 특정 텍스트 노드의 내용 토글
async function toggleTextContent(nodeId: string, useUxWriting: boolean) {
  console.log(
    `🔄 텍스트 토글 시작: nodeId=${nodeId}, useUxWriting=${useUxWriting}`
  );

  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node || node.type !== "TEXT") {
    console.error("❌ 텍스트 노드를 찾을 수 없습니다:", nodeId);
    return;
  }

  const textNode = node as TextNode;
  console.log(`📝 현재 텍스트: "${textNode.characters}"`);

  try {
    // 폰트 로드
    await figma.loadFontAsync(textNode.fontName as FontName);

    // 원본 텍스트 가져오기 또는 저장
    let originalText = textNode.getPluginData("originalText");
    if (!originalText) {
      // 처음 접근하는 노드라면 현재 텍스트를 원본으로 저장
      originalText = textNode.characters;
      textNode.setPluginData("originalText", originalText);
      console.log(`💾 원본 텍스트 저장: "${originalText}"`);
    }

    if (useUxWriting) {
      // UX 라이팅 모드로 변경
      const uxText = await improveUxWriting(originalText);
      textNode.characters = uxText;
      textNode.setPluginData("isUxMode", "true");

      console.log(`🎨 UX Writing 적용: "${originalText}" → "${uxText}"`);
    } else {
      // 원본 텍스트로 복원
      textNode.characters = originalText;
      textNode.setPluginData("isUxMode", "false");

      console.log(`📝 원본 텍스트 복원: "${originalText}"`);
    }
  } catch (error) {
    console.error(`❌ 텍스트 토글 실패 (ID: ${nodeId}):`, error);
  }
}

// 텍스트 번역 및 적용
async function translateAndApplyTexts(
  textNodes: TextNodeInfo[],
  targetLanguage: string
) {
  console.log(`🌐 번역 시작: ${targetLanguage}, 노드 수: ${textNodes.length}`);

  for (const textInfo of textNodes) {
    try {
      // 폰트 로드 (필요한 경우)
      await figma.loadFontAsync(textInfo.node.fontName as FontName);

      // 현재 노드의 실제 텍스트 가져오기
      const currentText = textInfo.node.characters;
      console.log(`📝 번역 대상: "${currentText}"`);

      // 원본 텍스트가 저장되어 있지 않다면 현재 텍스트를 저장
      if (!textInfo.node.getPluginData("originalText")) {
        textInfo.node.setPluginData(
          "originalText",
          textInfo.originalContent || currentText
        );
        console.log(
          `💾 원본 텍스트 저장: "${textInfo.originalContent || currentText}"`
        );
      }

      // 번역 수행 (현재 텍스트 기준)
      const translatedText = mockTranslate(currentText, targetLanguage);
      console.log(`🔄 번역 결과: "${currentText}" → "${translatedText}"`);

      // 텍스트 적용
      textInfo.node.characters = translatedText;

      // 번역된 상태임을 표시
      textInfo.node.setPluginData("isTranslated", "true");
      textInfo.node.setPluginData("translatedLanguage", targetLanguage);

      console.log(`✅ 번역 적용 완료: ${textInfo.id}`);
    } catch (error) {
      console.error(`❌ 텍스트 번역 실패 (ID: ${textInfo.id}):`, error);
    }
  }

  console.log(`🎉 전체 번역 완료!`);
}

// UI 시작 - 에러 핸들링 추가
try {
  figma.showUI(__html__, {
    width: 1000,
    height: 800,
    themeColors: true,

  });
  console.log("UI가 성공적으로 시작되었습니다");
} catch (error) {
  console.error("UI 시작 오류:", error);
  figma.closePlugin("UI를 시작할 수 없습니다");
}

// 메시지 처리
figma.ui.onmessage = async (msg: any) => {
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
    } else if (msg.type === "toggle-text") {
      // 텍스트 토글 (새로운 UI에서 사용)
      const { nodeId, useUxWriting } = msg;
      console.log(`🔄 텍스트 토글 요청: ${nodeId}, UX모드: ${useUxWriting}`);

      await toggleTextContent(nodeId, useUxWriting);

      const modeText = useUxWriting ? "UX Writing" : "원본 텍스트";
      figma.notify(
        `${modeText}로 변경되었습니다! ${useUxWriting ? "✨" : "📝"}`
      );
    } else if (msg.type === "apply-original-text") {
      // 원본 텍스트 적용
      const { nodeId } = msg;
      console.log(`📝 원본 텍스트 적용 요청: ${nodeId}`);

      const node = await figma.getNodeByIdAsync(nodeId);

      if (!node || node.type !== "TEXT") {
        console.error("❌ 텍스트 노드를 찾을 수 없습니다:", nodeId);
        return;
      }

      const textNode = node as TextNode;

      try {
        await figma.loadFontAsync(textNode.fontName as FontName);

        // 플러그인 데이터에서 원본 텍스트 가져오기
        let originalText = textNode.getPluginData("originalText");
        if (!originalText) {
          // 원본 텍스트가 없다면 현재 텍스트를 원본으로 간주
          originalText = textNode.characters;
          textNode.setPluginData("originalText", originalText);
        }

        textNode.characters = originalText;
        textNode.setPluginData("isUxMode", "false");

        console.log(`✅ 원본 텍스트 적용 완료: "${originalText}"`);
        figma.notify("원본 텍스트로 변경되었습니다! 📝");
      } catch (error) {
        console.error(`❌ 원본 텍스트 적용 실패 (ID: ${nodeId}):`, error);
      }
    } else if (msg.type === "apply-ux-text") {
      // UX 라이팅 텍스트 적용
      const { nodeId, uxContent } = msg;
      console.log(`🎨 UX 텍스트 적용 요청: ${nodeId}, 내용: "${uxContent}"`);

      const node = await figma.getNodeByIdAsync(nodeId);

      if (!node || node.type !== "TEXT") {
        console.error("❌ 텍스트 노드를 찾을 수 없습니다:", nodeId);
        return;
      }

      const textNode = node as TextNode;

      try {
        await figma.loadFontAsync(textNode.fontName as FontName);

        // 원본 텍스트가 저장되어 있지 않다면 현재 텍스트를 저장
        if (!textNode.getPluginData("originalText")) {
          textNode.setPluginData("originalText", textNode.characters);
        }

        textNode.characters = uxContent;
        textNode.setPluginData("isUxMode", "true");

        console.log(`✅ UX 텍스트 적용 완료: "${uxContent}"`);
        figma.notify("UX 라이팅으로 변경되었습니다! ✨");
      } catch (error) {
        console.error(`❌ UX 텍스트 적용 실패 (ID: ${nodeId}):`, error);
      }
    } else if (msg.type === "translate-texts") {
      const { targetLanguage } = msg;
      console.log(`🌐 번역 요청 받음: ${targetLanguage}`);

      if (!targetLanguage) {
        console.error("❌ 대상 언어가 지정되지 않았습니다");
        figma.notify("언어를 선택해주세요!");
        return;
      }

      // 모든 텍스트 노드 다시 수집 (변경 사항 반영)
      const textNodes = collectAllTextNodes();
      console.log(`📊 수집된 텍스트 노드: ${textNodes.length}개`);

      if (textNodes.length === 0) {
        console.log("⚠️ 번역할 텍스트가 없습니다");
        figma.notify("번역할 텍스트가 없습니다!");
        return;
      }

      // 번역 및 적용
      await translateAndApplyTexts(textNodes, targetLanguage);

      // 완료 메시지
      figma.ui.postMessage({
        type: "translation-complete",
        language: SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage,
      });

      const languageName =
        SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage;
      console.log(`🎉 번역 완료 알림: ${languageName}`);
      figma.notify(`${languageName}로 번역이 완료되었습니다!`);
    } else if (msg.type === "close") {
      figma.closePlugin();
    } else if (msg.type === "ui-test-message") {
      console.log("✅ UI에서 테스트 메시지 받음!");
      figma.notify("UI 연결 성공!");
    }
  } catch (error) {
    console.error("메시지 처리 오류:", error);
    figma.notify("오류가 발생했습니다: " + (error as Error).message);
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
} catch (error) {
  console.error("초기 텍스트 수집 오류:", error);
}
