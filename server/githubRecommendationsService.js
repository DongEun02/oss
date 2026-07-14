const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;
const ISSUES_PER_REPOSITORY = 4;
let latestResponse = null;

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

const jsonResponse = (response, status, body) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=3600");
  response.end(JSON.stringify(body));
};

const isLoopbackRequest = request => {
  const address = request.socket?.remoteAddress || "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
};

const getRequestUrl = request => new URL(request.url || "/", "http://127.0.0.1");

const githubHeaders = githubToken => {
  const headers = {
    Accept: "application/vnd.github.full+json",
    "User-Agent": "oss-github-recommendations",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
  return headers;
};

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

const fetchRepositoryIssues = async (repository, githubToken) => {
  const response = await fetch(
    `https://api.github.com/repos/${repository.fullName}/issues?state=open&sort=updated&direction=desc&per_page=100`,
    {
      headers: githubHeaders(githubToken),
      signal: AbortSignal.timeout(20_000)
    }
  );

  if (response.status === 403 || response.status === 429) throw new Error("GITHUB_RATE_LIMIT");
  if (!response.ok) throw new Error("GITHUB_FETCH_FAILED");

  const rawIssues = await response.json();
  return rawIssues
    .filter(isUsableIssue)
    .map(issue => toRecommendation(issue, repository))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, ISSUES_PER_REPOSITORY);
};

const buildPayload = (successfulLists, failedRepositories) => {
  const issues = [];
  const largestListSize = Math.max(...successfulLists.map(list => list.length), 0);
  for (let index = 0; index < largestListSize; index += 1) {
    successfulLists.forEach(list => {
      if (list[index]) issues.push(list[index]);
    });
  }

  const loadedAtMs = Date.now();
  return {
    issues: issues.map(({ recommendationScore: _score, ...issue }) => issue),
    failedRepositories,
    loadedAt: new Date(loadedAtMs).toISOString(),
    loadedAtMs,
    cached: false
  };
};

const fetchRecommendedIssues = async ({ githubToken, force }) => {
  if (!force && latestResponse && Date.now() - latestResponse.cachedAt < RESPONSE_CACHE_TTL_MS) {
    return { ...latestResponse.value, cached: true };
  }

  const results = await Promise.allSettled(
    REPOSITORIES.map(repository => fetchRepositoryIssues(repository, githubToken))
  );
  const successfulLists = results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value);
  const failedRepositories = results.flatMap((result, index) => (
    result.status === "rejected"
      ? [{
          repository: REPOSITORIES[index].fullName,
          message: result.reason?.message === "GITHUB_RATE_LIMIT"
            ? "GitHub API 요청 한도에 도달했습니다."
            : "이슈를 불러오지 못했습니다."
        }]
      : []
  ));

  if (successfulLists.length === 0) {
    const rateLimited = results.some(result => (
      result.status === "rejected" && result.reason?.message === "GITHUB_RATE_LIMIT"
    ));
    throw new Error(rateLimited ? "GITHUB_RATE_LIMIT" : "GITHUB_FETCH_FAILED");
  }

  const value = buildPayload(successfulLists, failedRepositories);
  latestResponse = { value, cachedAt: Date.now() };
  return value;
};

const errorMessage = error => {
  const message = String(error?.message || "");
  if (message === "GITHUB_RATE_LIMIT") return [429, "GitHub API 요청 한도에 도달했습니다."];
  if (error?.name === "TimeoutError" || /timeout/i.test(message)) {
    return [504, "GitHub 이슈 조회 시간이 초과됐습니다."];
  }
  return [502, "GitHub 추천 이슈를 불러오지 못했습니다."];
};

export const handleRecommendedIssuesRequest = async (request, response, options = {}) => {
  const {
    githubToken = process.env.GITHUB_TOKEN,
    enforceLoopback = false
  } = options;

  if (enforceLoopback && !isLoopbackRequest(request)) {
    jsonResponse(response, 403, { error: "로컬 요청만 허용됩니다." });
    return;
  }
  if (request.method !== "GET") {
    jsonResponse(response, 405, { error: "GET 요청만 지원합니다." });
    return;
  }

  try {
    const force = getRequestUrl(request).searchParams.get("refresh") === "1";
    const result = await fetchRecommendedIssues({ githubToken, force });
    jsonResponse(response, 200, result);
  } catch (error) {
    if (latestResponse && ["GITHUB_RATE_LIMIT", "GITHUB_FETCH_FAILED"].includes(String(error?.message || ""))) {
      jsonResponse(response, 200, {
        ...latestResponse.value,
        cached: true,
        stale: true
      });
      return;
    }
    const [status, message] = errorMessage(error);
    console.error(`[GitHub recommendations] ${status}: ${message}`);
    jsonResponse(response, status, { error: message });
  }
};
