// 간단한 테스트용 Figma 플러그인
console.log("플러그인이 시작되었습니다!");

// =============== 환경 변수 설정 ===============
// 빌드 시점에 생성된 환경 변수 import
import { ENV_VARS } from "./env-vars";

// .env 파일에서 읽어온 환경 변수를 사용하여 설정 구성
function createEnvConfig() {
  // Azure OpenAI 엔드포인트 형식 맞추기
  let endpoint = ENV_VARS.AZURE_OPENAI_ENDPOINT || "";
  if (endpoint && !endpoint.includes("/chat/completions")) {
    endpoint =
      endpoint.replace(/\/$/, "") +
      "/openai/deployments/gpt-4/chat/completions?api-version=2024-02-15-preview";
  }

  return {
    AZURE_OPENAI_KEY: ENV_VARS.AZURE_OPENAI_KEY || "",
    AZURE_OPENAI_ENDPOINT: endpoint,
    UX_WRITING_SYSTEM_PROMPT:
      ENV_VARS.PROMPT || "기본 UX 라이팅 프롬프트가 설정되지 않았습니다.",
    OPENAI_MODEL: "gpt-4",
    OPENAI_MAX_TOKENS: 150,
    OPENAI_TEMPERATURE: 0.3,
  };
}

const ENV_CONFIG = createEnvConfig();

// API 키 설정 함수
function setOpenAIApiKey(apiKey: string) {
  ENV_CONFIG.AZURE_OPENAI_KEY = apiKey;
  console.log("Azure OpenAI API 키가 설정되었습니다");
}

// API 키 확인 함수
function hasValidApiKey(): boolean {
  return !!(
    ENV_CONFIG.AZURE_OPENAI_KEY && ENV_CONFIG.AZURE_OPENAI_KEY.trim() !== ""
  );
}

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
  const effectiveApiKey = apiKey || ENV_CONFIG.AZURE_OPENAI_KEY;

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    if (text.trim() === "") {
      results.push(text);
      continue;
    }

    let improvedText: string;

    if (effectiveApiKey && effectiveApiKey.trim() !== "") {
      // OpenAI API 사용
      console.log("OpenAI API로 UX Writing 개선 중:", text);
      improvedText = await improveUxWritingWithAI(text, effectiveApiKey);
    } else {
      // 모킹 함수 사용
      console.log("모킹 함수로 UX Writing 개선 중:", text);
      improvedText = mockUxWriting(text);
    }

    results.push(improvedText);

    // 진행률 콜백 호출
    if (onProgress) {
      onProgress(i + 1, texts.length);
    }

    // API 레이트 리밋을 위한 짧은 지연
    if (
      effectiveApiKey &&
      effectiveApiKey.trim() !== "" &&
      i < texts.length - 1
    ) {
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

// 실제 Azure OpenAI API를 사용한 UX 라이팅 개선 함수
async function improveUxWritingWithAI(
  text: string,
  apiKey: string = ENV_CONFIG.AZURE_OPENAI_KEY
): Promise<string> {
  if (!apiKey || apiKey.trim() === "") {
    console.log("API 키가 없어서 모킹 함수를 사용합니다:", text);
    return mockUxWriting(text);
  }

  try {
    const response = await fetch(ENV_CONFIG.AZURE_OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey, // Azure OpenAI는 api-key 헤더를 사용
      },
      body: JSON.stringify({
        model: ENV_CONFIG.OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: ENV_CONFIG.UX_WRITING_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Original text: "${text}"`,
          },
        ],
        max_tokens: ENV_CONFIG.OPENAI_MAX_TOKENS,
        temperature: ENV_CONFIG.OPENAI_TEMPERATURE,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API 요청 실패: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const improvedText = data.choices[0]?.message?.content?.trim();

    if (!improvedText) {
      throw new Error("UX Writing 개선 결과가 비어있습니다");
    }

    // __ 패턴으로 감싸기 (UX 라이팅 적용 표시)
    return `__${improvedText}__`;
  } catch (error) {
    console.error("UX Writing 개선 오류:", error);
    // 에러 발생 시 모킹 함수로 대체
    return mockUxWriting(text);
  }
}

// 호환성을 위한 기존 함수명 유지
async function improveUxWriting(
  text: string,
  apiKey?: string
): Promise<string> {
  return improveUxWritingWithAI(text, apiKey);
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
    } else if (msg.type === "set-api-key") {
      // OpenAI API 키 설정
      const { apiKey } = msg;
      console.log("🔑 API 키 설정 요청 받음");

      if (!apiKey || apiKey.trim() === "") {
        console.error("❌ 유효하지 않은 API 키");
        figma.notify("유효한 API 키를 입력해주세요!");
        return;
      }

      setOpenAIApiKey(apiKey);
      figma.notify("API 키가 설정되었습니다! 🔑");

      // UI에 API 키 상태 전송
      figma.ui.postMessage({
        type: "api-key-status",
        hasApiKey: hasValidApiKey(),
      });
    } else if (msg.type === "get-api-key-status") {
      // API 키 상태 확인
      figma.ui.postMessage({
        type: "api-key-status",
        hasApiKey: hasValidApiKey(),
      });
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

// 선택 변경 이벤트 리스너 추가
figma.on("selectionchange", () => {
  const selection = figma.currentPage.selection;
  console.log(`🎯 선택 변경됨: ${selection.length}개 요소`);

  if (selection.length === 1) {
    const selectedNode = selection[0];

    // 선택된 노드가 텍스트 노드인지 확인
    if (selectedNode.type === "TEXT") {
      const textNode = selectedNode as TextNode;
      console.log(
        `📝 텍스트 노드 선택됨: "${textNode.characters}" (ID: ${textNode.id})`
      );

      // UI에 선택된 텍스트 정보 전송
      figma.ui.postMessage({
        type: "text-selected",
        nodeId: textNode.id,
        content: textNode.characters,
      });
    } else {
      // 텍스트가 아닌 노드가 선택된 경우, 가장 가까운 텍스트 노드 찾기
      const nearestTextNode = findNearestTextNode(selectedNode);
      if (nearestTextNode) {
        console.log(
          `🔍 가장 가까운 텍스트 노드 찾음: "${nearestTextNode.characters}" (ID: ${nearestTextNode.id})`
        );

        // UI에 가장 가까운 텍스트 정보 전송
        figma.ui.postMessage({
          type: "text-selected",
          nodeId: nearestTextNode.id,
          content: nearestTextNode.characters,
          isNearest: true,
        });
      }
    }
  }
});

// 가장 가까운 텍스트 노드를 찾는 함수
function findNearestTextNode(selectedNode: SceneNode): TextNode | null {
  let nearestTextNode: TextNode | null = null;
  let minDistance = Infinity;

  // 선택된 노드의 중심점 계산
  const selectedCenter = {
    x: selectedNode.x + selectedNode.width / 2,
    y: selectedNode.y + selectedNode.height / 2,
  };

  // 모든 텍스트 노드와의 거리 계산
  const allTextNodes = collectAllTextNodes();

  for (const textInfo of allTextNodes) {
    const textNode = textInfo.node;
    const textCenter = {
      x: textNode.x + textNode.width / 2,
      y: textNode.y + textNode.height / 2,
    };

    // 유클리드 거리 계산
    const distance = Math.sqrt(
      Math.pow(selectedCenter.x - textCenter.x, 2) +
        Math.pow(selectedCenter.y - textCenter.y, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestTextNode = textNode;
    }
  }

  console.log(`🎯 가장 가까운 텍스트까지의 거리: ${minDistance.toFixed(2)}px`);
  return nearestTextNode;
}
