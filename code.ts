// Figma 텍스트 번역 및 UX 라이팅 플러그인
import { improveUxWritingWithAI, improveUxWritingBatch } from "./ux-writer";
import { translateWithOpenAI } from "./translator";

console.log("플러그인이 시작되었습니다!");

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

// OpenAI API 키 관리
// .env 파일에서 모든 설정을 가져오므로 별도 API 키 관리 불필요

// 모킹 번역 함수 (테스트용)
function mockTranslate(text: string, targetLanguage: string): string {
  const mockTranslations: { [key: string]: { [key: string]: string } } = {
    ko: {
      로그인: "로그인",
      회원가입: "회원가입",
      홈: "홈",
      설정: "설정",
    },
    en: {
      로그인: "Login",
      회원가입: "Sign Up",
      홈: "Home",
      설정: "Settings",
    },
    ja: {
      로그인: "ログイン",
      회원가입: "新規登録",
      홈: "ホーム",
      설정: "設定",
    },
  };

  const translations = mockTranslations[targetLanguage];
  if (translations && translations[text]) {
    return translations[text];
  }

  // 기본 모킹: 언어별 접두사 추가
  const prefixes: { [key: string]: string } = {
    en: "[EN] ",
    ja: "[JP] ",
    zh: "[CN] ",
    es: "[ES] ",
    fr: "[FR] ",
    de: "[DE] ",
  };

  const prefix =
    prefixes[targetLanguage] || `[${targetLanguage.toUpperCase()}] `;
  return prefix + text;
}

// UX 라이팅 컨텐츠 생성 함수
async function generateUxWritingContent(
  textNodes: TextNodeInfo[]
): Promise<Array<{ id: string; content: string; uxContent: string }>> {
  console.log(`🎨 UX 라이팅 컨텐츠 생성 시작: ${textNodes.length}개 텍스트`);

  const originalTexts = textNodes.map((node) => node.content);
  if (originalTexts.length === 0) {
    return [];
  }

  // 한 번의 API 호출로 모든 텍스트를 개선
  const improvedTexts = await improveUxWritingBatch(originalTexts);

  const uxData = textNodes.map((nodeInfo, index) => ({
    id: nodeInfo.id,
    content: nodeInfo.content,
    uxContent: improvedTexts[index] || nodeInfo.content + " (개선 실패)",
  }));

  console.log(`🎉 전체 UX 라이팅 생성 완료: ${uxData.length}개`);
  return uxData;
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
      let uxText: string;

      // AI로 UX 라이팅 개선 - .env 파일 값 신뢰
      console.log(`🤖 AI로 UX 라이팅 개선 중: "${originalText}"`);
      try {
        uxText = await improveUxWritingWithAI(originalText);
      } catch (error) {
        console.error("AI UX 라이팅 실패, 원본 텍스트 사용:", error);
        uxText = originalText + " (개선 실패)";
      }

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
      let translatedText: string;

      // AI로 번역 - .env 파일 값 신뢰
      console.log(`🤖 AI로 번역 중: "${currentText}" → ${targetLanguage}`);
      try {
        const response = await translateWithOpenAI(
          [currentText],
          targetLanguage
        );
        translatedText =
          response[0] || mockTranslate(currentText, targetLanguage);
      } catch (error) {
        console.error("AI 번역 실패, 모킹으로 대체:", error);
        translatedText = mockTranslate(currentText, targetLanguage);
      }

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
      // API 키 관련 메시지는 .env 파일 사용으로 더 이상 필요 없음
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
