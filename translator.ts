// OpenAI API를 사용한 번역 함수
// 나중에 API 키를 받으면 이 함수를 code.ts에서 사용하세요

interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

interface TranslationResponse {
  translatedText: string;
  error?: string;
}

/**
 * OpenAI API를 사용하여 텍스트를 번역합니다
 * @param apiKey OpenAI API 키
 * @param request 번역 요청 정보
 * @returns 번역된 텍스트
 */
export async function translateWithOpenAI(
  apiKey: string,
  request: TranslationRequest
): Promise<TranslationResponse> {
  const { text, targetLanguage, sourceLanguage = "auto" } = request;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the given text to ${getLanguageName(
              targetLanguage
            )}. Only return the translated text without any additional explanation or formatting. Maintain the original tone and style.`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API 요청 실패: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error("번역 결과가 비어있습니다");
    }

    return { translatedText };
  } catch (error) {
    console.error("번역 오류:", error);
    return {
      translatedText: text,
      error:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다",
    };
  }
}

/**
 * 언어 코드를 언어 이름으로 변환
 */
function getLanguageName(languageCode: string): string {
  const languageNames: { [key: string]: string } = {
    ko: "Korean",
    en: "English",
    ja: "Japanese",
    zh: "Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ar: "Arabic",
    hi: "Hindi",
    th: "Thai",
    vi: "Vietnamese",
  };

  return languageNames[languageCode] || languageCode;
}

/**
 * 텍스트 배열을 배치로 번역
 * @param apiKey OpenAI API 키
 * @param texts 번역할 텍스트 배열
 * @param targetLanguage 대상 언어
 * @param onProgress 진행률 콜백 (선택사항)
 * @returns 번역된 텍스트 배열
 */
export async function translateBatch(
  apiKey: string,
  texts: string[],
  targetLanguage: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    if (text.trim() === "") {
      results.push(text);
      continue;
    }

    const response = await translateWithOpenAI(apiKey, {
      text,
      targetLanguage,
    });

    results.push(response.translatedText);

    // 진행률 콜백 호출
    if (onProgress) {
      onProgress(i + 1, texts.length);
    }

    // API 레이트 리밋을 위한 짧은 지연
    if (i < texts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

// code.ts에서 실제 번역 기능을 사용하려면 아래 코드를 참고하세요:
/*
// code.ts에서 사용하는 방법:

import { translateWithOpenAI, translateBatch } from './translator';

// 단일 텍스트 번역
async function translateText(text: string, targetLanguage: string) {
  const apiKey = 'YOUR_OPENAI_API_KEY'; // 실제 API 키로 교체
  const result = await translateWithOpenAI(apiKey, {
    text,
    targetLanguage
  });
  
  if (result.error) {
    console.error('번역 오류:', result.error);
    return text; // 오류 시 원본 텍스트 반환
  }
  
  return result.translatedText;
}

// 배치 번역 (여러 텍스트를 한 번에)
async function translateMultipleTexts(texts: string[], targetLanguage: string) {
  const apiKey = 'YOUR_OPENAI_API_KEY'; // 실제 API 키로 교체
  
  return await translateBatch(
    apiKey, 
    texts, 
    targetLanguage,
    (current, total) => {
      console.log(`번역 진행률: ${current}/${total}`);
      // UI에 진행률 표시
      figma.ui.postMessage({
        type: 'translation-progress',
        current,
        total
      });
    }
  );
}
*/
