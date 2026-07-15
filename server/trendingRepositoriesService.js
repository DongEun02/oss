export const TRENDING_SOURCE_URL = "https://github.com/trending?since=monthly";

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_TRENDING_REPOSITORIES = 20;
const EXCLUDED_LICENSES = new Set(["", "NOASSERTION", "OTHER"]);
let latestResponse = null;
let inFlightRequest = null;
let latestTrendingEntries = null;
let trendingEntriesInFlight = null;

const jsonResponse = (response, status, body) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  response.end(JSON.stringify(body));
};

const isLoopbackRequest = request => {
  const address = request.socket?.remoteAddress || "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
};

const getRequestUrl = request => new URL(request.url || "/", "http://127.0.0.1");

const githubHeaders = githubToken => {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "oss-monthly-trending",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
  return headers;
};

const normalizeLanguage = language => {
  if (!language) return [];
  if (language === "HTML" || language === "CSS") return ["HTML/CSS"];
  return [language];
};

const plainTextFromHtml = value => String(value || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ")
  .trim();

export const parseMonthlyTrendingHtml = html => {
  const articles = [...String(html || "").matchAll(
    /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g
  )];

  return articles.slice(0, MAX_TRENDING_REPOSITORIES).flatMap((match, index) => {
    const article = match[1];
    const repositoryMatch = article.match(
      /<h2[^>]*>[\s\S]*?<a[^>]+href="\/([^"?#]+\/[^"?#]+)"/
    );
    const fullName = repositoryMatch?.[1]?.replace(/\s/g, "");
    if (!fullName || !/^[^/\s]+\/[^/\s]+$/.test(fullName)) return [];

    const text = plainTextFromHtml(article);
    const starsMatch = text.match(/([\d,]+)\s+stars?\s+this\s+month/i);
    return [{
      fullName,
      trendingRank: index + 1,
      starsThisMonth: Number((starsMatch?.[1] || "0").replace(/,/g, "")) || 0
    }];
  });
};

const getMonthlyTrendingEntries = async () => {
  if (latestTrendingEntries && Date.now() - latestTrendingEntries.cachedAt < CACHE_TTL_MS) {
    return latestTrendingEntries.value;
  }
  if (trendingEntriesInFlight) return trendingEntriesInFlight;

  trendingEntriesInFlight = (async () => {
    const response = await fetch(TRENDING_SOURCE_URL, {
      headers: {
        Accept: "text/html",
        "User-Agent": "oss-monthly-trending"
      },
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) throw new Error("TRENDING_FETCH_FAILED");

    const repositories = parseMonthlyTrendingHtml(await response.text());
    if (repositories.length === 0) throw new Error("TRENDING_PARSE_FAILED");
    latestTrendingEntries = { value: repositories, cachedAt: Date.now() };
    return repositories;
  })().finally(() => {
    trendingEntriesInFlight = null;
  });

  return trendingEntriesInFlight;
};

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        results[currentIndex] = { status: "fulfilled", value: await mapper(items[currentIndex]) };
      } catch (reason) {
        results[currentIndex] = { status: "rejected", reason };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
};

const readGithubError = response => {
  if (response.status === 403 || response.status === 429) throw new Error("GITHUB_RATE_LIMIT");
  if (!response.ok) throw new Error("GITHUB_FETCH_FAILED");
};

const fetchRepositoryMetadata = async (trendingRepository, githubToken) => {
  const response = await fetch(`https://api.github.com/repos/${trendingRepository.fullName}`, {
    headers: githubHeaders(githubToken),
    signal: AbortSignal.timeout(20_000)
  });
  readGithubError(response);
  const repository = await response.json();
  const licenseId = repository.license?.spdx_id || "";

  if (
    repository.visibility !== "public"
    || repository.archived
    || repository.disabled
    || repository.fork
    || EXCLUDED_LICENSES.has(licenseId)
  ) {
    return null;
  }

  return {
    ...trendingRepository,
    fullName: repository.full_name,
    name: repository.name,
    description: repository.description || "저장소 설명이 없습니다.",
    url: repository.html_url,
    language: repository.language || "기타",
    languageTags: normalizeLanguage(repository.language),
    topics: Array.isArray(repository.topics) ? repository.topics.slice(0, 8) : [],
    stars: repository.stargazers_count || 0,
    forks: repository.forks_count || 0,
    openIssues: repository.open_issues_count || 0,
    license: {
      id: licenseId,
      name: repository.license?.name || licenseId
    },
    ownerAvatarUrl: repository.owner?.avatar_url || "",
    contributionGuideUrl: "",
    contributionGuideApiUrl: ""
  };
};

const attachContributionGuide = async (repository, githubToken) => {
  const response = await fetch(
    `https://api.github.com/repos/${repository.fullName}/community/profile`,
    {
      headers: githubHeaders(githubToken),
      signal: AbortSignal.timeout(20_000)
    }
  );

  if (response.status === 404) return repository;
  readGithubError(response);
  const profile = await response.json();
  const contributing = profile.files?.contributing;
  return {
    ...repository,
    contributionGuideUrl: contributing?.html_url || "",
    contributionGuideApiUrl: contributing?.url || ""
  };
};

const loadMonthlyTrendingRepositories = async githubToken => {
  const parsedRepositories = await getMonthlyTrendingEntries();

  const metadataResults = await mapWithConcurrency(
    parsedRepositories,
    6,
    repository => fetchRepositoryMetadata(repository, githubToken)
  );
  const openSourceRepositories = metadataResults
    .filter(result => result.status === "fulfilled" && result.value)
    .map(result => result.value);
  if (openSourceRepositories.length === 0) {
    const rateLimited = metadataResults.some(result => result.reason?.message === "GITHUB_RATE_LIMIT");
    throw new Error(rateLimited ? "GITHUB_RATE_LIMIT" : "GITHUB_FETCH_FAILED");
  }

  const guideResults = await mapWithConcurrency(
    openSourceRepositories,
    6,
    repository => attachContributionGuide(repository, githubToken)
  );
  const repositories = guideResults.map((result, index) => (
    result.status === "fulfilled" ? result.value : openSourceRepositories[index]
  ));
  const loadedAtMs = Date.now();

  return {
    repositories,
    source: {
      name: "GitHub Trending",
      range: "monthly",
      url: TRENDING_SOURCE_URL
    },
    loadedAt: new Date(loadedAtMs).toISOString(),
    loadedAtMs,
    cached: false,
    stale: false
  };
};

export const getMonthlyTrendingRepositories = async ({ githubToken, force = false } = {}) => {
  if (!force && latestResponse && Date.now() - latestResponse.cachedAt < CACHE_TTL_MS) {
    return { ...latestResponse.value, cached: true };
  }
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = loadMonthlyTrendingRepositories(githubToken)
    .then(value => {
      latestResponse = { value, cachedAt: Date.now() };
      return value;
    })
    .catch(error => {
      if (latestResponse) {
        return { ...latestResponse.value, cached: true, stale: true };
      }
      throw error;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
};

const toPublicRepository = repository => {
  const { contributionGuideApiUrl: _apiUrl, ...publicRepository } = repository;
  return publicRepository;
};

const errorMessage = error => {
  const message = String(error?.message || "");
  if (message === "GITHUB_RATE_LIMIT") return [429, "GitHub API 요청 한도에 도달했습니다."];
  if (message === "TRENDING_PARSE_FAILED") return [502, "GitHub 월간 Trending 목록 형식을 읽지 못했습니다."];
  if (message === "TRENDING_FETCH_FAILED") return [502, "GitHub 월간 Trending 목록을 불러오지 못했습니다."];
  if (error?.name === "TimeoutError" || /timeout/i.test(message)) {
    return [504, "GitHub 월간 Trending 조회 시간이 초과됐습니다."];
  }
  return [502, "월간 Trending 저장소를 확인하지 못했습니다."];
};

export const handleTrendingRepositoriesRequest = async (request, response, options = {}) => {
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
    const result = await getMonthlyTrendingRepositories({ githubToken, force });
    jsonResponse(response, 200, {
      ...result,
      repositories: result.repositories.map(toPublicRepository)
    });
  } catch (error) {
    const [status, message] = errorMessage(error);
    console.error(`[GitHub Trending] ${status}: ${message}`);
    jsonResponse(response, status, { error: message });
  }
};
