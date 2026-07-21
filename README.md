# 기여로

내게 맞는 첫 오픈소스 기여를 찾고 준비하는 웹 애플리케이션입니다.

## 주요 기능

- 언어, 난이도, 작업 유형을 기준으로 코드 이슈 탐색
- GitHub 이슈 URL을 통한 공개 이슈 불러오기
- 저장소의 개발 활성도와 최근 외부 PR 기반 기여 친화도 확인
- 실제 GitHub 영문·한국어 문서의 번역 상태 비교
- 저장소별 기여 가이드 번역본 확인

## 실행

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://127.0.0.1:5173`에서 실행됩니다.

## 페이지 경로

- `/translations/:repoKey/:docId`: 번역 문서 상세
- `/issues`: 문서 번역을 포함한 성장 단계별 카테고리 추천, 저장소 검색, 이슈 URL 검색 및 상세
- `/guides`: 저장소별 기여 가이드
- `/mypage`: 관심·진행 중·기여 완료 이슈 모음

상세 페이지는 React Router 경로를 사용하며, `vercel.json`의 rewrite 설정으로 배포 환경에서도 직접 접속할 수 있습니다.

## AI 분석

추천 목록 또는 URL로 불러온 공개 GitHub 이슈의 핵심 내용과 작업 범위를 AI가 한국어로 정리합니다. API 키는 브라우저 번들에 포함되지 않으며 로컬 개발 서버 또는 배포 환경의 서버리스 함수에서만 사용합니다.

번역 기여 화면에서는 다음 공개 저장소의 영문 원문과 한국어 번역본, 최신 파일 커밋을 가져와 의미상 누락 범위를 분석합니다.

- React: `reactjs/react.dev` ↔ `reactjs/ko.react.dev`
- MDN: `mdn/content` ↔ `mdn/translated-content`
- Vue: `vuejs/docs` ↔ `vuejs-translations/docs-ko`

```bash
cp .env.example .env.local
npm run dev
```

`.env.local`에 AI 분석용 API 키를 설정합니다.

```env
NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
```

Vercel에 배포할 때도 동일한 환경 변수를 프로젝트 설정에 등록합니다. `api/analyze-issue.ts`와 `api/translation-status.ts`가 서버리스 함수로 실행되므로 키를 `VITE_` 접두사로 노출하면 안 됩니다. 기본 모델은 NVIDIA NIM의 무료 엔드포인트를 제공하는 `nvidia/nemotron-3-ultra-550b-a55b`입니다.

GitHub 토큰은 선택 사항입니다. 공개 API 호출 제한을 높일 때만 추가합니다.

```env
GITHUB_TOKEN=
```

## 빌드

```bash
npm run build
```

## 타입 검사

```bash
npm run typecheck
```
