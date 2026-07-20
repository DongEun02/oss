const CACHE_KEY_PREFIX = "oss:translation-status:v3";
const CACHE_TTL_MS = 30 * 60 * 1000;

const cacheKey = (language: string) => `${CACHE_KEY_PREFIX}:${language}`;

const readCache = (language: string) => {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(language)) || "null");
    if (!cached?.savedAt || !cached?.value) return null;
    if (Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    return cached.value;
  } catch {
    return null;
  }
};

const writeCache = (language: string, value: any) => {
  try {
    localStorage.setItem(cacheKey(language), JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
};

export const clearTranslationStatusCache = (language?: string) => {
  try {
    if (language) {
      localStorage.removeItem(cacheKey(language));
      return;
    }
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  } catch {
    // Ignore storage access failures and continue with a network refresh.
  }
};

export const fetchTranslationStatuses = async (
  {
    language = "All",
    force = false,
    signal
  }: { language?: string; force?: boolean; signal?: AbortSignal } = {}
) => {
  if (!force) {
    const cached = readCache(language);
    if (cached) return { ...cached, browserCached: true };
  }

  const query = new URLSearchParams({ language });
  if (force) query.set("refresh", "1");
  const response = await fetch(`/api/translation-status?${query}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "번역 상태를 확인하지 못했습니다.");

  writeCache(language, data);
  return data;
};

export const indexTranslationStatuses = (result: any) => {
  const index: Record<string, any> = {};
  (result?.projects || []).forEach((project: any) => {
    (project.docs || []).forEach((document: any) => {
      index[`translation-${project.key}-${document.id}`] = document;
    });
  });
  return index;
};

export const indexTranslationProjects = (result: any) => {
  const index: Record<string, any> = {};
  (result?.projects || []).forEach((project: any) => {
    index[project.key] = project;
  });
  return index;
};
