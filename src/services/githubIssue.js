const fallbackRepositoryAvatar = repository => {
  const owner = String(repository || "").split("/")[0];
  return owner ? `https://github.com/${owner}.png?size=320` : "";
};

const normalizeImportedIssue = ({ issue, repository }) => {
  const labels = Array.isArray(issue.labelDetails) ? issue.labelDetails : [];
  const repositoryTopics = Array.isArray(repository?.topics) ? repository.topics : [];
  const languageTags = Array.isArray(repository?.languageTags) ? repository.languageTags : [];

  return {
    id: `github-${issue.repository}-${issue.number}`,
    source: "github-import",
    url: issue.url,
    repo: issue.repository,
    number: issue.number,
    title: issue.title,
    summary: "이슈 원문을 불러왔습니다. 상세 화면에서 핵심 분석을 확인하세요.",
    body: issue.body || "작성된 본문이 없습니다.",
    bodyHtml: "",
    status: issue.state === "open" ? "Open" : "Closed",
    difficulty: "분석 전",
    difficultyLevel: "unlabeled",
    difficultySource: "ai-analysis-pending",
    difficultyConfidence: "",
    difficultyReason: "",
    workType: "분석 전",
    typeLabel: "분석 전",
    languageTags,
    techs: [...new Set([
      ...labels.map(label => label.name),
      ...repositoryTopics,
      ...languageTags
    ].filter(Boolean))].slice(0, 4),
    labels,
    repositoryAvatarUrl: repository?.ownerAvatarUrl || fallbackRepositoryAvatar(issue.repository),
    contributionGuideUrl: repository?.contributionGuideUrl || "",
    trendingRank: null,
    starsThisMonth: 0,
    author: issue.author || { login: "unknown", avatarUrl: "", url: issue.url },
    assignees: Array.isArray(issue.assignees) ? issue.assignees : [],
    comments: issue.commentCount || 0,
    relatedPullRequestCount: Number.isInteger(issue.relatedPullRequestCount)
      ? issue.relatedPullRequestCount
      : null,
    relatedPullRequestCountTruncated: !!issue.relatedPullRequestCountTruncated,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    closedAt: issue.closedAt,
    prs: []
  };
};

export const fetchGithubIssueByUrl = async (issueUrl, { signal } = {}) => {
  const response = await fetch(`/api/github-issue?url=${encodeURIComponent(issueUrl)}`, {
    signal,
    headers: { Accept: "application/json" }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error || "GitHub 이슈를 불러오지 못했습니다.");
  if (!data.issue?.url || !data.issue?.repository || !data.issue?.number) {
    throw new Error("GitHub 이슈 응답이 올바르지 않습니다.");
  }

  return normalizeImportedIssue(data);
};
