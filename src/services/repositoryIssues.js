export const fetchRepositoryIssues = async (repositoryName, { signal } = {}) => {
  const response = await fetch(`/api/repository-issues?repo=${encodeURIComponent(repositoryName)}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "저장소의 추천 이슈를 불러오지 못했습니다.");
  if (!data.repository || !Array.isArray(data.issues)) {
    throw new Error("저장소 추천 이슈 응답이 올바르지 않습니다.");
  }
  return data;
};
