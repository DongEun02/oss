const CACHE_KEY = "oss:github-recommendations:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const ISSUES_PER_REPOSITORY = 4;

const REPOSITORIES = [
  {
    fullName: "TanStack/query",
    languageTags: ["TypeScript", "JavaScript"],
    fallbackTechs: ["TanStack Query", "React"]
  },
  {
    fullName: "facebook/react",
    languageTags: ["JavaScript"],
    fallbackTechs: ["React"]
  },
  {
    fullName: "vercel/next.js",
    languageTags: ["TypeScript", "JavaScript"],
    fallbackTechs: ["Next.js", "React"]
  }
];

const DIFFICULTY_PATTERNS = [
  {
    level: "starter",
    pattern: /good first issue|good-first-issue|beginner|first[- ]timers|difficulty:\s*(easy|starter)|^easy$/i
  },
  {
    level: "medium",
    pattern: /difficulty:\s*(medium|intermediate)|^medium$|^intermediate$/i
  },
  {
    level: "challenging",
    pattern: /difficulty:\s*(hard|advanced|challenging)|^hard$|^advanced$|^challenging$/i
  }
];

const EXCLUDED_LABEL_PATTERN = /duplicate|invalid|wontfix|won't fix|stale|not planned/i;

const normalizeLabels = labels => (labels || []).map(label => {
  if (typeof label === "string") return { name: label, color: "d0d7de" };
  return {
    name: label.name || "",
    color: /^[0-9a-f]{6}$/i.test(label.color || "") ? label.color : "d0d7de"
  };
}).filter(label => label.name);

const inferDifficulty = labels => {
  for (const { level, pattern } of DIFFICULTY_PATTERNS) {
    const matchedLabel = labels.find(label => pattern.test(label.name));
    if (matchedLabel) return { level, label: matchedLabel.name };
  }

  return { level: "unlabeled", label: "난이도 미분류" };
};

const inferWorkType = (labels, title) => {
  const source = `${labels.map(label => label.name).join(" ")} ${title}`.toLowerCase();
  if (/documentation|\bdocs?\b|번역/.test(source)) return "문서";
  if (/performance|perf|optimi[sz]/.test(source)) return "성능";
  if (/\btest(s|ing)?\b|coverage|regression/.test(source)) return "테스트";
  if (/refactor|cleanup|tech debt/.test(source)) return "리팩터링";
  if (/error handling|exception|crash|throw/.test(source)) return "예외 처리";
  if (/enhancement|feature|proposal|improvement/.test(source)) return "기능 개선";
  if (/\bbug\b|type:\s*bug|defect|broken|incorrect|fail|not working|does not|doesn't|cannot|can't|unable|mismatch|differs|duplicate/.test(source)) return "버그";
  return "유형 미분류";
};

const plainTextFromMarkdown = value => (value || "")
  .replace(/```[\s\S]*?```/g, " ")
  .replace(/<!--([\s\S]*?)-->/g, " ")
  .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/[#>*_`~-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const makeSummary = body => {
  const plainText = plainTextFromMarkdown(body);
  if (!plainText) return "이슈 본문에서 요약할 내용을 찾지 못했습니다.";
  return plainText.length > 220 ? `${plainText.slice(0, 217).trim()}...` : plainText;
};

const recommendationScore = issue => {
  const labels = issue.labels.map(label => label.name.toLowerCase());
  let score = 0;

  if (issue.difficultyLevel === "starter") score += 120;
  if (labels.some(label => /help wanted|contributions welcome|accepting prs/.test(label))) score += 70;
  if (issue.difficultyLevel === "medium") score += 35;
  if (issue.assignees.length === 0) score += 20;
  if (issue.body.length >= 300) score += 15;
  if (issue.comments <= 15) score += 8;

  const ageInDays = Math.max(0, (Date.now() - new Date(issue.updatedAt).getTime()) / 86_400_000);
  score += Math.max(0, 30 - Math.floor(ageInDays / 7));
  return score;
};

const toRecommendation = (rawIssue, repository) => {
  const labels = normalizeLabels(rawIssue.labels);
  const difficulty = inferDifficulty(labels);
  const workType = inferWorkType(labels, rawIssue.title || "");
  const visibleLabels = labels
    .map(label => label.name)
    .filter(name => !/^status:|^linear:|difficulty:/i.test(name))
    .slice(0, 3);
  const body = (rawIssue.body || "").slice(0, 60_000);

  const recommendation = {
    id: `github-${repository.fullName}-${rawIssue.number}`,
    source: "github-recommendation",
    url: rawIssue.html_url,
    repo: repository.fullName,
    number: rawIssue.number,
    title: rawIssue.title,
    summary: makeSummary(body),
    body: body || "작성된 본문이 없습니다.",
    bodyHtml: (rawIssue.body_html || "").slice(0, 100_000),
    status: rawIssue.state === "open" ? "Open" : "Closed",
    difficulty: difficulty.label,
    difficultyLevel: difficulty.level,
    workType,
    typeLabel: workType,
    languageTags: repository.languageTags,
    techs: [...new Set([...visibleLabels, ...repository.fallbackTechs])].slice(0, 4),
    labels,
    author: {
      login: rawIssue.user?.login || "unknown",
      avatarUrl: rawIssue.user?.avatar_url || "",
      url: rawIssue.user?.html_url || rawIssue.html_url
    },
    assignees: rawIssue.assignees || [],
    comments: rawIssue.comments || 0,
    createdAt: rawIssue.created_at,
    updatedAt: rawIssue.updated_at,
    closedAt: rawIssue.closed_at,
    prs: []
  };

  return { ...recommendation, recommendationScore: recommendationScore(recommendation) };
};

const isUsableIssue = issue => {
  if (!issue || issue.pull_request || issue.state !== "open" || issue.locked) return false;
  if ((issue.title || "").trim().length < 12) return false;
  if (plainTextFromMarkdown(issue.body).length < 80) return false;
  const labelNames = normalizeLabels(issue.labels).map(label => label.name).join(" ");
  return !EXCLUDED_LABEL_PATTERN.test(labelNames);
};

const fetchRepositoryIssues = async (repository, signal) => {
  const response = await fetch(
    `https://api.github.com/repos/${repository.fullName}/issues?state=open&sort=updated&direction=desc&per_page=100`,
    {
      signal,
      headers: {
        Accept: "application/vnd.github.full+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    }
  );

  if (!response.ok) {
    if (response.status === 403) {
      const resetAt = Number(response.headers.get("X-RateLimit-Reset"));
      const resetText = resetAt
        ? new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(resetAt * 1000))
        : "잠시 후";
      throw new Error(`GitHub 요청 한도에 도달했습니다. ${resetText} 이후 다시 시도해 주세요.`);
    }
    throw new Error(`${repository.fullName} 이슈를 불러오지 못했습니다.`);
  }

  const rawIssues = await response.json();
  return rawIssues
    .filter(isUsableIssue)
    .map(issue => toRecommendation(issue, repository))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, ISSUES_PER_REPOSITORY);
};

const readCache = () => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (!cached || Date.now() - cached.loadedAtMs > CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
};

const writeCache = value => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Recommendations still work when browser storage is unavailable.
  }
};

export const fetchRecommendedIssues = async ({ force = false, signal } = {}) => {
  if (!force) {
    const cached = readCache();
    if (cached) return { ...cached, cached: true };
  }

  const results = await Promise.allSettled(
    REPOSITORIES.map(repository => fetchRepositoryIssues(repository, signal))
  );

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const successfulLists = results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value);
  const failedRepositories = results.flatMap((result, index) => (
    result.status === "rejected"
      ? [{ repository: REPOSITORIES[index].fullName, message: result.reason?.message || "조회 실패" }]
      : []
  ));

  if (successfulLists.length === 0) {
    throw new Error(failedRepositories[0]?.message || "GitHub 추천 이슈를 불러오지 못했습니다.");
  }

  const issues = [];
  const largestListSize = Math.max(...successfulLists.map(list => list.length), 0);
  for (let index = 0; index < largestListSize; index += 1) {
    successfulLists.forEach(list => {
      if (list[index]) issues.push(list[index]);
    });
  }

  const loadedAtMs = Date.now();
  const payload = {
    issues: issues.map(({ recommendationScore: _score, ...issue }) => issue),
    failedRepositories,
    loadedAt: new Date(loadedAtMs).toISOString(),
    loadedAtMs
  };
  writeCache(payload);
  return { ...payload, cached: false };
};
