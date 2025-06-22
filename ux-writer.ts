// UX 라이팅 개선 전용 모듈
import { getPrompt, API_CONFIG, ERROR_MESSAGES } from "./prompt-config";

/**
 * UX 라이팅을 개선합니다 (단일 텍스트 또는 배열 처리)
 */
async function improveUxWriting(text: string): Promise<string>;
async function improveUxWriting(texts: string[]): Promise<string[]>;
async function improveUxWriting(
  input: string | string[]
): Promise<string | string[]> {
  // 단일 텍스트인 경우 배열로 변환
  const isArray = Array.isArray(input);
  const texts = isArray ? input : [input];

  if (!texts || texts.length === 0) {
    return isArray ? [] : "";
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error(ERROR_MESSAGES.NO_API_KEY);
    const failedTexts = texts.map(
      (t) => t + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`
    );
    return isArray ? failedTexts : failedTexts[0];
  }

  try {
    const model = API_CONFIG.GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const prompt = getPrompt(true); // 항상 배치 처리 프롬프트 사용
    const userPrompt = `다음 텍스트 배열의 각 항목을 UX 라이팅 가이드에 따라 개선해주세요:\n\n${JSON.stringify(
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
    } else {
      console.warn(ERROR_MESSAGES.INVALID_RESPONSE, responseText);
      const errorTexts = texts.map((t) => t + " (응답 형식 오류)");
      return isArray ? errorTexts : errorTexts[0];
    }

    try {
      const improvedTexts = JSON.parse(responseText);

      if (
        !Array.isArray(improvedTexts) ||
        improvedTexts.length !== texts.length
      ) {
        console.warn(
          `UX 라이팅 개선 결과가 유효한 배열이 아니거나 개수가 다릅니다. 원본: ${texts.length}, 결과: ${improvedTexts.length}`
        );
        const failedTexts = texts.map(
          (t) => t + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`
        );
        return isArray ? failedTexts : failedTexts[0];
      }

      // 단일 텍스트인 경우 첫 번째 결과만 반환
      return isArray ? improvedTexts : improvedTexts[0];
    } catch (parseError) {
      console.error(
        ERROR_MESSAGES.PARSING_FAILED,
        parseError,
        "원본 응답:",
        responseText
      );
      const errorTexts = texts.map((t) => t + " (파싱 오류)");
      return isArray ? errorTexts : errorTexts[0];
    }
  } catch (error) {
    console.error("UX 라이팅 개선 중 오류 발생:", error);
    const failedTexts = texts.map(
      (t) => t + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`
    );
    return isArray ? failedTexts : failedTexts[0];
  }
}

/**
 * 텍스트 타입을 자동으로 감지합니다
 */
function detectTextType(text: string): string {
  if (text.includes("?")) return "question";
  if (text.includes("!")) return "exclamation";
  if (text.length < 10) return "label";
  if (text.length > 50) return "description";
  return "general";
}

/**
 * 텍스트 톤을 분석합니다
 */
function analyzeTone(text: string): string {
  const formalKeywords = ["입니다", "습니다", "하십시오"];
  const informalKeywords = ["해요", "이에요", "해주세요"];

  const hasFormal = formalKeywords.some((keyword) => text.includes(keyword));
  const hasInformal = informalKeywords.some((keyword) =>
    text.includes(keyword)
  );

  if (hasFormal) return "formal";
  if (hasInformal) return "informal";
  return "neutral";
}

export { improveUxWriting, detectTextType, analyzeTone };
