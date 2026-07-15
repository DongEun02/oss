const CACHE_PREFIX = "oss:contribution-guide:v1:";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const readCache = fullName => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(`${CACHE_PREFIX}${fullName}`) || "null");
    if (!cached || Date.now() - cached.cachedAt > CACHE_TTL_MS) return null;
    return cached.value;
  } catch {
    return null;
  }
};

const writeCache = (fullName, value) => {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${fullName}`, JSON.stringify({
      value,
      cachedAt: Date.now()
    }));
  } catch {
    // The guide can be generated again when browser storage is unavailable.
  }
};

export const fetchContributionGuide = async (fullName, { signal } = {}) => {
  const cached = readCache(fullName);
  if (cached) return { ...cached, cached: true };

  const response = await fetch(`/api/contribution-guide?repo=${encodeURIComponent(fullName)}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "기여 가이드를 불러오지 못했습니다.");
  if (!data.guide || !data.repository) throw new Error("기여 가이드 응답이 올바르지 않습니다.");

  writeCache(fullName, data);
  return data;
};
