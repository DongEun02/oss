export const TRANSLATION_LANGUAGES = [
  "All",
  "JavaScript",
  "TypeScript",
  "HTML/CSS",
  "Python",
  "Java",
  "Kotlin",
  "Swift",
  "Go",
  "Rust"
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

export type GithubDocumentReference = {
  repo: string;
  branch: string;
  path: string;
};

export type TranslationPathMapping = {
  sourceRoot: string;
  translationRoot: string;
  sourceExtensions: string[];
  sourcePaths?: string[];
  flattenTranslationPaths?: boolean;
  translationPathMap?: Record<string, string>;
  translationExtension?: string;
  languageTags: string[];
};

type GithubRepositoryReference = {
  repo: string;
  branch: string;
};

export type PairedDocumentDiscovery = {
  kind: "paired-documents";
  source: GithubRepositoryReference;
  translation: GithubRepositoryReference;
  sourceScanRoot: string;
  mappings: TranslationPathMapping[];
};

export type GettextDocumentDiscovery = {
  kind: "gettext";
  source: GithubRepositoryReference;
  translation: GithubRepositoryReference;
  sourceScanRoot: string;
  mappings: TranslationPathMapping[];
};

export type TranslationProject = {
  name: string;
  description: string;
  languageTags: string[];
  techStack: string[];
  contributionGuideUrl: string;
  discovery: PairedDocumentDiscovery | GettextDocumentDiscovery;
};

export const TRANSLATION_PROJECTS: Record<string, TranslationProject> = {
  react: {
    name: "React 한국어 문서",
    description: "React 공식 영문 문서와 공식 한국어 번역 저장소의 최근 변경 문서를 비교합니다.",
    languageTags: ["JavaScript", "TypeScript"],
    techStack: ["React", "Documentation"],
    contributionGuideUrl: "https://github.com/reactjs/ko.react.dev/blob/main/CONTRIBUTING.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "reactjs/react.dev", branch: "main" },
      translation: { repo: "reactjs/ko.react.dev", branch: "main" },
      sourceScanRoot: "src/content",
      mappings: [{
        sourceRoot: "src/content",
        translationRoot: "src/content",
        sourceExtensions: [".md", ".mdx"],
        languageTags: ["JavaScript", "TypeScript"]
      }]
    }
  },
  mdn: {
    name: "MDN 한국어 문서",
    description: "MDN 영문 원문과 공식 translated-content의 최근 변경 문서를 비교합니다.",
    languageTags: ["JavaScript", "HTML/CSS"],
    techStack: ["Web API", "Documentation"],
    contributionGuideUrl: "https://github.com/mdn/translated-content/blob/main/CONTRIBUTING.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "mdn/content", branch: "main" },
      translation: { repo: "mdn/translated-content", branch: "main" },
      sourceScanRoot: "files/en-us/web",
      mappings: [
        {
          sourceRoot: "files/en-us/web/javascript",
          translationRoot: "files/ko/web/javascript",
          sourceExtensions: [".md"],
          languageTags: ["JavaScript"]
        },
        {
          sourceRoot: "files/en-us/web/api",
          translationRoot: "files/ko/web/api",
          sourceExtensions: [".md"],
          languageTags: ["JavaScript"]
        },
        {
          sourceRoot: "files/en-us/web/html",
          translationRoot: "files/ko/web/html",
          sourceExtensions: [".md"],
          languageTags: ["HTML/CSS"]
        },
        {
          sourceRoot: "files/en-us/web/css",
          translationRoot: "files/ko/web/css",
          sourceExtensions: [".md"],
          languageTags: ["HTML/CSS"]
        }
      ]
    }
  },
  vue: {
    name: "Vue 한국어 문서",
    description: "Vue 공식 영문 문서와 공식 한국어 번역 저장소의 최근 변경 문서를 비교합니다.",
    languageTags: ["JavaScript", "TypeScript"],
    techStack: ["Vue", "Documentation"],
    contributionGuideUrl: "https://github.com/vuejs-translations/docs-ko/blob/main/README.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "vuejs/docs", branch: "main" },
      translation: { repo: "vuejs-translations/docs-ko", branch: "main" },
      sourceScanRoot: "src",
      mappings: [{
        sourceRoot: "src",
        translationRoot: "src",
        sourceExtensions: [".md"],
        languageTags: ["JavaScript", "TypeScript"]
      }]
    }
  },
  python: {
    name: "Python 한국어 문서",
    description: "Python 공식 한국어 번역 저장소의 최근 튜토리얼 변경과 gettext 번역 상태를 확인합니다.",
    languageTags: ["Python"],
    techStack: ["Python", "gettext"],
    contributionGuideUrl: "https://github.com/python/python-docs-ko/blob/3.14/.pdk/guide.md",
    discovery: {
      kind: "gettext",
      source: { repo: "python/cpython", branch: "3.14" },
      translation: { repo: "python/python-docs-ko", branch: "3.14" },
      sourceScanRoot: "Doc/tutorial",
      mappings: [{
        sourceRoot: "Doc/tutorial",
        translationRoot: "tutorial",
        sourceExtensions: [".rst"],
        translationExtension: ".po",
        languageTags: ["Python"]
      }]
    }
  },
  adkJava: {
    name: "Google ADK Java 한국어 문서",
    description: "Google ADK 공식 Java 시작 문서와 커뮤니티 한국어 번역본의 변경 상태를 비교합니다.",
    languageTags: ["Java"],
    techStack: ["Google ADK", "Java", "Documentation"],
    contributionGuideUrl: "https://github.com/adk-labs/adk-docs/blob/main/CONTRIBUTING.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "google/adk-docs", branch: "main" },
      translation: { repo: "adk-labs/adk-docs", branch: "main" },
      sourceScanRoot: "docs/get-started/java.md",
      mappings: [{
        sourceRoot: "docs/get-started",
        translationRoot: "docs/ko/get-started",
        sourceExtensions: [".md"],
        sourcePaths: ["docs/get-started/java.md"],
        languageTags: ["Java"]
      }]
    }
  },
  mybatis: {
    name: "MyBatis 한국어 문서",
    description: "MyBatis 공식 Java 문서와 같은 저장소에서 관리되는 공식 한국어 번역본의 변경 상태를 비교합니다.",
    languageTags: ["Java"],
    techStack: ["MyBatis", "Java", "SQL Mapper"],
    contributionGuideUrl: "https://github.com/mybatis/mybatis-3/blob/master/CONTRIBUTING.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "mybatis/mybatis-3", branch: "master" },
      translation: { repo: "mybatis/mybatis-3", branch: "master" },
      sourceScanRoot: "src/site/markdown",
      mappings: [
        {
          sourceRoot: "src/site/markdown",
          translationRoot: "src/site/ko/markdown",
          sourceExtensions: [".md"],
          sourcePaths: [
            "src/site/markdown/getting-started.md",
            "src/site/markdown/index.md",
            "src/site/markdown/logging.md"
          ],
          languageTags: ["Java"]
        },
        {
          sourceRoot: "src/site/markdown",
          translationRoot: "src/site/ko/xdoc",
          sourceExtensions: [".md"],
          sourcePaths: [
            "src/site/markdown/configuration.md",
            "src/site/markdown/dynamic-sql.md",
            "src/site/markdown/java-api.md",
            "src/site/markdown/sqlmap-xml.md",
            "src/site/markdown/statement-builders.md"
          ],
          translationExtension: ".xml",
          languageTags: ["Java"]
        }
      ]
    }
  },
  adkKotlin: {
    name: "Google ADK Kotlin 한국어 문서",
    description: "Google ADK 공식 Kotlin 시작 문서와 커뮤니티 한국어 번역본의 변경 상태를 비교합니다.",
    languageTags: ["Kotlin"],
    techStack: ["Google ADK", "Kotlin", "Documentation"],
    contributionGuideUrl: "https://github.com/adk-labs/adk-docs/blob/main/CONTRIBUTING.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "google/adk-docs", branch: "main" },
      translation: { repo: "adk-labs/adk-docs", branch: "main" },
      sourceScanRoot: "docs/get-started/kotlin.md",
      mappings: [{
        sourceRoot: "docs/get-started",
        translationRoot: "docs/ko/get-started",
        sourceExtensions: [".md"],
        sourcePaths: ["docs/get-started/kotlin.md"],
        languageTags: ["Kotlin"]
      }]
    }
  },
  kotlin: {
    name: "Kotlin 한국어 문서",
    description: "Kotlin 공식 영문 문서와 최근까지 관리된 비공식 한국어 번역본의 변경 상태를 비교합니다.",
    languageTags: ["Kotlin"],
    techStack: ["Kotlin", "Documentation"],
    contributionGuideUrl: "https://github.com/hoonkun/kotlin-docs-kr/blob/main/README.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "JetBrains/kotlin-web-site", branch: "master" },
      translation: { repo: "hoonkun/kotlin-docs-kr", branch: "main" },
      sourceScanRoot: "docs/topics",
      mappings: [{
        sourceRoot: "docs/topics",
        translationRoot: "docs",
        sourceExtensions: [".md"],
        flattenTranslationPaths: true,
        languageTags: ["Kotlin"]
      }]
    }
  },
  kotlinCoroutines: {
    name: "Kotlin Coroutines 한국어 문서",
    description: "kotlinx.coroutines 공식 라이브러리 가이드와 커뮤니티 한국어 번역본의 변경 상태를 비교합니다.",
    languageTags: ["Kotlin"],
    techStack: ["Kotlin Coroutines", "Kotlin", "Library"],
    contributionGuideUrl: "https://github.com/hoonkun/kotlin-docs-kr/blob/main/README.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "Kotlin/kotlinx.coroutines", branch: "master" },
      translation: { repo: "hoonkun/kotlin-docs-kr", branch: "main" },
      sourceScanRoot: "docs/topics",
      mappings: [{
        sourceRoot: "docs/topics",
        translationRoot: "docs",
        sourceExtensions: [".md"],
        sourcePaths: [
          "docs/topics/cancellation-and-timeouts.md",
          "docs/topics/channels.md",
          "docs/topics/composing-suspending-functions.md",
          "docs/topics/coroutine-context-and-dispatchers.md",
          "docs/topics/coroutines-basics.md",
          "docs/topics/coroutines-flow.md",
          "docs/topics/coroutines-guide.md",
          "docs/topics/exception-handling.md",
          "docs/topics/shared-mutable-state-and-concurrency.md"
        ],
        flattenTranslationPaths: true,
        translationPathMap: {
          "docs/topics/coroutines-flow.md": "docs/flow.md"
        },
        languageTags: ["Kotlin"]
      }]
    }
  },
  coil: {
    name: "Coil 한국어 문서",
    description: "Android와 Compose용 이미지 라이브러리 Coil의 공식 README와 저장소 내 한국어 번역본을 비교합니다.",
    languageTags: ["Kotlin"],
    techStack: ["Android", "Coil", "Compose"],
    contributionGuideUrl: "https://github.com/coil-kt/coil/blob/main/.github/ISSUE_TEMPLATE/CONTRIBUTING.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "coil-kt/coil", branch: "main" },
      translation: { repo: "coil-kt/coil", branch: "main" },
      sourceScanRoot: "README.md",
      mappings: [{
        sourceRoot: "README.md",
        translationRoot: "",
        sourceExtensions: [".md"],
        sourcePaths: ["README.md"],
        translationPathMap: {
          "README.md": "README-ko.md"
        },
        languageTags: ["Kotlin"]
      }]
    }
  },
  rust: {
    name: "Rust Book 한국어 문서",
    description: "Rust 공식 Book 원문과 한국어 번역본의 최근 변경 문서를 비교합니다.",
    languageTags: ["Rust"],
    techStack: ["Rust", "mdBook"],
    contributionGuideUrl: "https://github.com/rust-kr/doc.rust-kr.org/blob/main/CONTRIBUTING.md",
    discovery: {
      kind: "paired-documents",
      source: { repo: "rust-lang/book", branch: "main" },
      translation: { repo: "rust-kr/doc.rust-kr.org", branch: "main" },
      sourceScanRoot: "src",
      mappings: [{
        sourceRoot: "src",
        translationRoot: "src",
        sourceExtensions: [".md"],
        languageTags: ["Rust"]
      }]
    }
  }
};

export const isTranslationLanguage = (value: string): value is TranslationLanguage => (
  TRANSLATION_LANGUAGES.includes(value as TranslationLanguage)
);

export const getTranslationProjectsForLanguage = (language: TranslationLanguage) => (
  Object.entries(TRANSLATION_PROJECTS).filter(([, project]) => (
    language === "All" || project.languageTags.includes(language)
  ))
);

export const getGithubDocumentUrl = (document: GithubDocumentReference) => (
  `https://github.com/${document.repo}/blob/${document.branch}/${document.path}`
);
