// UX Writing 전용 모듈
// OpenAI API를 사용한 UX Writing 개선 기능

interface UxWritingRequest {
  text: string;
  context?: string;
  tone?: "friendly" | "professional" | "casual" | "formal";
  target?: "button" | "label" | "message" | "description" | "title";
}

interface UxWritingResponse {
  improvedText: string;
  error?: string;
  reasoning?: string;
}

/**
 * OpenAI API를 사용하여 UX Writing을 개선합니다
 * @param apiKey OpenAI API 키
 * @param request UX Writing 개선 요청 정보
 * @returns 개선된 텍스트
 */
export async function improveUxWritingWithAI(
  apiKey: string,
  request: UxWritingRequest
): Promise<UxWritingResponse> {
  const { text, context = "", tone = "friendly", target = "label" } = request;

  try {
    const systemPrompt = `You are a UX writing expert specializing in creating clear, concise, and user-friendly interface text. 

Your task is to improve the given text following these principles:
- Clarity: Make it immediately understandable
- Conciseness: Remove unnecessary words
- User-friendliness: Use language that feels natural and helpful
- Consistency: Maintain appropriate tone throughout
- Accessibility: Consider diverse user needs

Target element type: ${target}
Desired tone: ${tone}
Context: ${context || "General UI element"}

Rules:
1. Keep the core meaning intact
2. Make it more actionable and clear
3. Remove jargon and complex terms
4. Use active voice when possible
5. Consider the user's emotional state
6. Ensure it's scannable and easy to read

Return only the improved text, nothing else.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Original text: "${text}"`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
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

    return {
      improvedText,
      reasoning: `${target} 요소를 ${tone} 톤으로 개선했습니다.`,
    };
  } catch (error) {
    console.error("UX Writing 개선 오류:", error);
    return {
      improvedText: mockUxWriting(text),
      error:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다",
    };
  }
}

/**
 * 모킹 UX Writing 개선 함수
 * API 키가 없을 때 사용되는 기본 개선 로직
 */
export function mockUxWriting(text: string): string {
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

  // 3. 기본 suffix 추가 (원래 동작 유지)
  return improved + "유엑스라이팅결과값";
}

/**
 * 텍스트 배열을 배치로 UX Writing 개선
 * @param apiKey OpenAI API 키 (선택사항)
 * @param texts 개선할 텍스트 배열
 * @param options 개선 옵션
 * @param onProgress 진행률 콜백 (선택사항)
 * @returns 개선된 텍스트 배열
 */
export async function improveUxWritingBatch(
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
      // OpenAI API 사용
      const response = await improveUxWritingWithAI(apiKey, {
        text,
        ...options,
      });
      improvedText = response.improvedText;
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

/**
 * 텍스트 타입 자동 감지
 * @param text 분석할 텍스트
 * @returns 감지된 텍스트 타입
 */
export function detectTextType(text: string): UxWritingRequest["target"] {
  const lowerText = text.toLowerCase();

  // 버튼 텍스트 패턴
  if (
    lowerText.includes("클릭") ||
    lowerText.includes("선택") ||
    lowerText.includes("확인") ||
    lowerText.includes("취소") ||
    lowerText.includes("저장") ||
    lowerText.includes("삭제") ||
    lowerText.includes("추가") ||
    lowerText.includes("등록") ||
    lowerText.length < 10
  ) {
    return "button";
  }

  // 제목 패턴
  if (text.length < 30 && !text.includes(".") && !text.includes("?")) {
    return "title";
  }

  // 메시지 패턴
  if (
    lowerText.includes("오류") ||
    lowerText.includes("성공") ||
    lowerText.includes("완료") ||
    lowerText.includes("실패")
  ) {
    return "message";
  }

  // 설명 패턴
  if (text.length > 50) {
    return "description";
  }

  // 기본값
  return "label";
}

/**
 * 텍스트 톤 자동 감지
 * @param text 분석할 텍스트
 * @returns 감지된 톤
 */
export function detectTextTone(text: string): UxWritingRequest["tone"] {
  const lowerText = text.toLowerCase();

  // 공식적인 톤
  if (
    lowerText.includes("하십시오") ||
    lowerText.includes("바랍니다") ||
    lowerText.includes("드립니다")
  ) {
    return "formal";
  }

  // 전문적인 톤
  if (
    lowerText.includes("시스템") ||
    lowerText.includes("데이터") ||
    lowerText.includes("프로세스")
  ) {
    return "professional";
  }

  // 캐주얼한 톤
  if (
    lowerText.includes("해봐") ||
    lowerText.includes("해보자") ||
    lowerText.includes("ㅎㅎ") ||
    lowerText.includes("!")
  ) {
    return "casual";
  }

  // 기본값: 친근한 톤
  return "friendly";
}

// code.ts에서 실제 UX Writing 기능을 사용하려면 아래 코드를 참고하세요:
/*
// code.ts에서 사용하는 방법:

import { mockUxWriting, improveUxWritingBatch, improveUxWritingWithAI } from './ux-writer';

// 단일 텍스트 UX Writing 개선
async function improveText(text: string) {
  const apiKey = 'YOUR_OPENAI_API_KEY'; // 실제 API 키로 교체
  
  if (apiKey) {
    const result = await improveUxWritingWithAI(apiKey, {
      text,
      tone: 'friendly',
      target: 'label'
    });
    
    if (result.error) {
      console.error('UX Writing 개선 오류:', result.error);
      return mockUxWriting(text); // 오류 시 모킹 함수 사용
    }
    
    return result.improvedText;
  } else {
    return mockUxWriting(text);
  }
}

// 배치 UX Writing 개선 (여러 텍스트를 한 번에)
async function improveMultipleTexts(texts: string[]) {
  const apiKey = 'YOUR_OPENAI_API_KEY'; // 실제 API 키로 교체
  
  return await improveUxWritingBatch(
    apiKey, 
    texts, 
    { tone: 'friendly' },
    (current, total) => {
      console.log(`UX Writing 진행률: ${current}/${total}`);
      // UI에 진행률 표시
      figma.ui.postMessage({
        type: 'ux-writing-progress',
        current,
        total
      });
    }
  );
}
*/
