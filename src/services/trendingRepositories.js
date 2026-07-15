const CACHE_KEY = "oss:monthly-trending:v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

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
    // Trending data still works when browser storage is unavailable.
  }
};

const normalizeResponse = data => {
  if (!data || !Array.isArray(data.repositories)) {
    throw new Error("GitHub 월간 Trending 응답이 올바르지 않습니다.");
  }

  const loadedAtMs = Number.isFinite(data.loadedAtMs)
    ? data.loadedAtMs
    : Date.parse(data.loadedAt || "") || Date.now();
  return {
    repositories: data.repositories,
    source: data.source || {},
    loadedAt: data.loadedAt || new Date(loadedAtMs).toISOString(),
    loadedAtMs,
    cached: !!data.cached,
    stale: !!data.stale
  };
};

export const fetchTrendingRepositories = async ({ force = false, signal } = {}) => {
  if (!force) {
    const cached = readCache();
    if (cached) return { ...cached, cached: true };
  }

  const response = await fetch(`/api/trending-repositories${force ? "?refresh=1" : ""}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "월간 Trending 저장소를 불러오지 못했습니다.");

  const payload = normalizeResponse(data);
  writeCache(payload);
  return payload;
};
