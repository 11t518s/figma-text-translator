# Figma 텍스트 번역기 플러그인

Figma 페이지의 모든 텍스트를 한 번에 다른 언어로 번역할 수 있는 플러그인입니다.

## 주요 기능

1. **텍스트 자동 수집**: Figma 페이지의 모든 텍스트 레이어를 자동으로 찾아서 목록화합니다
2. **다국어 번역**: 7개 언어로 번역 지원 (한국어, 영어, 일본어, 중국어, 스페인어, 프랑스어, 독일어)
3. **실시간 번역**: 버튼 클릭 한 번으로 모든 텍스트를 선택한 언어로 번역합니다
4. **모킹 기능**: OpenAI API 키 없이도 테스트 가능한 모킹 번역 기능 제공

## 설치 및 설정

1. 개발 환경 설정:

```bash
npm install
```

2. TypeScript 빌드:

```bash
npm run build
```

3. Figma 플러그인 개발 모드에서 이 폴더를 등록

## 사용 방법

### 1. 플러그인 실행

- Figma에서 `Plugins` > `Development` > `텍스트 번역기` 실행

### 2. 텍스트 확인

- 플러그인이 실행되면 자동으로 현재 페이지의 모든 텍스트를 수집합니다
- 수집된 텍스트 목록이 플러그인 창에 표시됩니다

### 3. 언어 선택 및 번역

- 드롭다운에서 번역할 언어를 선택합니다
- `번역하기` 버튼을 클릭하여 번역을 실행합니다
- 확인 다이얼로그에서 `확인`을 클릭하면 번역이 시작됩니다

### 4. 텍스트 새로고침

- 페이지에 새로운 텍스트를 추가한 경우 `텍스트 새로고침` 버튼을 사용하세요

## 현재 상태

### 현재 사용 가능한 기능

- ✅ 텍스트 자동 수집
- ✅ 모킹 번역 (테스트용)
- ✅ UI 인터페이스
- ✅ 다국어 지원

### 실제 번역 기능 사용하기

현재는 모킹 함수를 사용하고 있습니다. 실제 OpenAI API를 사용하려면:

1. OpenAI API 키를 발급받으세요
2. `code.ts` 파일에서 다음 변경사항을 적용하세요:

```typescript
// 모킹 함수 대신 실제 번역 함수 사용
import { translateWithOpenAI } from "./translator";

// mockTranslate 함수를 이것으로 교체:
async function realTranslate(
  text: string,
  targetLanguage: string
): Promise<string> {
  const apiKey = "YOUR_OPENAI_API_KEY"; // 실제 API 키로 교체
  const result = await translateWithOpenAI(apiKey, {
    text,
    targetLanguage,
  });

  if (result.error) {
    console.error("번역 오류:", result.error);
    return text; // 오류 시 원본 텍스트 반환
  }

  return result.translatedText;
}
```

## 파일 구조

```
├── manifest.json          # 플러그인 매니페스트
├── package.json           # 의존성 관리
├── tsconfig.json          # TypeScript 설정
├── code.ts               # 메인 플러그인 로직
├── ui.html               # 플러그인 UI
├── ui.ts                 # UI 로직
├── translator.ts         # OpenAI 번역 함수
└── README.md             # 사용 방법
```

## 지원 언어

- 🇰🇷 한국어 (ko)
- 🇺🇸 English (en)
- 🇯🇵 日本語 (ja)
- 🇨🇳 中文 (zh)
- 🇪🇸 Español (es)
- 🇫🇷 Français (fr)
- 🇩🇪 Deutsch (de)

## 개발자 정보

### 개발 모드 실행

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

### 추가 언어 지원

`code.ts`의 `SUPPORTED_LANGUAGES` 객체에 새로운 언어를 추가하면 됩니다:

```typescript
const SUPPORTED_LANGUAGES = {
  // 기존 언어들...
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
};
```

## 주의사항

- 번역 작업은 되돌릴 수 없습니다. 중요한 작업 전에는 백업을 만드세요
- 한 번에 많은 텍스트를 번역할 때는 시간이 걸릴 수 있습니다
- OpenAI API 사용 시 요금이 발생할 수 있습니다

## 라이선스

MIT License
