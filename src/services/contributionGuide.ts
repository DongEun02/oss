const CACHE_PREFIX = "oss:contribution-guide:v1:";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const readCache = (fullName: any) => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(`${CACHE_PREFIX}${fullName}`) || "null");
    if (!cached || Date.now() - cached.cachedAt > CACHE_TTL_MS) return null;
    return cached.value;
  } catch {
    return null;
  }
};

const writeCache = (fullName: any, value: any) => {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${fullName}`, JSON.stringify({
      value,
      cachedAt: Date.now()
    }));
  } catch {
    // The guide can be generated again when browser storage is unavailable.
  }
};

const requestContributionGuide = async (fullName: any, signal: any) => {
  const response = await fetch(`/api/contribution-guide?repo=${encodeURIComponent(fullName)}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = Object.assign(
      new Error(data.error || "기여 가이드를 불러오지 못했습니다."),
      { status: response.status }
    );
    throw error;
  }
  if (!data.guide || !data.repository) throw new Error("기여 가이드 응답이 올바르지 않습니다.");
  return data;
};

export const fetchContributionGuide = async (
  fullName: any,
  { signal }: { signal?: AbortSignal } = {}
) => {
  const cached = readCache(fullName);
  if (cached) return { ...cached, cached: true };

  let data;
  try {
    data = await requestContributionGuide(fullName, signal);
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : null;
    if (signal?.aborted || status === null || !Number.isInteger(status) || status < 500) throw error;
    await new Promise(resolve => setTimeout(resolve, 700));
    if (signal?.aborted) throw error;
    data = await requestContributionGuide(fullName, signal);
  }

  writeCache(fullName, data);
  return data;
};
