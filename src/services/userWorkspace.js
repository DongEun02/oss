export const WORKSPACE_STATUSES = [
  { value: "interested", label: "관심 있는 이슈" },
  { value: "in_progress", label: "진행 중인 이슈" },
  { value: "completed", label: "기여 완료한 이슈" }
];

const createIssueData = task => ({
  id: task.id,
  source: task.source || "github-import",
  url: task.url,
  repo: task.repo,
  number: task.number,
  title: task.title,
  titleKo: task.titleKo,
  summary: task.summary,
  summaryKo: task.summaryKo,
  status: task.status || "Open",
  labels: task.labels || [],
  techs: task.techs || [],
  languageTags: task.languageTags || [],
  difficulty: task.difficulty || "난이도 미분류",
  difficultyLevel: task.difficultyLevel || "unlabeled",
  workType: task.workType || task.typeLabel || "유형 미분류",
  typeLabel: task.typeLabel || task.workType || "유형 미분류",
  author: task.author || { login: "unknown", avatarUrl: "", url: task.url },
  assignees: task.assignees || [],
  comments: task.comments || 0,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  codexAnalysis: task.codexAnalysis || null,
  prs: []
});

export const createWorkspaceItem = (task, kind) => {
  const savedAt = new Date().toISOString();

  if (kind === "translation") {
    return {
      id: task.id,
      kind,
      status: "interested",
      repo: task.repo,
      title: task.title,
      summary: task.summary,
      difficulty: task.difficulty,
      workType: "번역 작업",
      languageTags: task.languageTags || [],
      savedAt,
      updatedAt: savedAt,
      data: {
        repoKey: task.repoKey,
        docId: task.docId
      }
    };
  }

  return {
    id: task.id,
    kind: "issue",
    status: "interested",
    repo: task.repo,
    title: task.titleKo || task.title,
    summary: task.summaryKo || task.summary || "핵심 요약을 준비 중입니다.",
    difficulty: task.difficulty || "난이도 미분류",
    workType: task.workType || task.typeLabel || "유형 미분류",
    languageTags: task.languageTags || [],
    url: task.url,
    savedAt,
    updatedAt: savedAt,
    data: createIssueData(task)
  };
};
