import type {
  ContributionCategoryId,
  ContributionLanguage
} from "../../shared/contributionCategories";

const CACHE_TTL_MS = 10 * 60 * 1000;

type CategoryIssueOptions = {
  language: ContributionLanguage;
  force?: boolean;
  signal?: AbortSignal;
};

const cacheKey = (category: ContributionCategoryId, language: ContributionLanguage) => (
  `oss:category-issues:v6:${category}:${language}`
);

const readCache = (category: ContributionCategoryId, language: ContributionLanguage) => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey(category, language)) || "null");
    if (!cached || Date.now() - cached.loadedAtMs > CACHE_TTL_MS) return null;
    return cached;
  } catch {
    return null;
  }
};

const writeCache = (category: ContributionCategoryId, language: ContributionLanguage, value: any) => {
  try {
    sessionStorage.setItem(cacheKey(category, language), JSON.stringify(value));
  } catch {
    // Category recommendations still work when browser storage is unavailable.
  }
};

const normalizeResponse = (data: any) => {
  if (!data?.category || !Array.isArray(data.issues) || !Array.isArray(data.repositories)) {
    throw new Error("카테고리 추천 이슈 응답이 올바르지 않습니다.");
  }

  const parsedLoadedAt = Date.parse(data.loadedAt || "");
  return {
    ...data,
    loadedAt: data.loadedAt || new Date().toISOString(),
    loadedAtMs: Number.isFinite(data.loadedAtMs)
      ? data.loadedAtMs
      : Number.isNaN(parsedLoadedAt) ? Date.now() : parsedLoadedAt,
    cached: !!data.cached,
    stale: !!data.stale
  };
};

export const fetchCategoryIssues = async (
  category: ContributionCategoryId,
  { language, force = false, signal }: CategoryIssueOptions
) => {
  if (!force) {
    const cached = readCache(category, language);
    if (cached) return { ...cached, cached: true };
  }

  const query = new URLSearchParams({ category, language });
  if (force) query.set("refresh", "1");
  const response = await fetch(`/api/category-issues?${query}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "카테고리 추천 이슈를 불러오지 못했습니다.");

  const payload = normalizeResponse(data);
  writeCache(category, language, payload);
  return payload;
};
