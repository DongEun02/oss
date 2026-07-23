import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useOssApp } from "../app/OssAppContext";
import { Icons } from "../components/Icons";
import { IssueFilters, IssueRecommendationGrid } from "../components/IssueExplorer";
import { LanguageFilterBar } from "../components/LanguageFilterBar";
import { PersonalizedRepositoryRecommendations } from "../components/PersonalizedRepositoryRecommendations";
import { formatGithubDate } from "../data/content";
import { CONTRIBUTION_CATEGORIES } from "../../shared/contributionCategories";
import { TranslationPage } from "./TranslationPage";

const CONTRIBUTION_EXPECTATIONS_KEY = "oss:contribution-expectations:v1";

const hasHiddenContributionExpectations = () => {
  try {
    return localStorage.getItem(CONTRIBUTION_EXPECTATIONS_KEY) === "hidden";
  } catch {
    return false;
  }
};

const formatResponseDuration = (hours: any) => {
  if (!Number.isFinite(hours)) return "확인 불가";
  if (hours < 24) return `${Math.max(1, Math.round(hours))}시간`;
  return `${Math.max(1, Math.round(hours / 24))}일`;
};

const contributorEvidenceText = (friendliness: any) => {
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
  const location = useLocation();
  const navigate = useNavigate();
  const { owner, repository, issueNumber } = useParams();
  const expectationsDialogRef = useRef<HTMLDialogElement>(null);
  const [showContributionExpectations, setShowContributionExpectations] = useState(false);
  const [hideContributionExpectations, setHideContributionExpectations] = useState(false);
  const {
    authUser,
    authLoading,
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
    selectedContributionCategory,
    selectContributionCategory,
    selectedContributionLanguage,
    contributionLanguageOptions,
    selectContributionLanguage,
    categoryIssues,
    categoryRepositories,
    categoryRecommendationFailures,
    categoryRecommendationCriteria,
    categoryIssuesLoading,
    categoryIssuesError,
    categoryLoadedAtText,
    refreshCategoryRecommendations,
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
    interestedTasks,
    toggleTaskInterest,
    openTranslatedGuide,
    resetFeatureIssueFilters,
    analyzeIssueWithCodex,
    loadRepositoryRecommendations,
    openPersonalizedRepository,
    openIssueDetail,
    loadIssueByUrl,
    loadIssueFromRoute,
    filteredFeatureIssues,
    featureLanguageOptions,
    isGithubIssue,
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
  const claimCommentCount = Number.isInteger(issueData?.claimCommentCount)
    ? issueData.claimCommentCount
    : null;
  const hasClaimComments = claimCommentCount !== null && claimCommentCount > 0;
  const hasIncompleteCommentReview = !!issueData?.claimCommentReviewTruncated;
  const isIssuePossiblyClaimed = issueAssignees.length > 0
    || hasRelatedPullRequests
    || hasClaimComments
    || hasIncompleteCommentReview;
  const issueDeepWikiUrl = issueData?.deepWikiUrl
    || (issueData?.repo ? `https://deepwiki.com/${issueData.repo}` : "");
  const activeContributionCategory = CONTRIBUTION_CATEGORIES.find(
    category => category.id === selectedContributionCategory
  ) || CONTRIBUTION_CATEGORIES[0];

  const openContributionExpectations = () => {
    setHideContributionExpectations(hasHiddenContributionExpectations());
    setShowContributionExpectations(true);
  };

  const closeContributionExpectations = () => {
    try {
      if (hideContributionExpectations) {
        localStorage.setItem(CONTRIBUTION_EXPECTATIONS_KEY, "hidden");
      } else {
        localStorage.removeItem(CONTRIBUTION_EXPECTATIONS_KEY);
      }
    } catch {
      // The information dialog still works when browser storage is unavailable.
    }
    setShowContributionExpectations(false);
  };

  useEffect(() => {
    if (isDetailRoute) return;
    try {
      if (hasHiddenContributionExpectations()) return;
    } catch {
      // Show the dialog when browser storage is unavailable.
    }
    setHideContributionExpectations(false);
    setShowContributionExpectations(true);
  }, [isDetailRoute]);

  useEffect(() => {
    if (!showContributionExpectations) return undefined;
    const dialog = expectationsDialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [showContributionExpectations]);

  useEffect(() => {
    if (isDetailRoute) return;
    const parameters = new URLSearchParams(location.search);
    if (parameters.get("source") !== "personalized") return;
    setFeatureSourceMode("personalized");
    parameters.delete("source");
    navigate({
      pathname: location.pathname,
      search: parameters.toString() ? `?${parameters.toString()}` : "",
      hash: location.hash
    }, { replace: true });
  }, [isDetailRoute, location.hash, location.pathname, location.search, navigate, setFeatureSourceMode]);

  useEffect(() => {
    if (!isDetailRoute) return;
    if (!Number.isInteger(numericIssueNumber) || numericIssueNumber <= 0) {
      navigate("/issues", { replace: true });
      return;
    }
    if (hasRouteIssue) return;
    void loadIssueFromRoute(routeRepository, numericIssueNumber);
  }, [hasRouteIssue, isDetailRoute, navigate, numericIssueNumber, routeRepository]);

  const selectIssue = (issue: any) => {
    openIssueDetail(issue);
    navigate(`/issues/${issue.repo}/${issue.number}`);
  };

  const submitIssueUrl = async (event: any) => {
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
              className={`issue-assignment-status ${isIssuePossiblyClaimed ? "issue-assignment-status-assigned" : "issue-assignment-status-available"}`}
              role="status"
            >
              {isIssuePossiblyClaimed ? (
                <>
                  <Icons.Alert className="w-4 h-4 shrink-0" />
                  <div className="issue-assignment-copy">
                    <strong>
                      {issueAssignees.length > 0
                        ? `담당자 ${issueAssignees.length}명이 지정되어 있습니다.`
                        : hasRelatedPullRequests
                          ? `연관 Pull Request ${relatedPullRequestCount}개가 있습니다.`
                          : hasClaimComments
                            ? `작업 의사를 밝힌 댓글 ${claimCommentCount}개가 있습니다.`
                            : "댓글이 많아 전체 작업 의사를 확인하지 못했습니다."}
                    </strong>
                    <span>이미 작업 중일 수 있으니 GitHub에서 진행 상황을 먼저 확인하세요.</span>
                  </div>
                  {issueAssignees.length > 0 && (
                    <div className="issue-assignment-people" aria-label="지정된 담당자">
                      {issueAssignees.map((assignee: any) => (
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
                    <strong>현재 담당자·연관 PR·작업 의사 댓글이 없습니다.</strong>
                    <span>최근 댓글까지 확인한 결과이며, 작업 시작 직전에 GitHub 상태를 한 번 더 확인하세요.</span>
                  </div>
                </>
              )}
            </div>

            {issueData.labels.length > 0 && (
              <div className="imported-issue-labels" aria-label="이슈 라벨">
                {issueData.labels.map((label: any) => (
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

            <div className="issue-resource-links">
              <button type="button" onClick={() => openTranslatedGuide(issueData.repo)} className="issue-contribution-guide-link">
                <Icons.BookOpen className="w-4 h-4 shrink-0" />
                <span>
                  <strong>이 저장소의 기여 가이드 보기</strong>
                  <small>{issueData.repo}의 공식 기여 문서를 찾아 한국어로 정리합니다.</small>
                </span>
                <Icons.ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <a href={issueDeepWikiUrl} target="_blank" rel="noreferrer" className="issue-contribution-guide-link">
                <Icons.BookOpen className="w-4 h-4 shrink-0" />
                <span>
                  <strong>DeepWiki에서 코드베이스 익히기</strong>
                  <small>이슈를 시작하기 전에 {issueData.repo}의 구조와 주요 흐름을 살펴봅니다.</small>
                </span>
                <Icons.ArrowRight className="w-4 h-4 shrink-0" />
              </a>
            </div>
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
                  <ol>{codexAnalysis.firstSteps.map((step: any, index: any) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
                </div>
                <div>
                  <h4>필요한 기술</h4>
                  {codexAnalysis.requiredSkills.length > 0 ? (
                    <div className="codex-analysis-skills">{codexAnalysis.requiredSkills.map((skill: any) => <span key={skill}>{skill}</span>)}</div>
                  ) : <p className="codex-analysis-empty">이슈 본문만으로 특정하기 어렵습니다.</p>}
                  <h4 className="codex-analysis-subheading">예상 수정 영역</h4>
                  {codexAnalysis.likelyAreas.length > 0 ? (
                    <ul>{codexAnalysis.likelyAreas.map((area: any) => <li key={area}>{area}</li>)}</ul>
                  ) : <p className="codex-analysis-empty">확정할 수 있는 파일 정보가 없습니다.</p>}
                </div>
              </div>
              {codexAnalysis.risks.length > 0 && (
                <div className="codex-analysis-risks"><h4>주의할 점</h4><ul>{codexAnalysis.risks.map((risk: any) => <li key={risk}>{risk}</li>)}</ul></div>
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
      {showContributionExpectations && (
        <dialog
          ref={expectationsDialogRef}
          className="contribution-expectations-dialog"
          aria-labelledby="contribution-expectations-heading"
          aria-describedby="contribution-expectations-description"
          onCancel={event => {
            event.preventDefault();
            closeContributionExpectations();
          }}
        >
          <header className="contribution-expectations-header">
            <div>
              <span>첫 기여 안내</span>
              <h2 id="contribution-expectations-heading">기여 전, 이것만은 알고 시작해요</h2>
            </div>
            <button type="button" onClick={closeContributionExpectations} aria-label="협업 안내 닫기">×</button>
          </header>

          <p id="contribution-expectations-description" className="contribution-expectations-intro">
            오픈소스는 회사 업무와 다른 속도로 움직입니다. 현실적인 기대를 갖고 시작하면 기다리는 과정도 훨씬 편해져요.
          </p>

          <ol className="contribution-expectations-list">
            <li>
              <strong>대부분 비동기로 협업해요</strong>
              <span>메인테이너와 기여자는 각자의 일정과 시간대에 맞춰 참여합니다.</span>
            </li>
            <li>
              <strong>리뷰에는 정해진 기한이 없어요</strong>
              <span>답변은 몇 주에서 수개월, 경우에 따라 1년 이상 걸리거나 오지 않을 수도 있습니다.</span>
            </li>
            <li>
              <strong>느린 답변이 거절을 의미하진 않아요</strong>
              <span>프로젝트의 인력과 우선순위 때문인 경우가 많으니 기여의 가치와 연결 짓지 않아도 됩니다.</span>
            </li>
          </ol>

          <div className="contribution-expectations-tip">
            <Icons.Check className="w-4 h-4 shrink-0" />
            <span><strong>답변을 기다릴 때</strong> 기여 규칙을 먼저 확인하고, 충분한 시간이 지난 뒤 정중하게 한 번만 후속 댓글을 남겨보세요.</span>
          </div>

          <footer className="contribution-expectations-footer">
            <label>
              <input
                type="checkbox"
                checked={hideContributionExpectations}
                onChange={event => setHideContributionExpectations(event.target.checked)}
              />
              다음부터 이 안내 보지 않기
            </label>
            <button type="button" onClick={closeContributionExpectations} autoFocus>
              확인했어요, 이슈 둘러보기
            </button>
          </footer>
        </dialog>
      )}

      <div className="space-y-6">
        <div className="page-heading page-heading-with-action pb-2">
          <div>
            <h2 className="text-xl font-bold text-[#1f2933]">첫 기여 찾기</h2>
            <p className="text-xs text-[#57606a]">
              처음이라면 STEP 1부터 시작하고, 익숙해지면 다음 단계의 기여로 넘어가 보세요.
            </p>
          </div>
          <button type="button" className="contribution-expectations-open" onClick={openContributionExpectations}>
            <Icons.BookOpen className="w-4 h-4" /> 오픈소스 협업 안내
          </button>
        </div>

        <div className="feature-source-tabs" role="tablist" aria-label="첫 기여 찾기 방식">
          {[
            ["category", "단계별 추천"],
            ["personalized", "내 맞춤 프로젝트"],
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

        {featureSourceMode === "personalized" ? (
          <PersonalizedRepositoryRecommendations
            user={authUser}
            authLoading={authLoading}
            onExploreRepository={openPersonalizedRepository}
          />
        ) : featureSourceMode === "category" ? (
          <div className="category-recommendation-flow">
            <section className="contribution-growth" aria-labelledby="contribution-growth-heading">
              <div className="contribution-growth-heading">
                <div>
                  <span>첫 기여 성장 경로</span>
                  <h3 id="contribution-growth-heading">내가 시작할 작업 유형을 선택하세요</h3>
                </div>
                <p>단계는 권장 순서이며, 익숙한 유형부터 시작해도 괜찮습니다.</p>
              </div>

              <ol className="contribution-category-list">
                {CONTRIBUTION_CATEGORIES.map(category => (
                  <li key={category.id}>
                    <button
                      type="button"
                      aria-pressed={selectedContributionCategory === category.id}
                      onClick={() => selectContributionCategory(category.id)}
                      className={`contribution-category-card ${selectedContributionCategory === category.id ? "contribution-category-card-active" : ""}`}
                    >
                      <span className="contribution-category-stage">
                        STEP {category.stage}{category.id === "documentation" ? " · 첫 기여 추천" : ""}
                      </span>
                      <strong>{category.title}</strong>
                      <small>{category.stageLabel}</small>
                      <p>{category.description}</p>
                    </button>
                  </li>
                ))}
              </ol>

              <div className="filter-panel p-3 space-y-2">
                <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider">
                  먼저 기여할 언어를 선택하세요
                </span>
                <LanguageFilterBar
                  selectedLanguage={selectedContributionLanguage}
                  onChange={selectContributionLanguage}
                  languages={contributionLanguageOptions}
                  ariaLabel={`${activeContributionCategory.title} 추천 언어 선택`}
                />
                <p className="text-[11px] text-[#6e7781]">
                  DeepWiki에 등록된 오픈소스 프로젝트에서 선택한 언어의 추천 이슈를 찾습니다.
                </p>
              </div>

              <div className="category-selection-note" role="status">
                {selectedContributionLanguage
                  ? <Icons.Check className="w-4 h-4 shrink-0" />
                  : <Icons.Alert className="w-4 h-4 shrink-0" />}
                <span>
                  <strong>
                    {selectedContributionLanguage
                      ? `${selectedContributionLanguage} · ${activeContributionCategory.title}`
                      : `${activeContributionCategory.title} 언어 선택 대기`}
                  </strong>
                  {!selectedContributionLanguage
                    ? "위에서 언어를 선택하면 추천 탐색을 시작합니다."
                    : selectedContributionCategory === "documentation"
                      ? "선택한 언어의 검증된 한국어 번역 저장소에서 최근 변경 문서를 비교합니다."
                      : "프로젝트 크기와 관계없이 입문 난이도 우선 · 담당자·연관 PR·작업 의사 댓글 없음 기준으로 선별합니다."}
                </span>
              </div>
            </section>

            {selectedContributionCategory === "documentation" && selectedContributionLanguage && (
              <TranslationPage embedded showLanguageFilter={false} />
            )}

            {selectedContributionCategory !== "documentation" && selectedContributionLanguage && categoryIssuesLoading && (
              <div className="recommendation-status" role="status">
                <span className="recommendation-status-spinner" aria-hidden="true" />
                <div>
                  <strong>활동 중인 저장소에서 {activeContributionCategory.title} 이슈를 찾고 있습니다.</strong>
                  <span>DeepWiki 후보의 최근 활동, 이슈 난이도, 담당자, 연관 PR과 작업 의사 댓글을 함께 확인합니다.</span>
                </div>
              </div>
            )}

            {selectedContributionCategory !== "documentation" && selectedContributionLanguage && categoryIssuesError && !categoryIssuesLoading && (
              <div className="recommendation-status recommendation-status-error" role="alert">
                <Icons.Alert className="w-4 h-4 shrink-0" />
                <div><strong>추천 이슈를 불러오지 못했습니다.</strong><span>{categoryIssuesError}</span></div>
                <button type="button" onClick={refreshCategoryRecommendations}>다시 시도</button>
              </div>
            )}

            {selectedContributionCategory !== "documentation" && selectedContributionLanguage && !categoryIssuesLoading && !categoryIssuesError && (
              <>
                <div className="category-result-heading">
                  <div>
                    <span>선택한 카테고리</span>
                    <h3>{activeContributionCategory.title} 추천 이슈</h3>
                    <p>{activeContributionCategory.description}</p>
                  </div>
                  <div className="recommendation-sync-summary">
                    <span>총 <strong>{categoryIssues.length}개</strong> 추천</span>
                    {categoryLoadedAtText && <small>{categoryLoadedAtText} 확인</small>}
                    <button type="button" onClick={refreshCategoryRecommendations}>새로고침</button>
                  </div>
                </div>

                {categoryRecommendationCriteria && (
                  <div className="category-catalog-stats" role="status" aria-label="추천 후보 탐색 범위">
                    <div>
                      <strong>{categoryRecommendationCriteria.catalogRepositoryCount || 0}</strong>
                      <span>전체 카탈로그</span>
                    </div>
                    <div>
                      <strong>{categoryRecommendationCriteria.languageCandidateCount || 0}</strong>
                      <span>{selectedContributionLanguage} 후보</span>
                    </div>
                    <div>
                      <strong>{categoryRecommendationCriteria.inspectedRepositoryCount || 0}</strong>
                      <span>이번에 검사</span>
                    </div>
                    <div>
                      <strong>{categoryRecommendationCriteria.matchedRepositoryCount || 0}</strong>
                      <span>추천 이슈 보유</span>
                    </div>
                  </div>
                )}

                {categoryRepositories.length > 0 && (
                  <section className="category-repository-section" aria-labelledby="category-repository-heading">
                    <div className="category-repository-heading">
                      <h4 id="category-repository-heading">이번 탐색에서 확인한 오픈소스 프로젝트</h4>
                      <span>조건을 통과한 이슈가 0개인 저장소도 숨기지 않고 검사 결과를 표시합니다.</span>
                    </div>
                    <div className="category-repository-list">
                      {categoryRepositories.map((repo: any) => (
                        <div key={repo.fullName} className="category-repository-card">
                          <img src={repo.ownerAvatarUrl} alt="" />
                          <span>
                            <a href={repo.url} target="_blank" rel="noreferrer"><strong>{repo.fullName}</strong></a>
                            <small>
                              {repo.language} · 조건 통과 이슈 {repo.issueCount}개
                              {repo.contributorFriendliness?.label ? ` · 기여 친화도 ${repo.contributorFriendliness.label}` : ""}
                            </small>
                          </span>
                          <span className={`repository-health-status repository-health-${repo.activity?.level || "unknown"}`}>
                            <i aria-hidden="true" />
                            {repo.activity?.label || "확인 불가"}
                          </span>
                          {repo.deepWikiUrl && (
                            <a className="category-repository-deepwiki" href={repo.deepWikiUrl} target="_blank" rel="noreferrer">
                              DeepWiki로 코드 익히기 <Icons.ArrowRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {categoryRecommendationFailures.length > 0 && (
                  <div className="recommendation-partial-notice" role="status">
                    일부 후보 저장소를 확인하지 못해 현재 검증된 저장소의 이슈만 표시합니다.
                  </div>
                )}

                <div className="category-result-tools">
                  <div className="relative w-full md:max-w-md">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><Icons.Search className="w-4 h-4" /></span>
                    <input
                      type="text"
                      value={featureRepoSearch}
                      onChange={event => setFeatureRepoSearch(event.target.value)}
                      placeholder={`${activeContributionCategory.title} 이슈 안에서 검색`}
                      className="search-input w-full bg-white border focus:border-[#3f6fd9] focus:ring-1 focus:ring-[#3f6fd9] pl-9 pr-4 py-2 text-xs text-[#1f2933] outline-none placeholder:text-slate-400"
                    />
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
                  showLanguage={false}
                  showIssueType={false}
                />
                <IssueRecommendationGrid
                  issues={filteredFeatureIssues}
                  interestedTasks={interestedTasks}
                  onSelectIssue={selectIssue}
                  onToggleInterest={toggleTaskInterest}
                  emptyText={categoryIssues.length === 0
                    ? `${selectedContributionLanguage} 후보 ${categoryRecommendationCriteria?.languageCandidateCount || 0}개 중 이번에 ${categoryRecommendationCriteria?.inspectedRepositoryCount || 0}개를 검사했지만, 담당자·연결 PR·작업 의사 댓글이 없는 ${activeContributionCategory.title} 이슈를 찾지 못했습니다.`
                    : "현재 필터에 맞는 이슈가 없습니다."}
                />
              </>
            )}
          </div>
        ) : featureSourceMode === "repository" ? (
          <div className="space-y-5">
            <section className="issue-import-panel" aria-labelledby="repository-search-heading">
              <h3 id="repository-search-heading">저장소 추천 이슈 찾기</h3>
              <p>GitHub의 <code>owner/repository</code> 이름을 입력하면 담당자·연관 Pull Request·작업 의사 댓글이 없는 열린 이슈를 선별합니다.</p>
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
                <div><strong>저장소의 열린 이슈를 확인하고 있습니다.</strong><span>라벨, 난이도, 담당자, 연결 PR과 작업 의사 댓글을 기준으로 정렬합니다.</span></div>
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
