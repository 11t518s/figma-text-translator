// UX 라이팅 개선 전용 모듈
import {
  getEnhancedPrompt,
  getBatchPrompt,
  API_CONFIG,
  ERROR_MESSAGES,
} from "./prompt-config";

/**
 * Google Gemini API를 사용하여 UX 라이팅을 개선합니다
 */
async function improveUxWritingWithAI(text: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error(ERROR_MESSAGES.NO_API_KEY);
    return text + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`;
  }

  try {
    const model = API_CONFIG.GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const prompt = getEnhancedPrompt();

    const bodyGemini = {
      systemInstruction: {
        parts: [{ text: prompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `다음 텍스트를 UX 라이팅 가이드에 따라 개선해주세요: "${text}"`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: API_CONFIG.TEMPERATURE,
        maxOutputTokens: API_CONFIG.SINGLE_MAX_TOKENS,
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyGemini),
    });

    if (!resp.ok) {
      throw new Error(`${ERROR_MESSAGES.API_CALL_FAILED}: ${resp.status}`);
    }

    const data = await resp.json();
    const improved = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (improved) return improved.trim();

    throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
  } catch (error) {
    console.error("UX 라이팅 개선 중 오류 발생:", error);
    return text + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`;
  }
}

/**
 * 여러 텍스트를 배치로 처리합니다
 */
async function improveUxWritingBatch(texts: string[]): Promise<string[]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error(ERROR_MESSAGES.NO_API_KEY);
      return texts.map((t) => t + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`);
    }

    const model = API_CONFIG.GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const enhancedPrompt = getBatchPrompt();
    const userPrompt = `다음 텍스트 배열의 각 항목을 UX 라이팅 가이드에 따라 개선해주세요:\n\n${JSON.stringify(
      texts
    )}`;

    const bodyGemini = {
      systemInstruction: {
        parts: [{ text: enhancedPrompt }],
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
      return texts.map((t) => t + " (응답 형식 오류)");
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
        return texts.map((t) => t + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`);
      }
      return improvedTexts;
    } catch (parseError) {
      console.error(
        ERROR_MESSAGES.PARSING_FAILED,
        parseError,
        "원본 응답:",
        responseText
      );
      return texts.map((t) => t + " (파싱 오류)");
    }
  } catch (error) {
    console.error("UX 라이팅 배치 개선 중 오류 발생:", error);
    return texts.map((t) => t + ` (${ERROR_MESSAGES.IMPROVEMENT_FAILED})`);
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

export {
  improveUxWritingWithAI,
  improveUxWritingBatch,
  detectTextType,
  analyzeTone,
};
