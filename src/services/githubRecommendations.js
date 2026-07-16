const CACHE_KEY = "oss:github-recommendations:v6";
const CACHE_TTL_MS = 5 * 60 * 1000;

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

const normalizeResponse = data => {
  if (!data || !Array.isArray(data.issues)) {
    throw new Error("GitHub 추천 이슈 응답이 올바르지 않습니다.");
  }

  const parsedLoadedAt = Date.parse(data.loadedAt || "");
  return {
    issues: data.issues,
    failedRepositories: Array.isArray(data.failedRepositories) ? data.failedRepositories : [],
    loadedAt: data.loadedAt || new Date().toISOString(),
    loadedAtMs: Number.isFinite(data.loadedAtMs)
      ? data.loadedAtMs
      : Number.isNaN(parsedLoadedAt) ? Date.now() : parsedLoadedAt,
    cached: !!data.cached,
    stale: !!data.stale
  };
};

export const fetchRecommendedIssues = async ({ force = false, signal } = {}) => {
  if (!force) {
    const cached = readCache();
    if (cached) return { ...cached, cached: true };
  }

  const response = await fetch(`/api/recommended-issues${force ? "?refresh=1" : ""}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "GitHub 추천 이슈를 불러오지 못했습니다.");
  }

  const payload = normalizeResponse(data);
  writeCache(payload);
  return payload;
};
