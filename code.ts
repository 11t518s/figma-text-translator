// Figma 텍스트 번역 및 UX 라이팅 플러그인
import {
  improveUxWriting,
  improveUxWritingWithReasons,
  ImprovementResult,
} from "./ux-writer";
import { translateWithOpenAI } from "./translator";
import {
  CHUNK_CONFIG,
  API_CONFIG,
  estimateTokens,
  divideIntoChunks,
  processChunkWithRetry,
  delay,
} from "./prompt-config";

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
  changeReason?: string; // 변경 이유
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

// 청크 처리 함수들은 prompt-config.ts에서 import해서 사용

// UX 라이팅 컨텐츠 생성 함수 (청크 단위 처리)
async function generateUxWritingContent(textNodes: TextNodeInfo[]): Promise<
  Array<{
    id: string;
    content: string;
    uxContent: string;
    changeReason: string;
  }>
> {
  console.log(`🎨 UX 라이팅 컨텐츠 생성 시작: ${textNodes.length}개 텍스트`);

  if (textNodes.length === 0) {
    return [];
  }

  // 청크로 나누기
  const chunks = divideIntoChunks(textNodes, (node) => node.content);
  console.log(`📦 ${chunks.length}개 청크로 나누어 처리 시작`);

  // UI에 진행률 업데이트
  figma.ui.postMessage({
    type: "ux-generation-progress",
    current: 0,
    total: chunks.length,
    message: "UX 라이팅 생성 준비 중...",
  });

  const allUxData: Array<{
    id: string;
    content: string;
    uxContent: string;
    changeReason: string;
  }> = [];

  // 각 청크별로 순차 처리
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      // UI에 진행률 업데이트
      figma.ui.postMessage({
        type: "ux-generation-progress",
        current: i,
        total: chunks.length,
        message: `청크 ${i + 1}/${chunks.length} 처리 중... (${
          chunk.length
        }개 텍스트)`,
      });

      // 청크 처리 - 변경 이유와 함께 받아오기
      const chunkTexts = chunk.map((node) => node.content);
      const improvementResults = await processChunkWithRetry(
        chunkTexts,
        async (texts) => await improveUxWritingWithReasons(texts),
        i,
        chunks.length
      );

      // 결과를 최종 배열에 추가
      const chunkUxData = chunk.map((nodeInfo, index) => {
        const result = improvementResults[index];
        return {
          id: nodeInfo.id,
          content: nodeInfo.content,
          uxContent: result?.improved || nodeInfo.content + " (개선 실패)",
          changeReason: result?.reason || "처리 중 오류 발생",
        };
      });

      allUxData.push(...chunkUxData);

      // 청크 간 지연 (마지막 청크가 아닌 경우)
      if (i < chunks.length - 1) {
        await delay(CHUNK_CONFIG.CHUNK_DELAY);
      }
    } catch (error) {
      console.error(`💥 청크 ${i + 1} 처리 최종 실패:`, error);

      // 실패한 청크는 원본 텍스트로 처리
      const failedChunkData = chunk.map((nodeInfo) => ({
        id: nodeInfo.id,
        content: nodeInfo.content,
        uxContent: nodeInfo.content + " (개선 실패)",
        changeReason: "처리 중 오류 발생",
      }));

      allUxData.push(...failedChunkData);
    }
  }

  // UI에 완료 업데이트
  figma.ui.postMessage({
    type: "ux-generation-progress",
    current: chunks.length,
    total: chunks.length,
    message: "UX 라이팅 생성 완료!",
  });

  console.log(`🎉 전체 UX 라이팅 생성 완료: ${allUxData.length}개`);
  return allUxData;
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
        uxText = await improveUxWriting(originalText);
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

// 텍스트 번역 및 적용 (청크 단위 처리)
async function translateAndApplyTexts(
  textNodes: TextNodeInfo[],
  targetLanguage: string
) {
  console.log(`🌐 번역 시작: ${targetLanguage}, 노드 수: ${textNodes.length}`);

  if (textNodes.length === 0) {
    console.log("⚠️ 번역할 텍스트가 없습니다");
    return;
  }

  // 1. 모든 텍스트 수집 및 원본 저장
  for (const textInfo of textNodes) {
    const currentText = textInfo.node.characters;

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
  }

  // 2. 청크로 나누어 번역 처리
  const chunks = divideIntoChunks(textNodes, (node) => node.node.characters);
  console.log(`📦 ${chunks.length}개 청크로 나누어 번역 시작`);

  // UI에 진행률 업데이트
  figma.ui.postMessage({
    type: "translation-progress",
    current: 0,
    total: chunks.length,
    message: "번역 준비 중...",
  });

  // 각 청크별로 순차 처리
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      // UI에 진행률 업데이트
      figma.ui.postMessage({
        type: "translation-progress",
        current: i,
        total: chunks.length,
        message: `청크 ${i + 1}/${chunks.length} 번역 중... (${
          chunk.length
        }개 텍스트)`,
      });

      // 청크의 텍스트 수집
      const textsToTranslate = chunk.map(
        (textInfo) => textInfo.node.characters
      );

      // 청크 번역
      const translatedTexts = await processChunkWithRetry(
        textsToTranslate,
        async (texts) => await translateWithOpenAI(texts, targetLanguage),
        i,
        chunks.length
      );

      // 번역된 텍스트를 각 노드에 적용
      for (let j = 0; j < chunk.length; j++) {
        const textInfo = chunk[j];
        const translatedText =
          translatedTexts[j] ||
          mockTranslate(textsToTranslate[j], targetLanguage);

        try {
          // 폰트 로드 (필요한 경우)
          await figma.loadFontAsync(textInfo.node.fontName as FontName);

          // 텍스트 적용
          textInfo.node.characters = translatedText;

          // 번역된 상태임을 표시
          textInfo.node.setPluginData("isTranslated", "true");
          textInfo.node.setPluginData("translatedLanguage", targetLanguage);

          console.log(
            `✅ 번역 적용 완료: "${textsToTranslate[j]}" → "${translatedText}"`
          );
        } catch (error) {
          console.error(`❌ 텍스트 적용 실패 (ID: ${textInfo.id}):`, error);
        }
      }

      // 청크 간 지연 (마지막 청크가 아닌 경우)
      if (i < chunks.length - 1) {
        await delay(CHUNK_CONFIG.CHUNK_DELAY);
      }
    } catch (error) {
      console.error(`💥 청크 ${i + 1} 번역 최종 실패:`, error);

      // 실패한 청크는 모킹으로 처리
      for (const textInfo of chunk) {
        try {
          const currentText = textInfo.node.characters;
          const fallbackText = mockTranslate(currentText, targetLanguage);

          await figma.loadFontAsync(textInfo.node.fontName as FontName);
          textInfo.node.characters = fallbackText;
          textInfo.node.setPluginData("isTranslated", "true");
          textInfo.node.setPluginData("translatedLanguage", targetLanguage);

          console.log(
            `🔄 모킹 번역 적용: "${currentText}" → "${fallbackText}"`
          );
        } catch (fallbackError) {
          console.error(
            `❌ 모킹 번역도 실패 (ID: ${textInfo.id}):`,
            fallbackError
          );
        }
      }
    }
  }

  // UI에 완료 업데이트
  figma.ui.postMessage({
    type: "translation-progress",
    current: chunks.length,
    total: chunks.length,
    message: "번역 완료!",
  });

  console.log(`🎉 전체 번역 완료! ${textNodes.length}개 텍스트 처리됨`);
}

// UI 시작 - 에러 핸들링 추가
try {
  figma.showUI(__html__, {
    width: 699,
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
    } else if (msg.type === "focus-text-node") {
      // 텍스트 노드 포커스 (더블클릭 시)
      const { nodeId } = msg;
      console.log(`🎯 텍스트 노드 포커스 요청: ${nodeId}`);

      const node = await figma.getNodeByIdAsync(nodeId);

      if (!node || node.type !== "TEXT") {
        console.error("❌ 텍스트 노드를 찾을 수 없습니다:", nodeId);
        figma.notify("텍스트를 찾을 수 없습니다 😅");
        return;
      }

      const textNode = node as TextNode;

      try {
        // 노드 선택
        figma.currentPage.selection = [textNode];

        // 노드가 보이도록 스크롤
        figma.viewport.scrollAndZoomIntoView([textNode]);

        console.log(`✅ 텍스트 노드 포커스 완료: ${nodeId}`);
        figma.notify("텍스트가 선택되었습니다! 🎯");
      } catch (error) {
        console.error(`❌ 텍스트 노드 포커스 실패 (ID: ${nodeId}):`, error);
        figma.notify("텍스트 포커스 중 오류가 발생했습니다 😅");
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
    } else if (msg.type === "regenerate-ux-writing") {
      // UX 라이팅 재생성
      console.log("✨ UX 라이팅 재생성 요청 받음");

      // 모든 텍스트 노드 다시 수집
      const textNodes = collectAllTextNodes();

      if (textNodes.length === 0) {
        console.log("⚠️ UX 라이팅을 생성할 텍스트가 없습니다");
        figma.notify("텍스트가 없습니다!");
        return;
      }

      try {
        // UX 라이팅 재생성
        const uxData = await generateUxWritingContent(textNodes);

        // UI에 새로운 UX 라이팅 데이터 전송
        figma.ui.postMessage({
          type: "ux-texts-ready",
          uxTexts: uxData,
        });

        console.log(`🎉 UX 라이팅 재생성 완료: ${uxData.length}개`);
        figma.notify("UX 라이팅이 재생성되었습니다! ✨");
      } catch (error) {
        console.error("UX 라이팅 재생성 오류:", error);
        figma.notify("UX 라이팅 재생성에 실패했습니다 😅");
      }
    } else if (msg.type === "close-plugin") {
      console.log("🔚 플러그인 종료 요청 받음");
      figma.closePlugin();
    } else if (msg.type === "update-api-key") {
      // API 키 업데이트 - .env 파일 사용으로 더 이상 필요 없음
      console.log("ℹ️ API 키는 .env 파일에서 관리됩니다");
    } else if (msg.type === "export-csv") {
      // CSV 내보내기
      console.log("📄 CSV 내보내기 요청 받음");

      const textNodes = collectAllTextNodes();
      const csvData = textNodes.map((node) => ({
        id: node.id,
        original: node.originalContent || node.content,
        current: node.content,
        isUxMode: node.isUxMode || false,
      }));

      figma.ui.postMessage({
        type: "csv-data",
        data: csvData,
      });

      console.log(`📊 CSV 데이터 전송 완료: ${csvData.length}개 항목`);
    } else if (msg.type === "import-csv") {
      // CSV 가져오기
      const { csvData } = msg;
      console.log(`📥 CSV 가져오기 요청 받음: ${csvData?.length || 0}개 항목`);

      if (!csvData || !Array.isArray(csvData)) {
        console.error("❌ 유효하지 않은 CSV 데이터");
        figma.notify("유효하지 않은 CSV 데이터입니다!");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const item of csvData) {
        try {
          const node = await figma.getNodeByIdAsync(item.id);
          if (node && node.type === "TEXT") {
            const textNode = node as TextNode;
            await figma.loadFontAsync(textNode.fontName as FontName);

            // CSV에서 가져온 텍스트 적용
            textNode.characters = item.current || item.original;

            // 메타데이터 업데이트
            if (item.original) {
              textNode.setPluginData("originalText", item.original);
            }
            textNode.setPluginData(
              "isUxMode",
              item.isUxMode ? "true" : "false"
            );

            successCount++;
          }
        } catch (error) {
          console.error(`❌ CSV 항목 적용 실패 (ID: ${item.id}):`, error);
          errorCount++;
        }
      }

      console.log(
        `📊 CSV 가져오기 완료: 성공 ${successCount}개, 실패 ${errorCount}개`
      );
      figma.notify(
        `CSV 가져오기 완료! 성공: ${successCount}개, 실패: ${errorCount}개`
      );

      // 업데이트된 텍스트 데이터 다시 전송
      const updatedTextNodes = collectAllTextNodes();
      const updatedTextData = updatedTextNodes.map((node) => ({
        id: node.id,
        content: node.content,
        isUxMode: node.isUxMode || false,
      }));

      figma.ui.postMessage({
        type: "texts-collected",
        texts: updatedTextData,
        languages: SUPPORTED_LANGUAGES,
      });
    } else {
      console.log(`⚠️ 알 수 없는 메시지 타입: ${msg.type}`);
    }
  } catch (error) {
    console.error("❌ 메시지 처리 중 오류 발생:", error);
    figma.notify("처리 중 오류가 발생했습니다 😅");
  }
};

// 선택된 노드가 변경될 때 처리
figma.on("selectionchange", () => {
  const selection = figma.currentPage.selection;
  console.log(`🎯 선택 변경: ${selection.length}개 노드 선택됨`);

  if (selection.length === 1) {
    const selectedNode = selection[0];
    let targetTextNode: TextNode | null = null;

    if (selectedNode.type === "TEXT") {
      targetTextNode = selectedNode as TextNode;
    } else {
      // 선택된 노드가 텍스트가 아니면 가장 가까운 텍스트 노드 찾기
      targetTextNode = findNearestTextNode(selectedNode);
    }

    if (targetTextNode) {
      const textInfo = {
        id: targetTextNode.id,
        content: targetTextNode.characters,
        originalContent: targetTextNode.getPluginData("originalText"),
        isUxMode: targetTextNode.getPluginData("isUxMode") === "true",
      };

      figma.ui.postMessage({
        type: "node-selected",
        textInfo: textInfo,
      });

      console.log(`📝 텍스트 노드 선택됨: "${textInfo.content}"`);
    }
  }
});

// 가장 가까운 텍스트 노드 찾기 (헬퍼 함수)
function findNearestTextNode(selectedNode: SceneNode): TextNode | null {
  // 선택된 노드의 자식 중에서 텍스트 노드 찾기
  function searchInChildren(node: SceneNode): TextNode | null {
    if (node.type === "TEXT") {
      return node as TextNode;
    }

    if ("children" in node) {
      for (const child of node.children) {
        const result = searchInChildren(child);
        if (result) return result;
      }
    }

    return null;
  }

  return searchInChildren(selectedNode);
}

console.log("🚀 플러그인 초기화 완료!");
