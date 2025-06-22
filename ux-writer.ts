// UX 라이팅 개선 전용 모듈

/**
 * Azure OpenAI API를 사용하여 UX 라이팅을 개선합니다
 */
async function improveUxWritingWithAI(text: string): Promise<string> {
  // 1) Google Gemini 우선 사용 (환경변수 존재 시)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-1.5-pro-latest";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

      const prompt = process.env.PROMPT ?? "";

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
          temperature: 0.3,
          maxOutputTokens: 300,
        },
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyGemini),
      });

      if (!resp.ok) {
        throw new Error(`Gemini API 호출 실패: ${resp.status}`);
      }

      const data = await resp.json();
      const improved = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (improved) return improved.trim();
    } catch (err) {
      console.error("Gemini UX 라이팅 실패", err);
      // 계속 진행하여 Azure OpenAI 시도
    }
  }

  try {
    console.error("Gemini 이후 Azure 경로 제거됨 – 개선 불가");
    return text + " (개선 실패)";
  } catch (error) {
    console.error("UX 라이팅 개선 중 오류 발생:", error);
    return text + " (개선 실패)";
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
      console.error("GEMINI_API_KEY가 설정되지 않았습니다.");
      return texts.map((t) => t + " (개선 실패)");
    }

    const model = process.env.GEMINI_MODEL || "gemini-1.5-pro-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const prompt = process.env.PROMPT;

    const userPrompt = `다음 텍스트 배열의 각 항목을 UX 라이팅 가이드에 따라 개선해주세요. 응답은 반드시 개선된 텍스트만 담은 JSON 문자열 배열(string array) 형식으로 원래 순서대로 제공해야 합니다. 예를 들어, 입력이 ["text1", "text2"] 라면, 응답은 ["improved text1", "improved text2"] 형식이어야 합니다. 다른 부연 설명이나 마크다운 문법(\`\`\`) 없이 순수한 JSON 배열만 반환해주세요.:\n\n${JSON.stringify(
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
        temperature: 0.3,
        maxOutputTokens: 4096, // 넉넉하게 설정
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
      throw new Error(`Gemini API 호출 실패: ${resp.status} ${errorText}`);
    }

    const data = await resp.json();
    let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // AI가 응답에 ```json ... ``` 와 같은 마크다운을 포함하는 경우 순수 JSON만 추출
    const jsonMatch = responseText.match(/(\[[\s\S]*\])/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    } else {
      console.warn(
        "응답에서 유효한 JSON 배열을 찾지 못했습니다.",
        responseText
      );
      // 유효한 JSON을 찾지 못하면 실패 처리
      return texts.map((t) => t + " (응답 형식 오류)");
    }

    try {
      // AI가 생성한 JSON 텍스트를 파싱
      const improvedTexts = JSON.parse(responseText);

      if (
        !Array.isArray(improvedTexts) ||
        improvedTexts.length !== texts.length
      ) {
        console.warn(
          `UX 라이팅 개선 결과가 유효한 배열이 아니거나 개수가 다릅니다. 원본: ${texts.length}, 결과: ${improvedTexts.length}`
        );
        return texts.map((t) => t + " (개선 실패)");
      }
      return improvedTexts;
    } catch (parseError) {
      console.error(
        "JSON 파싱 중 오류 발생:",
        parseError,
        "원본 응답:",
        responseText
      );
      return texts.map((t) => t + " (파싱 오류)");
    }
  } catch (error) {
    console.error("UX 라이팅 배치 개선 중 오류 발생:", error);
    return texts.map((t) => t + " (개선 실패)");
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
