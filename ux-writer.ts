// UX 라이팅 개선 전용 모듈
import {
  getPrompt,
  getPromptWithReasons,
  API_CONFIG,
  ERROR_MESSAGES,
} from "./prompt-config";

// 개선 결과 인터페이스
interface ImprovementResult {
  original: string;
  improved: string;
  reason: string;
}

// 공통 API 호출 함수
async function callGeminiAPI(
  texts: string[],
  includeReasons: boolean = false
): Promise<any> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error(ERROR_MESSAGES.NO_API_KEY);
  }

  const model = API_CONFIG.GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

  const prompt = includeReasons ? getPromptWithReasons(true) : getPrompt(true);
  const userPrompt = `다음 텍스트 배열을 개선해주세요:\n\n${JSON.stringify(
    texts
  )}`;

  const bodyGemini = {
    systemInstruction: {
      parts: [{ text: prompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: API_CONFIG.TEMPERATURE,
      maxOutputTokens: API_CONFIG.BATCH_MAX_TOKENS,
      response_mime_type: "application/json",
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyGemini),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(
      `${ERROR_MESSAGES.API_CALL_FAILED}: ${resp.status} ${errorText}`
    );
  }

  const data = await resp.json();
  let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  // AI가 응답에 ```json ... ``` 와 같은 마크다운을 포함하는 경우 순수 JSON만 추출
  const jsonMatch = responseText.match(/(\[[\s\S]*\])/);
  if (jsonMatch) {
    responseText = jsonMatch[0];
  }

  return JSON.parse(responseText);
}

/**
 * UX 라이팅을 개선합니다 (단일 텍스트 또는 배열 처리)
 */
async function improveUxWriting(text: string): Promise<string>;
async function improveUxWriting(texts: string[]): Promise<string[]>;
async function improveUxWriting(
  input: string | string[]
): Promise<string | string[]> {
  const isArray = Array.isArray(input);
  const texts = isArray ? input : [input];

  if (!texts || texts.length === 0) {
    return isArray ? [] : "";
  }

  try {
    const improvedTexts = await callGeminiAPI(texts, false);

    if (
      !Array.isArray(improvedTexts) ||
      improvedTexts.length !== texts.length
    ) {
      console.warn(
        `UX 라이팅 개선 결과가 유효하지 않습니다. 원본: ${texts.length}, 결과: ${improvedTexts.length}`
      );
      const failedTexts = texts.map(
        (t) => t + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`
      );
      return isArray ? failedTexts : failedTexts[0];
    }

    return isArray ? improvedTexts : improvedTexts[0];
  } catch (error) {
    console.error("UX 라이팅 개선 중 오류 발생:", error);
    const failedTexts = texts.map(
      (t) => t + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`
    );
    return isArray ? failedTexts : failedTexts[0];
  }
}

/**
 * 변경 이유와 함께 UX 라이팅을 개선합니다
 */
async function improveUxWritingWithReasons(
  texts: string[]
): Promise<ImprovementResult[]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    const results = (await callGeminiAPI(texts, true)) as ImprovementResult[];

    if (!Array.isArray(results) || results.length !== texts.length) {
      console.warn(
        `UX 라이팅 개선 결과가 유효하지 않습니다. 원본: ${texts.length}, 결과: ${results.length}`
      );
      return texts.map((text) => ({
        original: text,
        improved: text + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`,
        reason: "응답 형식 오류",
      }));
    }

    return results;
  } catch (error) {
    console.error("UX 라이팅 개선 중 오류 발생:", error);
    if (error instanceof Error && error.message === ERROR_MESSAGES.NO_API_KEY) {
      return texts.map((text) => ({
        original: text,
        improved: text + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`,
        reason: "API 키가 설정되지 않음",
      }));
    }
    return texts.map((text) => ({
      original: text,
      improved: text + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`,
      reason: "처리 중 오류 발생",
    }));
  }
}

export { improveUxWriting, improveUxWritingWithReasons, ImprovementResult };
