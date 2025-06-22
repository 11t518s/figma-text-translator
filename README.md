# Figma 텍스트 번역 및 UX 라이팅 플러그인

Figma 페이지의 모든 텍스트를 한 번에 번역하고 UX 라이팅으로 개선할 수 있는 플러그인입니다.

## 주요 기능

1. **텍스트 자동 수집**: Figma 페이지의 모든 텍스트 레이어를 자동으로 찾아서 목록화합니다
2. **UX 라이팅 개선**: AI를 활용하여 카카오모빌리티 스타일 가이드에 따라 텍스트를 개선합니다
3. **다국어 번역**: 7개 언어로 번역 지원 (한국어, 영어, 일본어, 중국어, 스페인어, 프랑스어, 독일어)
4. **CSV 내보내기/가져오기**: 텍스트 데이터를 CSV로 관리할 수 있습니다
5. **실시간 토글**: 원본 텍스트와 UX 라이팅 개선된 텍스트 간 전환 가능

## 설치 및 설정

1. 개발 환경 설정:

```bash
npm install
```

2. 환경 변수 설정 (`.env` 파일 생성):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

3. TypeScript 빌드:

```bash
npm run build
```

4. Figma 플러그인 개발 모드에서 이 폴더를 등록

## 사용 방법

### 1. 플러그인 실행

- Figma에서 `Plugins` > `Development` > `텍스트 번역 및 UX 라이팅` 실행

### 2. 텍스트 수집 및 UX 라이팅

- 플러그인이 실행되면 자동으로 현재 페이지의 모든 텍스트를 수집합니다
- AI가 자동으로 UX 라이팅 개선안을 생성합니다
- 각 텍스트별로 원본 ↔ UX 라이팅 전환이 가능합니다

### 3. 다국어 번역

- 드롭다운에서 번역할 언어를 선택합니다
- `번역하기` 버튼을 클릭하여 번역을 실행합니다

### 4. CSV 관리

- `CSV 내보내기`로 텍스트 데이터를 저장할 수 있습니다
- 외부에서 편집한 CSV를 다시 가져와서 적용할 수 있습니다

## 🔧 프롬프트 커스터마이징

### 프롬프트 수정 방법

`prompt-config.ts` 파일에서 UX 라이팅의 품질과 스타일을 조정할 수 있습니다:

#### 1. 기본 프롬프트 수정 (`UX_WRITING_PROMPT`)

```typescript
export const UX_WRITING_PROMPT = `
당신은 [회사명]의 UX 라이팅 전문가입니다. 

다음 원칙에 따라 텍스트를 개선해주세요:
// 여기에 원하는 가이드라인 추가
`;
```

**수정 예시:**

- 회사 브랜드에 맞는 톤앤매너 추가
- 특정 업계(금융, 의료, 게임 등)에 맞는 지침 추가
- 더 구체적인 스타일 가이드 반영

#### 2. 예시 데이터 추가/수정 (`UX_GUIDE_EXAMPLES`)

```typescript
export const UX_GUIDE_EXAMPLES = [
  { original: "기존 표현", improved: "개선된 표현" },
  // 새로운 예시 추가
  { original: "로그인하세요", improved: "로그인해주세요" },
  { original: "오류가 발생했습니다", improved: "문제가 생겼어요" },
];
```

**추가 팁:**

- 더 많은 예시를 추가할수록 AI의 정확도가 향상됩니다
- 특정 도메인의 전문 용어 변환 예시를 추가하세요
- 회사의 실제 UX 라이팅 가이드에서 예시를 가져오세요

#### 3. AI 모델 설정 조정 (`API_CONFIG`)

```typescript
export const API_CONFIG = {
  GEMINI_MODEL: "gemini-1.5-pro-latest", // 모델 변경
  TEMPERATURE: 0.3, // 0.0~1.0 (낮을수록 일관성 높음)
  MAX_OUTPUT_TOKENS: 4096, // 응답 길이 제한
};
```

**설정 가이드:**

- `TEMPERATURE`: 0.1~0.3 (일관성), 0.7~0.9 (창의성)
- `GEMINI_MODEL`: `gemini-1.5-flash` (빠름), `gemini-1.5-pro-latest` (정확함)

#### 4. 커스텀 프롬프트 예시

**금융 서비스용:**

```typescript
export const UX_WRITING_PROMPT = `
당신은 금융 서비스의 UX 라이팅 전문가입니다.

다음 원칙에 따라 텍스트를 개선해주세요:
1. 신뢰감을 주는 정확한 표현 사용
2. 금융 용어를 일반인이 이해하기 쉽게 설명
3. 불안감을 주지 않는 친근한 톤
4. 법적 리스크를 고려한 신중한 표현
`;
```

**게임 서비스용:**

```typescript
export const UX_WRITING_PROMPT = `
당신은 게임 서비스의 UX 라이팅 전문가입니다.

다음 원칙에 따라 텍스트를 개선해주세요:
1. 재미있고 흥미로운 표현 사용
2. 게이머들이 친숙한 용어 활용
3. 성취감과 몰입감을 높이는 문구
4. 간결하면서도 임팩트 있는 메시지
`;
```

## 파일 구조

```
├── manifest.json          # 플러그인 매니페스트
├── package.json           # 의존성 관리
├── tsconfig.json          # TypeScript 설정
├── code.ts               # 메인 플러그인 로직
├── ui.html               # 플러그인 UI
├── ui.ts                 # UI 로직 (삭제됨)
├── translator.ts         # OpenAI 번역 함수
├── ux-writer.ts          # UX 라이팅 개선 함수
├── prompt-config.ts      # 프롬프트 및 설정 관리
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

### 새로운 언어 추가

`code.ts`의 `SUPPORTED_LANGUAGES` 객체에 새로운 언어를 추가하면 됩니다:

```typescript
const SUPPORTED_LANGUAGES = {
  // 기존 언어들...
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
};
```

### API 키 설정

1. **Gemini API 키** (UX 라이팅용):

   - [Google AI Studio](https://makersuite.google.com/app/apikey)에서 발급
   - `.env` 파일에 `GEMINI_API_KEY` 설정
   - 
## 문제 해결

### 자주 발생하는 문제

1. **프롬프트 응답이 이상해요**

   - `prompt-config.ts`의 `TEMPERATURE` 값을 0.1~0.3으로 낮춰보세요
   - 더 많은 예시 데이터를 `UX_GUIDE_EXAMPLES`에 추가하세요

2. **특정 용어가 제대로 변환되지 않아요**

   - 해당 용어의 변환 예시를 `UX_GUIDE_EXAMPLES`에 추가하세요
   - 프롬프트에 더 구체적인 지침을 추가하세요

3. **AI 응답이 너무 창의적이에요**
   - `TEMPERATURE`를 0.1로 낮춰보세요
   - 프롬프트에 "정확히 따라주세요" 같은 지침을 추가하세요

## 주의사항

- 번역 및 UX 라이팅 작업은 되돌릴 수 없습니다. 중요한 작업 전에는 백업을 만드세요
- 한 번에 많은 텍스트를 처리할 때는 시간이 걸릴 수 있습니다
- API 사용 시 요금이 발생할 수 있습니다
- 프롬프트 수정 후에는 빌드(`npm run build`)를 다시 실행하세요

## 라이선스

MIT License
