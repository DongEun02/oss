const EXCLUDED_LICENSES = new Set(["", "NOASSERTION", "OTHER"]);

const githubHeaders = githubToken => {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "oss-repository-lookup",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`;
  return headers;
};

export const parseRepositoryName = value => {
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

const normalizeLanguage = language => {
  if (!language) return [];
  if (language === "HTML" || language === "CSS") return ["HTML/CSS"];
  return [language];
};

export const fetchOpenSourceRepository = async (fullName, githubToken) => {
  const response = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: githubHeaders(githubToken),
    signal: AbortSignal.timeout(20_000)
  });
  if (response.status === 404) throw new Error("GITHUB_REPOSITORY_NOT_FOUND");
  if (response.status === 403 || response.status === 429) throw new Error("GITHUB_RATE_LIMIT");
  if (!response.ok) throw new Error("GITHUB_FETCH_FAILED");

  const repository = await response.json();
  const licenseId = repository.license?.spdx_id || "";
  if (repository.visibility !== "public" || EXCLUDED_LICENSES.has(licenseId)) {
    throw new Error("REPOSITORY_NOT_OPEN_SOURCE");
  }
  if (repository.archived || repository.disabled) {
    throw new Error("REPOSITORY_INACTIVE");
  }

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
    license: {
      id: licenseId,
      name: repository.license?.name || licenseId
    },
    ownerAvatarUrl: repository.owner?.avatar_url || "",
    contributionGuideUrl,
    contributionGuideApiUrl,
    trendingRank: null,
    starsThisMonth: 0
  };
};
