import { getMonthlyTrendingRepositories } from "./trendingRepositoriesService.js";
import { fetchOpenSourceRepository, parseRepositoryName } from "./githubRepositoryService.js";

const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;
const ISSUES_PER_REPOSITORY = 3;
const REPOSITORIES_PER_REQUEST = 8;
const MAX_RECOMMENDATIONS = 18;
let latestResponse = null;
const repositoryResponseCache = new Map();

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

const toRecommendation = (rawIssue, repository, source = "github-recommendation") => {
  const labels = normalizeLabels(rawIssue.labels);
  const difficulty = inferDifficulty(labels);
  const workType = inferWorkType(labels, rawIssue.title || "");
  const visibleLabels = labels
    .map(label => label.name)
    .filter(name => !/^status:|^linear:|difficulty:/i.test(name))
    .slice(0, 3);
  const body = (rawIssue.body || "").slice(0, 60_000);
  const fallbackTechs = [repository.name, ...(repository.topics || [])].filter(Boolean);

  const recommendation = {
    id: `github-${repository.fullName}-${rawIssue.number}`,
    source,
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
    techs: [...new Set([...visibleLabels, ...fallbackTechs])].slice(0, 4),
    labels,
    repositoryAvatarUrl: repository.ownerAvatarUrl,
    contributionGuideUrl: repository.contributionGuideUrl,
    trendingRank: repository.trendingRank,
    starsThisMonth: repository.starsThisMonth,
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

const fetchRepositoryIssues = async (
  repository,
  githubToken,
  { limit = ISSUES_PER_REPOSITORY, source = "github-recommendation" } = {}
) => {
  const response = await fetch(
    `https://api.github.com/repos/${repository.fullName}/issues?state=open&sort=updated&direction=desc&per_page=50`,
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
    .map(issue => toRecommendation(issue, repository, source))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
};

const fetchRepositoryRecommendations = async ({ fullName, githubToken }) => {
  const cacheKey = fullName.toLowerCase();
  const cached = repositoryResponseCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < RESPONSE_CACHE_TTL_MS) {
    return { ...cached.value, cached: true };
  }

  const repository = await fetchOpenSourceRepository(fullName, githubToken);
  if (!repository.hasIssues) throw new Error("REPOSITORY_ISSUES_UNAVAILABLE");
  const issues = await fetchRepositoryIssues(repository, githubToken, {
    limit: MAX_RECOMMENDATIONS,
    source: "github-repository"
  });
  const loadedAtMs = Date.now();
  const value = {
    repository,
    issues: issues.map(({ recommendationScore: _score, ...issue }) => issue),
    source: {
      name: "GitHub Repository",
      repository: repository.fullName,
      url: repository.url
    },
    loadedAt: new Date(loadedAtMs).toISOString(),
    loadedAtMs,
    cached: false
  };
  repositoryResponseCache.set(cacheKey, { value, cachedAt: Date.now() });
  return value;
};

const buildPayload = (successfulLists, failedRepositories, trending, repositories) => {
  const issues = [];
  const largestListSize = Math.max(...successfulLists.map(list => list.length), 0);
  for (let index = 0; index < largestListSize; index += 1) {
    successfulLists.forEach(list => {
      if (list[index]) issues.push(list[index]);
    });
  }

  const loadedAtMs = Date.now();
  return {
    issues: issues
      .slice(0, MAX_RECOMMENDATIONS)
      .map(({ recommendationScore: _score, ...issue }) => issue),
    failedRepositories,
    source: {
      ...trending.source,
      repositoryCount: repositories.length
    },
    loadedAt: new Date(loadedAtMs).toISOString(),
    loadedAtMs,
    cached: false
  };
};

const fetchRecommendedIssues = async ({ githubToken, force }) => {
  if (!force && latestResponse && Date.now() - latestResponse.cachedAt < RESPONSE_CACHE_TTL_MS) {
    return { ...latestResponse.value, cached: true };
  }

  const trending = await getMonthlyTrendingRepositories({ githubToken });
  const repositories = trending.repositories
    .filter(repository => repository.openIssues > 0)
    .slice(0, REPOSITORIES_PER_REQUEST);
  if (repositories.length === 0) throw new Error("GITHUB_FETCH_FAILED");

  const results = await Promise.allSettled(
    repositories.map(repository => fetchRepositoryIssues(repository, githubToken))
  );
  const successfulLists = results
    .filter(result => result.status === "fulfilled")
    .map(result => result.value);
  const failedRepositories = results.flatMap((result, index) => (
    result.status === "rejected"
      ? [{
          repository: repositories[index].fullName,
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

  const value = buildPayload(successfulLists, failedRepositories, trending, repositories);
  latestResponse = { value, cachedAt: Date.now() };
  return value;
};

const errorMessage = error => {
  const message = String(error?.message || "");
  if (message === "GITHUB_REPOSITORY_NOT_FOUND") return [404, "GitHub 저장소를 찾을 수 없습니다."];
  if (message === "REPOSITORY_NOT_OPEN_SOURCE") {
    return [422, "공개 저장소이며 GitHub에서 라이선스가 확인되는 오픈소스만 조회할 수 있습니다."];
  }
  if (message === "REPOSITORY_ISSUES_UNAVAILABLE") {
    return [422, "보관되었거나 이슈 기능을 사용하지 않는 저장소입니다."];
  }
  if (message === "REPOSITORY_INACTIVE") return [422, "보관되었거나 비활성화된 저장소입니다."];
  if (message === "GITHUB_RATE_LIMIT") return [429, "GitHub API 요청 한도에 도달했습니다."];
  if (error?.name === "TimeoutError" || /timeout/i.test(message)) {
    return [504, "GitHub 이슈 조회 시간이 초과됐습니다."];
  }
  return [502, "GitHub 추천 이슈를 불러오지 못했습니다."];
};

export const handleRepositoryIssuesRequest = async (request, response, options = {}) => {
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

  const fullName = parseRepositoryName(getRequestUrl(request).searchParams.get("repo"));
  if (!fullName) {
    jsonResponse(response, 400, { error: "owner/repository 형식의 저장소 이름을 입력해 주세요." });
    return;
  }

  try {
    const result = await fetchRepositoryRecommendations({ fullName, githubToken });
    jsonResponse(response, 200, result);
  } catch (error) {
    const [status, message] = errorMessage(error);
    console.error(`[GitHub repository recommendations] ${status}: ${message}`);
    jsonResponse(response, status, { error: message });
  }
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
