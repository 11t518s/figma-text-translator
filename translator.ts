// 번역 전용 모듈

/**
 * Azure OpenAI API를 사용하여 텍스트를 번역합니다
 */
async function translateWithOpenAI(
  texts: string[],
  targetLanguage: string
): Promise<string[]> {
  // 1) Google Gemini가 설정되어 있으면 우선 사용
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-1.5-pro-latest";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

      const userPrompt = `다음 텍스트들을 ${targetLanguage}로 번역해주세요. 각 텍스트는 줄바꿈으로 구분되어 있습니다:\n\n${texts.join(
        "\n"
      )}`;

      const bodyGemini = {
        systemInstruction: {
          parts: [
            {
              text: `당신은 전문 번역가입니다. 주어진 텍스트를 ${targetLanguage}로 자연스럽게 번역해주세요. UI/UX 텍스트의 맥락을 고려하여 번역하세요.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: userPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
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
      const translatedContent =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const translatedTexts = translatedContent
        .trim()
        .split("\n")
        .filter((line: string) => line.trim());

      if (translatedTexts.length !== texts.length) {
        console.warn("번역된 텍스트 개수가 원본과 다릅니다 (Gemini)");
        return texts.map((t) => t + " (번역 실패)");
      }

      return translatedTexts;
    } catch (err) {
      console.error("Gemini 번역 실패", err);
      // 계속 진행하여 Azure OpenAI 시도
    }
  }

  // Gemini 사용 실패 시
  console.error("Gemini API도 실패했습니다. 번역 불가");
  return texts.map((t) => t + " (번역 실패)");
}

export { translateWithOpenAI };
