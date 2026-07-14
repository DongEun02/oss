# OSS

첫 오픈소스 기여를 찾고 준비하는 웹 애플리케이션입니다.

## 주요 기능

- 언어, 난이도, 작업 유형을 기준으로 코드 이슈 탐색
- GitHub 이슈 URL을 통한 공개 이슈 불러오기
- 번역 기여 작업과 원문 비교
- 저장소별 기여 가이드 번역본 확인

## 실행

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://127.0.0.1:5173`에서 실행됩니다.

## AI 이슈 분석

추천 목록 또는 URL로 불러온 공개 GitHub 이슈의 핵심 내용과 작업 범위를 AI가 한국어로 정리합니다. API 키는 브라우저 번들에 포함되지 않으며 로컬 개발 서버 또는 배포 환경의 서버리스 함수에서만 사용합니다.

```bash
cp .env.example .env.local
npm run dev
```

`.env.local`에 AI 분석용 API 키를 설정합니다.

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

Vercel에 배포할 때도 동일한 환경 변수를 프로젝트 설정에 등록합니다. `api/analyze-issue.js`가 서버리스 함수로 실행되므로 키를 `VITE_` 접두사로 노출하면 안 됩니다.

GitHub 토큰은 선택 사항입니다. 공개 API 호출 제한을 높일 때만 추가합니다.

```env
GITHUB_TOKEN=
```

## 빌드

```bash
npm run build
```
