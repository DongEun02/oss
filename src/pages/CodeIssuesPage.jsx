import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOssApp } from "../app/OssAppContext.jsx";
import { Icons } from "../components/Icons.jsx";
import { IssueFilters, IssueRecommendationGrid } from "../components/IssueExplorer.jsx";
import { formatGithubDate } from "../data/content.js";

const formatResponseDuration = hours => {
  if (!Number.isFinite(hours)) return "확인 불가";
  if (hours < 24) return `${Math.max(1, Math.round(hours))}시간`;
  return `${Math.max(1, Math.round(hours / 24))}일`;
};

const contributorEvidenceText = friendliness => {
  if (!friendliness) return "외부 기여 데이터를 확인하지 못했습니다.";
  if (friendliness.externalPullRequestCount === 0) {
    return `최근 ${friendliness.windowDays || 180}일 동안 확인된 외부 PR이 없습니다.`;
  }

  const evidence = [
    `외부 PR ${friendliness.externalPullRequestCount}건${friendliness.sampleLimited ? "+" : ""}`,
    `병합 ${friendliness.mergedPullRequestCount || 0}건`
  ];
  if (Number.isInteger(friendliness.responseCount)) {
    evidence.splice(1, 0, `관리자 응답 ${friendliness.responseCount}건`);
    evidence.push(`첫 응답 중앙 ${formatResponseDuration(friendliness.medianFirstResponseHours)}`);
  } else {
    evidence.push("응답 속도 확인 불가");
  }
  if (friendliness.stalePullRequestCount > 0) {
    evidence.push(`30일 이상 미응답 ${friendliness.stalePullRequestCount}건`);
  }
  return `최근 ${friendliness.windowDays || 180}일 · ${evidence.join(" · ")}`;
};

export function CodeIssuesPage() {
  const navigate = useNavigate();
  const { owner, repository, issueNumber } = useParams();
  const {
    issueData,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedIssueType,
    setSelectedIssueType,
    featureRepoSearch,
    setFeatureRepoSearch,
    featureRepoLanguage,
    setFeatureRepoLanguage,
    featureSourceMode,
    setFeatureSourceMode,
    repositoryQuery,
    setRepositoryQuery,
    repositoryIssues,
    repositoryIssueResult,
    repositoryIssuesLoading,
    repositoryIssuesError,
    setRepositoryIssuesError,
    issueUrlQuery,
    setIssueUrlQuery,
    issueUrlLoading,
    issueUrlError,
    setIssueUrlError,
    codexAnalysis,
    codexAnalysisLoading,
    codexAnalysisError,
    featureRecommendationsLoading,
    featureRecommendationsError,
    featureRecommendationFailures,
    interestedTasks,
    toggleTaskInterest,
    openTranslatedGuide,
    refreshFeatureRecommendations,
    resetFeatureIssueFilters,
    analyzeIssueWithCodex,
    loadRepositoryRecommendations,
    openIssueDetail,
    loadIssueByUrl,
    loadIssueFromRoute,
    filteredFeatureIssues,
    featureLanguageOptions,
    isGithubIssue,
    recommendationLoadedAtText,
    issueAssignees
  } = useOssApp();
  const isDetailRoute = !!owner && !!repository && !!issueNumber;
  const numericIssueNumber = Number(issueNumber);
  const routeRepository = owner && repository ? `${owner}/${repository}` : "";
  const hasRouteIssue = isDetailRoute
    && issueData?.repo === routeRepository
    && Number(issueData.number) === numericIssueNumber
    && isGithubIssue;
  const relatedPullRequestCount = Number.isInteger(issueData?.relatedPullRequestCount)
    ? issueData.relatedPullRequestCount
    : null;
  const hasRelatedPullRequests = relatedPullRequestCount !== null && relatedPullRequestCount > 0;

  useEffect(() => {
    if (!isDetailRoute) return;
    if (!Number.isInteger(numericIssueNumber) || numericIssueNumber <= 0) {
      navigate("/issues", { replace: true });
      return;
    }
    if (hasRouteIssue) return;
    void loadIssueFromRoute(routeRepository, numericIssueNumber);
  }, [hasRouteIssue, isDetailRoute, navigate, numericIssueNumber, routeRepository]);

  const selectIssue = issue => {
    openIssueDetail(issue);
    navigate(`/issues/${issue.repo}/${issue.number}`);
  };

  const submitIssueUrl = async event => {
    const issue = await loadIssueByUrl(event);
    if (issue) navigate(`/issues/${issue.repo}/${issue.number}`);
  };

  if (isDetailRoute) {
    if (!hasRouteIssue) {
      if (issueUrlError && !issueUrlLoading) {
        return (
          <div className="recommendation-status recommendation-status-error" role="alert">
            <Icons.Alert className="w-4 h-4 shrink-0" />
            <div>
              <strong>GitHub 이슈를 불러오지 못했습니다.</strong>
              <span>{issueUrlError}</span>
            </div>
            <button type="button" onClick={() => navigate("/issues")}>목록으로 돌아가기</button>
          </div>
        );
      }
      return (
        <div className="recommendation-status" role="status">
          <span className="recommendation-status-spinner" aria-hidden="true" />
          <div>
            <strong>GitHub 이슈를 불러오고 있습니다.</strong>
            <span>{issueUrlError || "이슈 정보와 저장소 상태를 확인합니다."}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <button
            type="button"
            onClick={() => navigate("/issues")}
            className="inline-flex items-center gap-1 text-xs text-[#3f6fd9] font-semibold hover:underline"
          >
            <Icons.ArrowLeft className="w-3 h-3 text-[#3f6fd9]" />
            코드 이슈 목록으로 돌아가기
          </button>
        </div>

        <section className="codex-analysis-card" aria-labelledby="codex-analysis-heading">
          <header className="analysis-issue-context">
            <a
              href={`https://github.com/${issueData.repo}`}
              target="_blank"
              rel="noreferrer"
              className="imported-issue-repo"
            >
              <Icons.Github className="w-4 h-4" />
              {issueData.repo} · Issue #{issueData.number}
            </a>
            <div className="analysis-issue-title-row">
              <h2>
                {codexAnalysisLoading && !issueData.titleKo
                  ? "이슈 핵심 내용을 정리하고 있습니다."
                  : issueData.titleKo || codexAnalysis?.translatedTitleKo || "이슈 분석을 불러오지 못했습니다."}
              </h2>
              <button
                type="button"
                aria-label={interestedTasks[issueData.id] ? "관심 이슈에서 제거" : "관심 이슈로 저장"}
                title={interestedTasks[issueData.id] ? "관심 이슈에서 제거" : "관심 이슈로 저장"}
                onClick={() => toggleTaskInterest(issueData, "issue")}
                className={`interest-button ${interestedTasks[issueData.id] ? "interest-button-active" : ""}`}
              >
                <Icons.Bookmark filled={!!interestedTasks[issueData.id]} className="w-4 h-4" />
              </button>
            </div>

            <div className="imported-issue-meta">
              <span className={`imported-issue-state ${issueData.status === "Closed" ? "imported-issue-state-closed" : ""}`}>
                <Icons.GitIssue className="w-3 h-3" />
                {issueData.status}
              </span>
              <a href={issueData.author.url} target="_blank" rel="noreferrer" className="imported-issue-author">
                {issueData.author.avatarUrl && <img src={issueData.author.avatarUrl} alt="" />}
                {issueData.author.login}
              </a>
              <span>{formatGithubDate(issueData.createdAt)} 작성</span>
              <span>댓글 {issueData.comments}개</span>
              <span title="GitHub 이슈 타임라인에서 확인한 연관 PR 수">
                {Number.isInteger(issueData.relatedPullRequestCount)
                  ? `연관 PR ${issueData.relatedPullRequestCount}${issueData.relatedPullRequestCountTruncated ? "+" : ""}개`
                  : "연관 PR 확인 불가"}
              </span>
            </div>

            <div
              className={`issue-assignment-status ${issueAssignees.length > 0 || hasRelatedPullRequests ? "issue-assignment-status-assigned" : "issue-assignment-status-available"}`}
              role="status"
            >
              {issueAssignees.length > 0 || hasRelatedPullRequests ? (
                <>
                  <Icons.Alert className="w-4 h-4 shrink-0" />
                  <div className="issue-assignment-copy">
                    <strong>
                      {issueAssignees.length > 0
                        ? `담당자 ${issueAssignees.length}명이 지정되어 있습니다.`
                        : `연관 Pull Request ${relatedPullRequestCount}개가 있습니다.`}
                    </strong>
                    <span>이미 작업 중일 수 있으니 GitHub에서 진행 상황을 먼저 확인하세요.</span>
                  </div>
                  {issueAssignees.length > 0 && (
                    <div className="issue-assignment-people" aria-label="지정된 담당자">
                      {issueAssignees.map(assignee => (
                        <a
                          key={assignee.login}
                          href={assignee.html_url || `https://github.com/${assignee.login}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {(assignee.avatar_url || assignee.avatarUrl) && (
                            <img src={assignee.avatar_url || assignee.avatarUrl} alt="" />
                          )}
                          {assignee.login}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Icons.Check className="w-4 h-4 shrink-0" />
                  <div className="issue-assignment-copy">
                    <strong>현재 지정된 담당자가 없습니다.</strong>
                    <span>작업을 시작하기 전에 최신 댓글과 연결된 PR을 확인하세요.</span>
                  </div>
                </>
              )}
            </div>

            {issueData.labels.length > 0 && (
              <div className="imported-issue-labels" aria-label="이슈 라벨">
                {issueData.labels.map(label => (
                  <span
                    key={label.name}
                    className="imported-issue-label"
                    style={{ borderColor: `#${label.color}`, backgroundColor: `#${label.color}18` }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {issueData.contributionGuideUrl && (
              <button type="button" onClick={() => openTranslatedGuide(issueData.repo)} className="issue-contribution-guide-link">
                <Icons.BookOpen className="w-4 h-4 shrink-0" />
                <span>
                  <strong>이 저장소의 기여 가이드 보기</strong>
                  <small>{issueData.repo}의 공식 기여 규칙을 한국어로 확인합니다.</small>
                </span>
                <Icons.ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}
          </header>

          <header className="codex-analysis-header">
            <div><span className="codex-analysis-kicker">핵심 정리</span><h3 id="codex-analysis-heading">이슈 핵심 분석</h3></div>
          </header>

          {codexAnalysisLoading && (
            <div className="codex-analysis-loading" role="status">
              <span className="codex-analysis-spinner" aria-hidden="true" />
              <div><strong>이슈 범위를 분석하고 있습니다.</strong><span>첫 분석은 최대 1분 정도 걸릴 수 있습니다.</span></div>
            </div>
          )}

          {codexAnalysisError && !codexAnalysisLoading && (
            <div className="codex-analysis-error" role="alert">
              <Icons.Alert className="w-4 h-4 shrink-0" />
              <span>{codexAnalysisError}</span>
              <button type="button" onClick={() => analyzeIssueWithCodex(issueData.url)}>다시 분석</button>
            </div>
          )}

          {codexAnalysis && !codexAnalysisLoading && (
            <div className="codex-analysis-content">
              <div className="codex-analysis-summary"><span>AI 요약</span><p>{codexAnalysis.summaryKo}</p></div>
              <div className="codex-analysis-metrics">
                <div>
                  <span>예상 난이도</span><strong>{codexAnalysis.difficulty.level}</strong>
                  <small>신뢰도 {codexAnalysis.difficulty.confidence}</small>
                </div>
                <div>
                  <span>작업 유형</span><strong>{codexAnalysis.workType}</strong>
                  <small>{codexAnalysis.cached ? "캐시된 분석" : "새로 분석됨"}</small>
                </div>
              </div>
              <p className="codex-analysis-rationale">{codexAnalysis.difficulty.rationale}</p>
              <div className="codex-analysis-grid">
                <div>
                  <h4>먼저 확인할 순서</h4>
                  <ol>{codexAnalysis.firstSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
                </div>
                <div>
                  <h4>필요한 기술</h4>
                  {codexAnalysis.requiredSkills.length > 0 ? (
                    <div className="codex-analysis-skills">{codexAnalysis.requiredSkills.map(skill => <span key={skill}>{skill}</span>)}</div>
                  ) : <p className="codex-analysis-empty">이슈 본문만으로 특정하기 어렵습니다.</p>}
                  <h4 className="codex-analysis-subheading">예상 수정 영역</h4>
                  {codexAnalysis.likelyAreas.length > 0 ? (
                    <ul>{codexAnalysis.likelyAreas.map(area => <li key={area}>{area}</li>)}</ul>
                  ) : <p className="codex-analysis-empty">확정할 수 있는 파일 정보가 없습니다.</p>}
                </div>
              </div>
              {codexAnalysis.risks.length > 0 && (
                <div className="codex-analysis-risks"><h4>주의할 점</h4><ul>{codexAnalysis.risks.map(risk => <li key={risk}>{risk}</li>)}</ul></div>
              )}
              <footer className="codex-analysis-footer">
                <span>저장소 라벨과 이슈 본문을 바탕으로 정리한 결과입니다. 실제 작업 전 기여 가이드를 확인하세요.</span>
                <a href={issueData.url} target="_blank" rel="noreferrer">
                  GitHub 원문 열기 <Icons.ArrowRight className="w-3 h-3" />
                </a>
              </footer>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-6">
        <div className="page-heading pb-2">
          <h2 className="text-xl font-bold text-[#1f2933]">코드 이슈</h2>
          <p className="text-xs text-[#57606a]">
            <a href="https://github.com/trending?since=monthly" target="_blank" rel="noreferrer" className="text-[#3f6fd9] font-semibold hover:underline">
              GitHub 월간 Trending
            </a>{" "}
            오픈소스 추천 목록을 살펴보거나 저장소 이름과 이슈 URL로 직접 찾을 수 있습니다.
          </p>
        </div>

        <div className="feature-source-tabs" role="tablist" aria-label="코드 이슈 찾기 방식">
          {[
            ["recommended", "추천 이슈"],
            ["repository", "저장소로 찾기"],
            ["issue-url", "이슈 URL로 찾기"]
          ].map(([mode, label]) => (
            <button
              type="button"
              role="tab"
              key={mode}
              aria-selected={featureSourceMode === mode}
              onClick={() => {
                setFeatureSourceMode(mode);
                setRepositoryIssuesError("");
                setIssueUrlError("");
                resetFeatureIssueFilters();
              }}
              className={`feature-source-tab ${featureSourceMode === mode ? "feature-source-tab-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        {featureSourceMode === "recommended" ? (
          <>
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><Icons.Search className="w-4 h-4" /></span>
                <input
                  type="text"
                  value={featureRepoSearch}
                  onChange={event => setFeatureRepoSearch(event.target.value)}
                  placeholder="코드 이슈, 저장소, 기술 검색"
                  className="search-input w-full bg-white border focus:border-[#3f6fd9] focus:ring-1 focus:ring-[#3f6fd9] pl-9 pr-4 py-2 text-xs text-[#1f2933] outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="recommendation-sync-summary">
                <span>{featureRecommendationsLoading ? "GitHub 이슈를 불러오는 중" : <>총 <strong>{filteredFeatureIssues.length}개</strong>의 추천 이슈</>}</span>
                {recommendationLoadedAtText && !featureRecommendationsLoading && <small>{recommendationLoadedAtText} 동기화</small>}
                <button type="button" onClick={refreshFeatureRecommendations} disabled={featureRecommendationsLoading}>새로고침</button>
              </div>
            </div>

            <IssueFilters
              language={featureRepoLanguage}
              languages={featureLanguageOptions}
              onLanguageChange={setFeatureRepoLanguage}
              difficulty={selectedDifficulty}
              onDifficultyChange={setSelectedDifficulty}
              issueType={selectedIssueType}
              onIssueTypeChange={setSelectedIssueType}
            />

            {featureRecommendationsLoading && (
              <div className="recommendation-status" role="status">
                <span className="recommendation-status-spinner" aria-hidden="true" />
                <div><strong>실제 GitHub 이슈를 확인하고 있습니다.</strong><span>담당자와 연관 Pull Request가 없는 열린 이슈만 선별합니다.</span></div>
              </div>
            )}
            {featureRecommendationsError && !featureRecommendationsLoading && (
              <div className="recommendation-status recommendation-status-error" role="alert">
                <Icons.Alert className="w-4 h-4 shrink-0" />
                <div><strong>추천 이슈를 불러오지 못했습니다.</strong><span>{featureRecommendationsError}</span></div>
                <button type="button" onClick={refreshFeatureRecommendations}>다시 시도</button>
              </div>
            )}
            {featureRecommendationFailures.length > 0 && !featureRecommendationsLoading && (
              <div className="recommendation-partial-notice" role="status">일부 저장소를 불러오지 못해 나머지 저장소의 이슈만 표시합니다.</div>
            )}
            {!featureRecommendationsLoading && !featureRecommendationsError && (
              <IssueRecommendationGrid
                issues={filteredFeatureIssues}
                interestedTasks={interestedTasks}
                onSelectIssue={selectIssue}
                onToggleInterest={toggleTaskInterest}
              />
            )}
          </>
        ) : featureSourceMode === "repository" ? (
          <div className="space-y-5">
            <section className="issue-import-panel" aria-labelledby="repository-search-heading">
              <h3 id="repository-search-heading">저장소 추천 이슈 찾기</h3>
              <p>GitHub의 <code>owner/repository</code> 이름을 입력하면 담당자와 연관 Pull Request가 없는 열린 이슈를 선별합니다.</p>
              <form className="issue-import-form" onSubmit={loadRepositoryRecommendations}>
                <div className="issue-import-input-wrap">
                  <Icons.Github className="w-4 h-4" />
                  <input
                    type="text"
                    value={repositoryQuery}
                    onChange={event => { setRepositoryQuery(event.target.value); setRepositoryIssuesError(""); }}
                    placeholder="facebook/react"
                    aria-label="GitHub 저장소 이름"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="issue-import-input"
                  />
                </div>
                <button type="submit" className="issue-import-submit" disabled={repositoryIssuesLoading}>
                  {repositoryIssuesLoading ? "불러오는 중" : "이슈 불러오기"}
                  {!repositoryIssuesLoading && <Icons.ArrowRight className="w-3.5 h-3.5 text-white" />}
                </button>
              </form>
              {repositoryIssuesError && (
                <div className="issue-import-error" role="alert"><Icons.Alert className="w-4 h-4 shrink-0 mt-0.5" /><span>{repositoryIssuesError}</span></div>
              )}
              <div className="issue-import-note">공개 상태이며 GitHub에서 라이선스가 확인되는 저장소만 지원합니다.</div>
            </section>

            {repositoryIssuesLoading && (
              <div className="recommendation-status" role="status">
                <span className="recommendation-status-spinner" aria-hidden="true" />
                <div><strong>저장소의 열린 이슈를 확인하고 있습니다.</strong><span>라벨, 담당자, 본문 내용과 최근 업데이트를 기준으로 정렬합니다.</span></div>
              </div>
            )}

            {repositoryIssueResult && !repositoryIssuesLoading && (
              <>
                <div className="repository-search-summary">
                  <img src={repositoryIssueResult.repository.ownerAvatarUrl} alt="" />
                  <div className="repository-search-summary-main">
                    <a href={repositoryIssueResult.repository.url} target="_blank" rel="noreferrer">{repositoryIssueResult.repository.fullName}</a>
                    <p>{repositoryIssueResult.repository.description}</p>
                    <span>
                      {repositoryIssueResult.repository.language} · {repositoryIssueResult.repository.license.id} · 별 {repositoryIssueResult.repository.stars.toLocaleString()}개
                      {repositoryIssueResult.repository.activity?.pushedAt ? ` · 최근 push ${formatGithubDate(repositoryIssueResult.repository.activity.pushedAt)}` : ""}
                    </span>
                    <span className="repository-contributor-evidence">{contributorEvidenceText(repositoryIssueResult.repository.contributorFriendliness)}</span>
                  </div>
                  <div className="repository-search-summary-side">
                    <strong>{repositoryIssues.length}개 추천</strong>
                    <div className="repository-health-list" aria-label="저장소 상태">
                      <div>
                        <span>개발 활동</span>
                        <strong
                          className={`repository-health-status repository-health-${repositoryIssueResult.repository.developmentActivity?.level || repositoryIssueResult.repository.activity?.level || "unknown"}`}
                          title="GitHub 마지막 push 기준: 30일 이내 활발, 90일 이내 보통"
                        >
                          <i aria-hidden="true" />
                          {repositoryIssueResult.repository.developmentActivity?.label || repositoryIssueResult.repository.activity?.label || "확인 불가"}
                        </strong>
                      </div>
                      <div>
                        <span>외부 기여 친화도</span>
                        <strong
                          className={`repository-health-status repository-health-${repositoryIssueResult.repository.contributorFriendliness?.level || "unknown"}`}
                          title="최근 외부 PR의 관리자 응답, 응답 속도, 병합과 장기 미응답을 기준으로 판단"
                        >
                          <i aria-hidden="true" />
                          {repositoryIssueResult.repository.contributorFriendliness?.label || "확인 불가"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative w-full md:max-w-md">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><Icons.Search className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={featureRepoSearch}
                    onChange={event => setFeatureRepoSearch(event.target.value)}
                    placeholder="불러온 이슈 안에서 검색"
                    className="search-input w-full bg-white border focus:border-[#3f6fd9] focus:ring-1 focus:ring-[#3f6fd9] pl-9 pr-4 py-2 text-xs text-[#1f2933] outline-none placeholder:text-slate-400"
                  />
                </div>
                <IssueFilters
                  language={featureRepoLanguage}
                  languages={featureLanguageOptions}
                  onLanguageChange={setFeatureRepoLanguage}
                  difficulty={selectedDifficulty}
                  onDifficultyChange={setSelectedDifficulty}
                  issueType={selectedIssueType}
                  onIssueTypeChange={setSelectedIssueType}
                />
                <IssueRecommendationGrid
                  issues={filteredFeatureIssues}
                  interestedTasks={interestedTasks}
                  onSelectIssue={selectIssue}
                  onToggleInterest={toggleTaskInterest}
                  emptyText={repositoryIssues.length === 0 ? "이 저장소에서 추천할 만한 열린 이슈를 찾지 못했습니다." : "현재 필터에 맞는 이슈가 없습니다."}
                />
              </>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <section className="issue-import-panel" aria-labelledby="issue-url-search-heading">
              <h3 id="issue-url-search-heading">GitHub 이슈 URL로 찾기</h3>
              <p>작업했거나 관심 있는 이슈 URL을 입력하면 원문을 불러와 핵심 내용과 기여 난이도를 분석합니다.</p>
              <form className="issue-import-form" onSubmit={submitIssueUrl}>
                <div className="issue-import-input-wrap">
                  <Icons.GitIssue className="w-4 h-4" />
                  <input
                    type="url"
                    value={issueUrlQuery}
                    onChange={event => { setIssueUrlQuery(event.target.value); setIssueUrlError(""); }}
                    placeholder="https://github.com/owner/repository/issues/123"
                    aria-label="GitHub 이슈 URL"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="issue-import-input"
                  />
                </div>
                <button type="submit" className="issue-import-submit" disabled={issueUrlLoading}>
                  {issueUrlLoading ? "불러오는 중" : "이슈 불러오기"}
                  {!issueUrlLoading && <Icons.ArrowRight className="w-3.5 h-3.5 text-white" />}
                </button>
              </form>
              {issueUrlError && (
                <div className="issue-import-error" role="alert"><Icons.Alert className="w-4 h-4 shrink-0 mt-0.5" /><span>{issueUrlError}</span></div>
              )}
              <div className="issue-import-note">
                공개 상태이며 라이선스가 확인되는 오픈소스의 GitHub Issue URL을 지원합니다. Pull Request URL은 불러올 수 없습니다. 관심 이슈로 저장하면 마이페이지에서 진행 상태를 관리할 수 있습니다.
              </div>
            </section>
            {issueUrlLoading && (
              <div className="recommendation-status" role="status">
                <span className="recommendation-status-spinner" aria-hidden="true" />
                <div><strong>GitHub에서 이슈를 불러오고 있습니다.</strong><span>이슈 원문과 저장소 정보를 확인한 뒤 상세 화면으로 이동합니다.</span></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
