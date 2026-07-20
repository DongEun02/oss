const EXCLUDED_LICENSES = new Set(["", "NOASSERTION", "OTHER"]);
const DAY_MS = 24 * 60 * 60 * 1000;
const CONTRIBUTOR_WINDOW_DAYS = 180;
const STALE_PULL_REQUEST_DAYS = 30;
const CONTRIBUTOR_PULL_REQUEST_LIMIT = 40;
const MAINTAINER_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const BOT_LOGIN_PATTERN = /\[bot\]$|^(dependabot|renovate|github-actions)$/i;

const CONTRIBUTOR_SIGNALS_QUERY = `
  query RepositoryContributorSignals($owner: String!, $name: String!, $limit: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequests(
        first: $limit
        states: [OPEN, MERGED, CLOSED]
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        nodes {
          number
          createdAt
          updatedAt
          closedAt
          mergedAt
          isDraft
          authorAssociation
          author {
            login
          }
          comments(first: 20) {
            nodes {
              createdAt
              authorAssociation
              author {
                login
              }
            }
          }
          reviews(first: 20) {
            nodes {
              createdAt
              authorAssociation
              author {
                login
              }
            }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`;

const repositoryActivity = (pushedAt: any) => {
  const pushedAtMs = Date.parse(pushedAt || "");
  if (!Number.isFinite(pushedAtMs)) {
    return {
      level: "unknown",
      label: "활동 확인 불가",
      pushedAt: null,
      daysSincePush: null
    };
  }

  const daysSincePush = Math.max(0, Math.floor((Date.now() - pushedAtMs) / DAY_MS));
  if (daysSincePush <= 30) {
    return { level: "active", label: "활발함", pushedAt, daysSincePush };
  }
  if (daysSincePush <= 90) {
    return { level: "steady", label: "보통", pushedAt, daysSincePush };
  }
  return { level: "quiet", label: "활동 적음", pushedAt, daysSincePush };
};

const githubHeaders = (githubToken: any) => {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "oss-repository-lookup",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
  return headers;
};

const resolveRepositoryLicense = async (repository: any, githubToken: any) => {
  const detectedId = repository.license?.spdx_id || "";
  if (!EXCLUDED_LICENSES.has(detectedId)) {
    return {
      id: detectedId,
      name: repository.license?.name || detectedId,
      url: repository.license?.url || ""
    };
  }

  const response = await fetch(`https://api.github.com/repos/${repository.full_name}/license`, {
    headers: githubHeaders(githubToken),
    signal: AbortSignal.timeout(20_000)
  });
  if (response.status === 403 || response.status === 429) throw new Error("GITHUB_RATE_LIMIT");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("GITHUB_FETCH_FAILED");

  const licenseFile = await response.json();
  if (!licenseFile?.html_url) return null;

  const licenseId = licenseFile.license?.spdx_id || detectedId;
  return {
    id: EXCLUDED_LICENSES.has(licenseId) ? "CUSTOM" : licenseId,
    name: EXCLUDED_LICENSES.has(licenseId)
      ? "라이선스 파일 확인됨"
      : licenseFile.license?.name || licenseId,
    url: licenseFile.html_url
  };
};

const median = (values: any) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const isMaintainerAssociation = (association: any) => MAINTAINER_ASSOCIATIONS.has(association || "");

const isBotLogin = (login: any) => BOT_LOGIN_PATTERN.test(login || "");

const firstMaintainerResponseAt = (pullRequest: any) => {
  const responseDates = [
    ...(pullRequest.comments?.nodes || []),
    ...(pullRequest.reviews?.nodes || [])
  ]
    .filter(response => (
      isMaintainerAssociation(response?.authorAssociation)
      && !isBotLogin(response?.author?.login)
    ))
    .map(response => Date.parse(response.createdAt || ""))
    .filter(Number.isFinite);

  const mergedAtMs = Date.parse(pullRequest.mergedAt || "");
  if (Number.isFinite(mergedAtMs)) responseDates.push(mergedAtMs);
  return responseDates.length > 0 ? Math.min(...responseDates) : null;
};

const contributorFriendlinessLevel = ({
  externalPullRequestCount,
  responseRate,
  medianFirstResponseHours,
  stalePullRequestCount,
  hasContributionGuide
}: any) => {
  if (responseRate === null) {
    return { level: "unknown", label: externalPullRequestCount > 0 ? "응답 미확인" : "데이터 부족" };
  }
  if (externalPullRequestCount < 3) {
    return { level: "unknown", label: externalPullRequestCount > 0 ? "표본 적음" : "데이터 부족" };
  }

  const staleRate = stalePullRequestCount / externalPullRequestCount;
  const respondsReliably = responseRate >= 0.7;
  const respondsWithinWeek = medianFirstResponseHours !== null && medianFirstResponseHours <= 168;
  if (respondsReliably && respondsWithinWeek && staleRate <= 0.25) {
    return { level: "friendly", label: "높음" };
  }
  if (responseRate >= 0.4 || (hasContributionGuide && staleRate <= 0.4)) {
    return { level: "mixed", label: "보통" };
  }
  return { level: "low", label: "낮음" };
};

export const summarizeContributorFriendliness = (
  pullRequests: any,
  {
    hasContributionGuide = false,
    hasMorePullRequests = false,
    responseDataAvailable = true,
    now = Date.now()
  } = {}
) => {
  const windowStart = now - CONTRIBUTOR_WINDOW_DAYS * DAY_MS;
  const fetchedCreatedDates = (pullRequests || [])
    .map((pullRequest: any) => Date.parse(pullRequest.createdAt || pullRequest.created_at || ""))
    .filter(Number.isFinite);
  const sampleLimited = hasMorePullRequests
    && fetchedCreatedDates.length > 0
    && Math.min(...fetchedCreatedDates) >= windowStart;
  const recentExternalPullRequests = (pullRequests || []).filter((pullRequest: any) => {
    const createdAtMs = Date.parse(pullRequest.createdAt || pullRequest.created_at || "");
    const authorAssociation = pullRequest.authorAssociation || pullRequest.author_association || "";
    const authorLogin = pullRequest.author?.login || pullRequest.user?.login || "";
    return (
      Number.isFinite(createdAtMs)
      && createdAtMs >= windowStart
      && !pullRequest.isDraft
      && !pullRequest.draft
      && !isMaintainerAssociation(authorAssociation)
      && !isBotLogin(authorLogin)
    );
  });

  const firstResponseHours = recentExternalPullRequests.flatMap((pullRequest: any) => {
    if (!responseDataAvailable) return [];
    const createdAtMs = Date.parse(pullRequest.createdAt || "");
    const responseAtMs = firstMaintainerResponseAt(pullRequest);
    if (
      !Number.isFinite(createdAtMs)
      || typeof responseAtMs !== "number"
      || !Number.isFinite(responseAtMs)
    ) return [];
    return [Math.max(0, (responseAtMs - createdAtMs) / (60 * 60 * 1000))];
  });
  const mergedPullRequestCount = recentExternalPullRequests.filter(
    (pullRequest: any) => pullRequest.mergedAt || pullRequest.merged_at
  ).length;
  const stalePullRequestCount = recentExternalPullRequests.filter((pullRequest: any) => {
    if (pullRequest.closedAt || pullRequest.closed_at || pullRequest.mergedAt || pullRequest.merged_at) return false;
    const updatedAtMs = Date.parse(pullRequest.updatedAt || pullRequest.updated_at || "");
    return Number.isFinite(updatedAtMs) && now - updatedAtMs >= STALE_PULL_REQUEST_DAYS * DAY_MS;
  }).length;
  const responseCount = responseDataAvailable ? firstResponseHours.length : null;
  const responseRate = responseCount === null || recentExternalPullRequests.length === 0
    ? null
    : responseCount / recentExternalPullRequests.length;
  const medianFirstResponseHours = median(firstResponseHours);
  const status = contributorFriendlinessLevel({
    externalPullRequestCount: recentExternalPullRequests.length,
    responseRate,
    medianFirstResponseHours,
    stalePullRequestCount,
    hasContributionGuide
  });

  return {
    ...status,
    windowDays: CONTRIBUTOR_WINDOW_DAYS,
    sampleLimited,
    externalPullRequestCount: recentExternalPullRequests.length,
    responseCount,
    responseRate,
    medianFirstResponseHours,
    mergedPullRequestCount,
    stalePullRequestCount,
    hasContributionGuide,
    responseDataAvailable
  };
};

const fetchContributorPullRequestsWithGraphql = async (fullName: any, githubToken: any) => {
  const [owner, name] = fullName.split("/");
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      ...githubHeaders(githubToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: CONTRIBUTOR_SIGNALS_QUERY,
      variables: { owner, name, limit: CONTRIBUTOR_PULL_REQUEST_LIMIT }
    }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error("GITHUB_CONTRIBUTOR_SIGNALS_FAILED");

  const payload = await response.json();
  if (payload.errors?.length) throw new Error("GITHUB_CONTRIBUTOR_SIGNALS_FAILED");
  const pullRequests = payload.data?.repository?.pullRequests;
  return {
    nodes: pullRequests?.nodes || [],
    hasMore: !!pullRequests?.pageInfo?.hasNextPage
  };
};

const fetchContributorPullRequestsWithRest = async (fullName: any, githubToken: any) => {
  const response = await fetch(
    `https://api.github.com/repos/${fullName}/pulls?state=all&sort=created&direction=desc&per_page=${CONTRIBUTOR_PULL_REQUEST_LIMIT}`,
    {
      headers: githubHeaders(githubToken),
      signal: AbortSignal.timeout(20_000)
    }
  );
  if (!response.ok) throw new Error("GITHUB_CONTRIBUTOR_SIGNALS_FAILED");
  return {
    nodes: await response.json(),
    hasMore: /rel="next"/.test(response.headers.get("link") || "")
  };
};

export const fetchRepositoryContributorFriendliness = async (repository: any, githubToken: any) => {
  const hasContributionGuide = !!repository.contributionGuideUrl;
  try {
    if (githubToken) {
      const pullRequests = await fetchContributorPullRequestsWithGraphql(repository.fullName, githubToken);
      return summarizeContributorFriendliness(pullRequests.nodes, {
        hasContributionGuide,
        hasMorePullRequests: pullRequests.hasMore
      });
    }

    const pullRequests = await fetchContributorPullRequestsWithRest(repository.fullName, githubToken);
    return summarizeContributorFriendliness(pullRequests.nodes, {
      hasContributionGuide,
      hasMorePullRequests: pullRequests.hasMore,
      responseDataAvailable: false
    });
  } catch {
    return {
      level: "unknown",
      label: "확인 불가",
      windowDays: CONTRIBUTOR_WINDOW_DAYS,
      sampleLimited: false,
      externalPullRequestCount: 0,
      responseCount: null,
      responseRate: null,
      medianFirstResponseHours: null,
      mergedPullRequestCount: 0,
      stalePullRequestCount: 0,
      hasContributionGuide,
      responseDataAvailable: false
    };
  }
};

export const parseRepositoryName = (value: any) => {
  const input = String(value || "").trim().replace(/\.git$/i, "");
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input)) return input;

  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.hostname !== "github.com" || parts.length < 2) return "";
    const fullName = `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
    return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName) ? fullName : "";
  } catch {
    return "";
  }
};

const normalizeLanguage = (language: any) => {
  if (!language) return [];
  if (language === "HTML" || language === "CSS") return ["HTML/CSS"];
  return [language];
};

export const fetchOpenSourceRepository = async (fullName: any, githubToken: any) => {
  const response = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: githubHeaders(githubToken),
    signal: AbortSignal.timeout(20_000)
  });
  if (response.status === 404) throw new Error("GITHUB_REPOSITORY_NOT_FOUND");
  if (response.status === 403 || response.status === 429) throw new Error("GITHUB_RATE_LIMIT");
  if (!response.ok) throw new Error("GITHUB_FETCH_FAILED");

  const repository = await response.json();
  if (repository.visibility !== "public") {
    throw new Error("REPOSITORY_NOT_OPEN_SOURCE");
  }
  if (repository.archived || repository.disabled) {
    throw new Error("REPOSITORY_INACTIVE");
  }

  const license = await resolveRepositoryLicense(repository, githubToken);
  if (!license) throw new Error("REPOSITORY_NOT_OPEN_SOURCE");

  let contributionGuideUrl = "";
  let contributionGuideApiUrl = "";
  const profileResponse = await fetch(
    `https://api.github.com/repos/${repository.full_name}/community/profile`,
    {
      headers: githubHeaders(githubToken),
      signal: AbortSignal.timeout(20_000)
    }
  );
  if (profileResponse.status === 403 || profileResponse.status === 429) {
    throw new Error("GITHUB_RATE_LIMIT");
  }
  if (profileResponse.ok) {
    const profile = await profileResponse.json();
    contributionGuideUrl = profile.files?.contributing?.html_url || "";
    contributionGuideApiUrl = profile.files?.contributing?.url || "";
  }

  return {
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
    hasIssues: !!repository.has_issues,
    license,
    ownerAvatarUrl: repository.owner?.avatar_url || "",
    activity: repositoryActivity(repository.pushed_at),
    pushedAt: repository.pushed_at || null,
    contributionGuideUrl,
    contributionGuideApiUrl,
    trendingRank: null as number | null,
    starsThisMonth: 0
  };
};
