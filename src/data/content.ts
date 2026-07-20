import { TRANSLATION_LANGUAGES } from "../../shared/translationSources";

export const TRANSLATION_PRESETS = {
  tanstack: {
    name: "TanStack Query",
    description: "강력하고 유연한 React/TS용 상태 비동기 동기화 헬퍼 라이브러리",
    progress: 74,
    languageTags: ["TypeScript", "JavaScript"],
    techStack: ["React", "TypeScript", "Core"],
    untranslatedCount: 2,
    docs: [
      { id: "getting-started", title: "Getting Started", status: "completed", statusText: "한국어 최신화 완료" },
      { id: "query-keys", title: "Query Keys", status: "alert", statusText: "영어 문서에 새 문단 추가됨" },
      { id: "mutations", title: "Mutations", status: "partial", statusText: "일부 문단 번역 안됨" }
    ],
    docContent: {
      "query-keys": {
        en: [
          { text: "At their core, Query Keys are serializable arrays.", highlight: false },
          { text: "When you pass a query key, TanStack Query will serialize it into a stable hash.", highlight: false },
          { text: "If you pass non-memoized inline objects inside your query key, it might trigger infinite rendering loops. Always memoize or use static primitives where possible.", highlight: true }
        ],
        ko: [
          { text: "쿼리 키는 본질적으로 직렬화가 가능한 고유 배열입니다.", highlight: false },
          { text: "개발자가 쿼리 키를 전달하면, TanStack Query가 내부적으로 이를 안정적인 해시 스트링 형태로 인코딩하여 캐싱키로 활용합니다.", highlight: false },
          { text: "(번역 대기 중... 컴포넌트 재생성 시 무한 루프 위험을 막기 위해 원시 타입을 권장한다는 문단이 추가되었습니다.)", highlight: true, needsTranslation: true }
        ]
      }
    },
    guidelines: {
      branchPattern: "fix/6235-querykey-infinite-loop",
      commitConvention: "fix(query): stableValueHash for nested objects to prevent loop #6235",
      steps: [
        {
          title: "유틸리티 직렬화 고도화",
          desc: "src/core/utils.ts 내의 stableValueHash 함수를 분석하여, 단순 원시형 값 직렬화뿐만 아니라 다차원 인라인 오브젝트 키값 쌍의 정렬 및 결합 해시 메커니즘을 적용하세요."
        },
        {
          title: "캐싱 비교 시점 수정",
          desc: "src/core/queryObserver.ts 의 이펙트 트리거 단계에서 단순 object reference 얕은 비교 구조를 stableValueHash 기반 스트링 매칭으로 수정하세요."
        },
        {
          title: "메모리 보존 테스트 작성",
          desc: "useQuery.test.tsx에 인라인 객체를 활용한 무한 렌더링 시뮬레이션을 모사하고, 쿼리가 불필요하게 튀지 않는지 확인하는 assertion 코드를 삽입하세요."
        }
      ],
      checklist: [
        "패키지 루트에서 `yarn test` 실행 시 기존 코어 라이브러리 테스트 100% 통과 여부",
        "인라인 정렬 연산 수행 시 대량의 쿼리 키 바인딩 하에서 가비지 컬렉터(GC) 병목이 없는지 성능 측정",
        "PR 생성 시 수정 코드의 line 넘버 및 원인에 대해 테스트 통합 명세를 필수 준수했는지 확인"
      ]
    }
  },
  react: {
    name: "React (공식 한국어 문서)",
    description: "사용자 인터페이스를 만들기 위한 공식 자바스크립트 라이브러리",
    progress: 92,
    languageTags: ["JavaScript", "TypeScript"],
    techStack: ["React", "Documentation"],
    untranslatedCount: 1,
    docs: [
      { id: "hooks-intro", title: "Hooks Introduction", status: "completed", statusText: "한국어 최신화 완료" },
      { id: "useid-doc", title: "useId API", status: "alert", statusText: "영어 문서에 새 문단 추가됨" },
      { id: "suspense", title: "Suspense Boundary Guidelines", status: "partial", statusText: "일부 문단 번역 안됨" }
    ],
    docContent: {
      "useid-doc": {
        en: [
          { text: "useId is a React Hook for generating unique IDs that can be passed to accessibility attributes.", highlight: false },
          { text: "It prevents hydration mismatches by ensuring consistent ID generation order.", highlight: false },
          { text: "Never use useId to generate keys in a list. Keys should still be generated from your data source.", highlight: true }
        ],
        ko: [
          { text: "useId는 스크린 리더용 웹 접근성 속성 등에 바인딩할 수 고유 ID를 만드는 React Hook입니다.", highlight: false },
          { text: "서버 렌더링 값과 클라이언트 하이드레이션 과정의 고유 ID 수열 할당 순서를 일치시켜 미스매치를 예방합니다.", highlight: false },
          { text: "(번역 대기 중... useId를 리스트의 렌더링 key 속성으로 오용하지 말라는 가이드라인 문단이 신설되었습니다.)", highlight: true, needsTranslation: true }
        ]
      }
    },
    guidelines: {
      branchPattern: "fix/24410-useid-suspense-hydration",
      commitConvention: "fix(react-reconciler): track useId offset under suspense boundaries #24410",
      steps: [
        {
          title: "Fiber 렌더러 카운터 동기화",
          desc: "packages/react-reconciler/src/ReactFiberConfig.js SSR 렌더링 패스와 클라이언트 하이드레이션 패스가 동일한 레벨로 useId 오프셋을 증가시키도록 내부 추적 자료구조를 교정하세요."
        },
        {
          title: "Suspense 바운더리 탈출 제어",
          desc: "packages/react-reconciler/src/ReactFiberWorkLoop.new.js Suspense 렌더링에 깊은 뎁스로 진입할 때 treeContext 스택의 푸시/팝 주기를 동일 수준으로 동기화하세요."
        }
      ],
      checklist: [
        "기존 React Reconciler 및 Fizz 스트리밍 패키지 단위 테스트 전체 빌드 성공 완료",
        "React 소스코드 기여 규칙에 의거, 커미터 라이선스 동의서(CLA) 등록 여부 체크"
      ]
    }
  },
  nextjs: {
    name: "Next.js",
    description: "풀스택 React 웹 애플리케이션 프레임워크",
    progress: 81,
    languageTags: ["TypeScript", "JavaScript"],
    techStack: ["Next.js", "Server Components"],
    untranslatedCount: 1,
    docs: [
      { id: "routing", title: "App Router Conventions", status: "completed", statusText: "한국어 최신화 완료" },
      { id: "optimizations", title: "Images & Font Optimization", status: "alert", statusText: "영어 문서에 새 문단 추가됨" }
    ],
    docContent: {
      "optimizations": {
        en: [
          { text: "Next.js automatically optimizes images using the next/image component.", highlight: false },
          { text: "Custom layout shift parameters must be configured properly.", highlight: false },
          { text: "Remote patterns now enforce strict hostname validation to prevent cross-site scripting vulnerabilities.", highlight: true }
        ],
        ko: [
          { text: "Next.js는 내장 next/image 컴포넌트를 통해 이미지를 디바이스별로 압축/최적화해 서빙합니다.", highlight: false },
          { text: "레이아웃 누설(CLS)을 감쇄하기 위해 이미지의 크기 값을 미리 할당해 주어야 합니다.", highlight: false },
          { text: "(번역 대기 중... 원격 이미지 패턴 설정 시 XSS 보안 위협을 막기 위한 강제 호스트네임 검증 제약이 추가되었습니다.)", highlight: true, needsTranslation: true }
        ]
      }
    },
    guidelines: {
      branchPattern: "fix/optimizations-hostname-validation",
      commitConvention: "fix(optimizations): enforce strict remote pattern hostname validation #1209",
      steps: [
        {
          title: "호스트네임 검증 로직 가필",
          desc: "packages/next/server/image-optimizer.ts 에서 remotePatterns의 호스트네임 매칭 유효성을 검사하는 조건을 추가하세요."
        },
        {
          title: "보안 테스트 추가",
          desc: "test/integration/image-optimization/test.js 에 원격 경로 공격용 주입 케이스에 대한 우회 검증 스위트를 추가해 정상 차단 여부를 검사하세요."
        }
      ],
      checklist: [
        "next/image 관련 통합 테스트 스위트 전원 통과 여부",
        "호스트네임 정규식 컴파일 성능 저하 요소 부재 확인"
      ]
    }
  }
};

export const FEATURE_RECOMMENDATIONS = [
  {
    id: "tanstack-11007",
    url: "https://github.com/TanStack/query/issues/11007",
    repo: "TanStack/query",
    title: "Infinite request loop under React 19 Concurrent rendering",
    summary: "React 19 동시성 모드 환경에서 useQuery를 지연 서브트리 내부에서 호출할 때, 내부 Observer의 참조 얕은 비교 타이밍 이슈로 인해 컴포넌트가 반복 마운트되며 무한 API 요청이 유도되는 중대 버그입니다.",
    status: "Open",
    difficulty: "good first issue",
    difficultyLevel: "starter",
    workType: "버그",
    typeLabel: "bug",
    languageTags: ["TypeScript", "JavaScript"],
    techs: ["React 19", "TypeScript", "TanStack Query", "Tests"],
    prs: [
      {
        id: "pr-9968",
        number: "9968",
        url: "https://github.com/TanStack/query/pull/9968",
        title: "fix(react-query/HydrationBoundary): prevent unnecessary refetch during hydration",
        status: "Open",
        resolving: true,
        summary: "HydrationBoundary가 기존 쿼리를 복원하는 동안 불필요한 재요청이 발생하지 않도록 pending hydration 상태를 추적하는 실제 PR입니다.",
        changes: [
          {
            file: "packages/query-core/src/queryObserver.ts (L98-L121)",
            action: "hydration 대기 중인 쿼리는 명시적 always 설정이 없으면 마운트 재요청을 건너뜀",
            url: "https://github.com/TanStack/query/pull/9968/files#diff-144cf89d34f29ea1e30da14ec1cd6c323b645d0d446435aa1373b7d0fa00ccbc"
          },
          {
            file: "packages/react-query/src/HydrationBoundary.tsx (L95-L126)",
            action: "기존 쿼리의 hydration 대기 상태를 등록하고 복원 완료 뒤 해제",
            url: "https://github.com/TanStack/query/pull/9968/files#diff-771e81c633f399ddff578509c1355021bff3ce55afb12d281cb9bc110842665f"
          }
        ],
        guideSteps: [
          { name: "pnpm install", command: "패키지 의존성 설치" },
          { name: "pnpm test", command: "동시성 테스트 시나리오 통과 여부 검사" },
          { name: "pnpm lint", command: "코드 스타일 린트 검수" },
          { name: "Changeset 작성", command: "배포 패치 명세용 changeset 파일 커밋 생성" }
        ]
      },
      {
        id: "pr-10962",
        number: "10962",
        url: "https://github.com/TanStack/query/pull/10962",
        title: "fix(react-query): retry fetch on remount when error boundary has not been reset",
        status: "Open",
        resolving: false,
        summary: "에러 바운더리에서 쿼리 옵저버가 새로 마운트될 때 재시도를 허용하고 회귀 테스트를 추가한 실제 PR입니다.",
        changes: [
          {
            file: "packages/react-query/src/errorBoundaryUtils.ts (L37-L49)",
            action: "옵저버가 없는 새 마운트에서는 error boundary reset 전에도 재시도를 허용",
            url: "https://github.com/TanStack/query/pull/10962/files#diff-b44eb6740558a471060188bab4175b44802e0b0d56d4be245cc87acc748e44fd"
          },
          {
            file: "packages/react-query/src/__tests__/QueryResetErrorBoundary.test.tsx (L294-L500)",
            action: "재마운트 및 staleTime 무한대 조건의 재시도 회귀 테스트 보강",
            url: "https://github.com/TanStack/query/pull/10962/files#diff-477a4103ee18e262386d5f3bb7412f595c0221ab4ab04ab40722323c5c98985f"
          }
        ],
        guideSteps: [
          { name: "pnpm install", command: "의존성 라이브러리 동화" },
          { name: "pnpm test", command: "기존 단위 테스트 안전 통과 체크" }
        ]
      }
    ]
  },
  {
    id: "react-24410",
    url: "https://github.com/facebook/react/issues/24410",
    repo: "facebook/react",
    title: "useId mismatch between server and client during hydration wrapping Suspense",
    summary: "React 18 SSR 환경에서 Suspense 트리 뎁스 오프셋 시퀀스가 일시적으로 손상되어 서버 마크업 상의 ID와 클라이언트 하이드레이션 시 useId 호출 반환값이 충돌하는 동시성 예외 상황입니다.",
    status: "Open",
    difficulty: "Difficulty: medium",
    difficultyLevel: "medium",
    workType: "예외 처리",
    typeLabel: "Type: Bug",
    languageTags: ["JavaScript", "TypeScript"],
    techs: ["React 18", "Fiber", "SSR", "Hydration"],
    prs: [
      {
        id: "pr-24480",
        number: "24480",
        url: "https://github.com/facebook/react/pull/24480",
        title: "Do not replay erroring beginWork with invokeGuardedCallback when suspended or previously errored",
        status: "Merged",
        resolving: true,
        summary: "Suspense hydration 중 이미 중단되거나 오류가 발생한 작업을 다시 실행하지 않아 연쇄 hydration 오류를 막은 실제 PR입니다.",
        changes: [
          {
            file: "packages/react-reconciler/src/ReactFiberHydrationContext.new.js (L104-L117)",
            action: "hydration 도중 오류 발생 여부를 기록하는 개발 모드 상태 추가",
            url: "https://github.com/facebook/react/pull/24480/files#diff-54156c56067b828c3324fcce0488471341e3261bdcf970003f0a3233244a9e42"
          },
          {
            file: "packages/react-dom/src/__tests__/ReactDOMFizzServer-test.js (L2850-L3535)",
            action: "Suspense hydration 오류와 정상 복구 시나리오 회귀 테스트 추가",
            url: "https://github.com/facebook/react/pull/24480/files#diff-26daa97d687a3044916bea4c4fa5cb6cbf2188ccae49adc330252186326a0b7a"
          }
        ],
        guideSteps: [
          { name: "yarn install", command: "모노레포 의존성 구성 설치" },
          { name: "yarn test", command: "Fizz 스트리밍 단위 검증 패치 통과" }
        ]
      }
    ]
  },
  {
    id: "nextjs-54321",
    url: "https://github.com/vercel/next.js/issues/54321",
    repo: "vercel/next.js",
    title: "Fix unhandled runtime error in App Router Link component",
    summary: "App Router 기반의 Next.js 애플리케이션에서 잘못된 href 속성이 전달되었을 때 화면이 크래시되는 현상을 방지하기 위한 예외 처리(Fallback) 추가 이슈입니다.",
    status: "Open",
    difficulty: "good first issue",
    difficultyLevel: "starter",
    workType: "예외 처리",
    typeLabel: "Error Handling",
    languageTags: ["TypeScript", "JavaScript"],
    techs: ["Next.js", "App Router", "React"],
    prs: [
      {
        id: "pr-28148",
        number: "28148",
        url: "https://github.com/vercel/next.js/pull/28148",
        title: "Fix crash of lint rule no-document-import-in-page",
        status: "Merged",
        resolving: true,
        summary: "pages 디렉터리 밖의 파일을 검사할 때 ESLint 규칙이 경로 파싱 전에 종료되도록 해 런타임 예외를 막은 실제 PR입니다.",
        changes: [
          {
            file: "packages/eslint-plugin-next/lib/rules/no-document-import-in-page.js (L16-L27)",
            action: "pages 경로가 없는 파일은 path.parse 호출 전에 검사 종료",
            url: "https://github.com/vercel/next.js/pull/28148/files#diff-0f4889d0c10f77eba9bf64ff6571740e1d651e06a61eb3929073e96d5d65181c"
          },
          {
            file: "test/eslint-plugin-next/no-document-import-in-page.unit.test.js (L86-L99)",
            action: "components 경로에서 규칙이 충돌하지 않는 테스트 케이스 추가",
            url: "https://github.com/vercel/next.js/pull/28148/files#diff-5d56979b2291dccdda022bd1f50d0d2faa5ed91277dd92b5f9d873c4bc2091f1"
          }
        ],
        guideSteps: [
          { name: "pnpm install", command: "모노레포 패키지 설치" },
          { name: "pnpm test:unit", command: "Link 컴포넌트 유닛 테스트 통과" }
        ]
      }
    ]
  },
  {
    id: "react-20000",
    url: "https://github.com/facebook/react/issues/20000",
    repo: "facebook/react",
    title: "Improve error message for missing key in array iterator",
    summary: "배열 렌더링의 key 검증 경로를 정리하고 누락 위치를 추적해, 중첩된 iterator에서도 정확한 개발자 오류 메시지를 제공하도록 개선하는 이슈입니다.",
    status: "Open",
    difficulty: "Difficulty: challenging",
    difficultyLevel: "challenging",
    workType: "리팩터링",
    typeLabel: "Type: Enhancement",
    languageTags: ["JavaScript", "TypeScript"],
    techs: ["React", "Developer Experience"],
    prs: [
      {
        id: "pr-32117",
        number: "32117",
        url: "https://github.com/facebook/react/pull/32117",
        title: "Permit non-DEV Elements in React.Children with DEV",
        status: "Merged",
        resolving: true,
        summary: "개발 빌드의 React.Children이 프로덕션에서 생성된 element를 다룰 때 key 검증 저장소가 없어도 충돌하지 않도록 수정한 실제 PR입니다.",
        changes: [
          {
            file: "packages/react/src/jsx/ReactJSXElement.js (L813-L821)",
            action: "원본 element에 key 검증 저장소가 있을 때만 validated 상태를 복사",
            url: "https://github.com/facebook/react/pull/32117/files#diff-dbd72a473871eeddbe00ceed54a59bff33e6324ffdea15cb4ee3abbdad988cfb"
          },
          {
            file: "packages/react/src/__tests__/ReactChildren-test.js (L1039-L1070)",
            action: "_store가 없는 element를 React.Children으로 처리하는 회귀 테스트 추가",
            url: "https://github.com/facebook/react/pull/32117/files#diff-e07e1ca8de0b8a02a3a600bdf855e7d8a46d6eae2d291cfa02df54c7d5abf3a2"
          }
        ],
        guideSteps: [
          { name: "yarn test", command: "경고 메시지 출력 관련 테스트 케이스 스냅샷 업데이트" }
        ]
      }
    ]
  }
];

export const LANGUAGE_FILTERS = [...TRANSLATION_LANGUAGES];

export const DIFFICULTY_FILTERS = [
  { value: "All", label: "전체 난이도" },
  { value: "starter", label: "첫 기여" },
  { value: "medium", label: "중간" },
  { value: "challenging", label: "도전" },
  { value: "unlabeled", label: "미분류" }
];

export const DIFFICULTY_CARD_LABELS = {
  starter: "첫 기여 추천",
  medium: "중간 난이도",
  challenging: "도전 난이도",
  unlabeled: "난이도 미분류"
};

export const ISSUE_TYPE_FILTERS = ["All", "버그", "기능 개선", "리팩터링", "예외 처리", "성능", "테스트", "문서"];

export const REPO_VISUALS: Record<string, { image: string; background: string }> = {
  "TanStack Query": { image: "https://github.com/TanStack.png?size=320", background: "#edf3ff" },
  "TanStack/query": { image: "https://github.com/TanStack.png?size=320", background: "#edf3ff" },
  "React (공식 한국어 문서)": { image: "https://github.com/facebook.png?size=320", background: "#eef8fb" },
  "facebook/react": { image: "https://github.com/facebook.png?size=320", background: "#eef8fb" },
  "Next.js": { image: "https://github.com/vercel.png?size=320", background: "#f0f1f3" },
  "vercel/next.js": { image: "https://github.com/vercel.png?size=320", background: "#f0f1f3" },
  "React 한국어 문서": { image: "https://github.com/reactjs.png?size=320", background: "#eef8fb" },
  "MDN 한국어 문서": { image: "https://github.com/mdn.png?size=320", background: "#f2f4fb" },
  "Vue 한국어 문서": { image: "https://github.com/vuejs.png?size=320", background: "#edf8f3" },
  "Python 한국어 문서": { image: "https://github.com/python.png?size=320", background: "#fff8e8" },
  "Google ADK Java 한국어 문서": { image: "https://github.com/google.png?size=320", background: "#eef3ff" },
  "MyBatis 한국어 문서": { image: "https://github.com/mybatis.png?size=320", background: "#fff4eb" },
  "Google ADK Kotlin 한국어 문서": { image: "https://github.com/google.png?size=320", background: "#f3efff" },
  "Kotlin 한국어 문서": { image: "https://github.com/JetBrains.png?size=320", background: "#f7efff" },
  "Kotlin Coroutines 한국어 문서": { image: "https://github.com/Kotlin.png?size=320", background: "#f1f0ff" },
  "Coil 한국어 문서": { image: "https://github.com/coil-kt.png?size=320", background: "#edf7ff" },
  "Rust Book 한국어 문서": { image: "https://github.com/rust-lang.png?size=320", background: "#f8f1eb" }
};

export const getRepoVisual = (repoName: any) => REPO_VISUALS[repoName] || {
  image: "https://github.com/github.png?size=320",
  background: "#f3f5f7"
};

export const matchesLanguage = (items: any, selectedLanguage: any) => {
  return selectedLanguage === "All" || items.includes(selectedLanguage);
};

export const parseGithubIssueUrl = (value: any) => {
  try {
    const parsed = new URL(value.trim());
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname !== 'github.com' || parts.length < 4 || parts[2] !== 'issues' || !/^\d+$/.test(parts[3])) {
      return null;
    }
    return {
      owner: decodeURIComponent(parts[0]),
      repo: decodeURIComponent(parts[1]),
      number: parts[3]
    };
  } catch {
    return null;
  }
};

export const formatGithubDate = (value: any) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
};

export const sanitizeGithubHtml = (html: any) => {
  if (!html || typeof DOMParser === 'undefined') return '';
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  documentNode.querySelectorAll('script, style, iframe, object, embed, form, input, button, textarea, select, link, meta')
    .forEach(node => node.remove());

  documentNode.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name === 'style') node.removeAttribute(attribute.name);
    });

    ['href', 'src'].forEach(attributeName => {
      const attributeValue = node.getAttribute(attributeName);
      if (!attributeValue) return;
      try {
        const target = new URL(attributeValue, 'https://github.com');
        if (target.protocol !== 'https:') node.removeAttribute(attributeName);
        else node.setAttribute(attributeName, target.href);
      } catch {
        node.removeAttribute(attributeName);
      }
    });

    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noreferrer');
    }
  });

  return documentNode.body.innerHTML;
};
