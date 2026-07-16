import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useOssApp } from "../app/OssAppContext.jsx";
import { Icons } from "../components/Icons.jsx";

export function ContributionGuidePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { owner, repository } = useParams();
  const {
    guideSourceMode,
    setGuideSourceMode,
    guideRepoKey,
    setGuideRepoKey,
    guideSearchQuery,
    setGuideSearchQuery,
    guideRepositoryQuery,
    setGuideRepositoryQuery,
    guideRepositoryResult,
    guideRepositorySearchLoading,
    guideRepositorySearchError,
    setGuideRepositorySearchError,
    guideCompletedChecklist,
    setGuideCompletedChecklist,
    guideRepositories,
    guideRepositoriesLoading,
    setGuideRepositoriesLoaded,
    guideRepositoriesError,
    setGuideRepositoriesError,
    guideDetailLoading,
    guideDetailError,
    setGuideDetailError,
    setGuideDetailRefreshVersion,
    triggerToast,
    handleCopyToClipboard,
    searchContributionGuide,
    filteredGuideRepos,
    selectedGuideRepository,
    selectedGuideResult
  } = useOssApp();
  const routeRepository = owner && repository ? `${owner}/${repository}` : "";

  useEffect(() => {
    if (!routeRepository) return;
    setGuideSourceMode(location.state?.source === "trending" ? "trending" : "repository");
    setGuideRepositoryQuery(routeRepository);
    setGuideRepoKey(routeRepository);
    setGuideRepositorySearchError("");
    setGuideDetailError("");
  }, [location.state, routeRepository, setGuideDetailError, setGuideRepoKey, setGuideRepositoryQuery, setGuideRepositorySearchError, setGuideSourceMode]);

  const selectTrendingRepository = fullName => {
    setGuideSourceMode("trending");
    setGuideRepoKey(fullName);
    setGuideDetailError("");
    navigate(`/guides/${fullName}`, { state: { source: "trending" } });
  };

  const submitRepositorySearch = async event => {
    const result = await searchContributionGuide(event);
    if (result?.repository?.fullName) navigate(`/guides/${result.repository.fullName}`);
  };

  const targetRepo = selectedGuideResult?.repository
    ? {
        ...selectedGuideRepository,
        ...selectedGuideResult.repository,
        trendingRank: selectedGuideRepository?.trendingRank
          || selectedGuideResult.repository.trendingRank
      }
    : selectedGuideRepository;
  const guide = selectedGuideResult?.guide;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-[#d0d7de] pb-4">
        <h2 className="text-xl font-bold text-[#24292f]">기여 가이드</h2>
        <p className="text-xs text-[#57606a]">
          <a
            href="https://github.com/trending?since=monthly"
            target="_blank"
            rel="noreferrer"
            className="text-[#3f6fd9] font-semibold hover:underline"
          >
            GitHub 월간 Trending
          </a>{" "}
          오픈소스 목록을 살펴보거나 저장소 이름으로 <code className="bg-[#eaeef2] text-[#24292f] px-1.5 py-0.5 rounded font-mono text-[11px] border border-[#d0d7de]">CONTRIBUTING.md</code>를 직접 찾을 수 있습니다.
        </p>
      </div>

      <div className="feature-source-tabs" role="tablist" aria-label="기여 가이드 찾기 방식">
        <button
          type="button"
          role="tab"
          aria-selected={guideSourceMode === "trending"}
          onClick={() => {
            setGuideSourceMode("trending");
            setGuideRepositorySearchError("");
            setGuideDetailError("");
            const nextRepository = guideRepositories.some(item => item.fullName === guideRepoKey)
              ? guideRepoKey
              : guideRepositories[0]?.fullName || "";
            setGuideRepoKey(nextRepository);
            navigate(nextRepository ? `/guides/${nextRepository}` : "/guides");
          }}
          className={`feature-source-tab ${guideSourceMode === "trending" ? "feature-source-tab-active" : ""}`}
        >
          월간 Trending
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={guideSourceMode === "repository"}
          onClick={() => {
            setGuideSourceMode("repository");
            setGuideRepositorySearchError("");
            setGuideDetailError("");
            const resultName = guideRepositoryResult?.repository.fullName || routeRepository;
            setGuideRepoKey(resultName || "");
            navigate(resultName ? `/guides/${resultName}` : "/guides");
          }}
          className={`feature-source-tab ${guideSourceMode === "repository" ? "feature-source-tab-active" : ""}`}
        >
          저장소로 찾기
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-4">
          {guideSourceMode === "trending" ? (
            <div className="bg-white border border-[#d0d7de] rounded-md p-4 space-y-3 shadow-sm">
              <div className="relative">
                <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400">
                  <Icons.Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={guideSearchQuery}
                  onChange={event => setGuideSearchQuery(event.target.value)}
                  placeholder="레포지토리 검색..."
                  className="w-full bg-[#f6f8fa] border border-[#d0d7de] focus:border-[#3f6fd9] focus:bg-white rounded-md pl-8 pr-3 py-1.5 text-xs text-[#24292f] outline-none"
                />
              </div>

              <div className="divide-y divide-[#d0d7de] space-y-1">
                {guideRepositoriesLoading && (
                  <div className="py-8 text-center text-xs text-[#57606a]">월간 Trending 저장소를 확인하고 있습니다.</div>
                )}
                {guideRepositoriesError && !guideRepositoriesLoading && (
                  <div className="py-5 text-center space-y-3">
                    <p className="text-xs text-[#b42318]">{guideRepositoriesError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setGuideRepositoriesLoaded(false);
                        setGuideRepositoriesError("");
                      }}
                      className="text-xs font-semibold text-[#3f6fd9] hover:underline"
                    >
                      다시 시도
                    </button>
                  </div>
                )}
                {!guideRepositoriesLoading && !guideRepositoriesError && filteredGuideRepos.map(repo => (
                  <button
                    type="button"
                    key={repo.fullName}
                    onClick={() => selectTrendingRepository(repo.fullName)}
                    className={`w-full text-left p-3 rounded-md transition-all flex items-center gap-3 ${
                      guideRepoKey === repo.fullName
                        ? "bg-[#eaeef2] text-slate-900 border border-[#d0d7de] shadow-sm font-semibold"
                        : "text-[#57606a] hover:bg-[#f6f8fa]"
                    }`}
                  >
                    <img src={repo.ownerAvatarUrl} alt="" className="w-8 h-8 rounded-md border border-[#d0d7de] shrink-0" />
                    <span className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-xs block text-[#24292f] truncate">{repo.fullName}</span>
                      <span className="text-[10px] text-[#57606a] block truncate">
                        Trending #{repo.trendingRank} · {repo.language} · {repo.license?.id}
                      </span>
                    </span>
                    <Icons.ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
                {!guideRepositoriesLoading && !guideRepositoriesError && filteredGuideRepos.length === 0 && (
                  <div className="py-8 text-center text-xs text-[#57606a]">검색 결과가 없습니다.</div>
                )}
              </div>
            </div>
          ) : (
            <section className="guide-repository-search-panel" aria-labelledby="guide-repository-search-heading">
              <h3 id="guide-repository-search-heading">저장소 기여 가이드 찾기</h3>
              <p><code>owner/repository</code> 이름으로 공식 기여 문서를 불러옵니다.</p>

              <form className="guide-repository-search-form" onSubmit={submitRepositorySearch}>
                <div className="issue-import-input-wrap">
                  <Icons.Github className="w-4 h-4" />
                  <input
                    type="text"
                    value={guideRepositoryQuery}
                    onChange={event => {
                      setGuideRepositoryQuery(event.target.value);
                      setGuideRepositorySearchError("");
                    }}
                    placeholder="vercel/next.js"
                    aria-label="기여 가이드 저장소 이름"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="issue-import-input"
                  />
                </div>
                <button type="submit" className="issue-import-submit" disabled={guideRepositorySearchLoading}>
                  {guideRepositorySearchLoading ? "불러오는 중" : "가이드 불러오기"}
                  {!guideRepositorySearchLoading && <Icons.ArrowRight className="w-3.5 h-3.5 text-white" />}
                </button>
              </form>

              {guideRepositorySearchError && (
                <div className="issue-import-error" role="alert">
                  <Icons.Alert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{guideRepositorySearchError}</span>
                </div>
              )}

              <div className="issue-import-note">
                공개 상태이며 라이선스와 공식 <code>CONTRIBUTING.md</code>가 확인되는 저장소만 지원합니다.
              </div>

              {guideRepositoryResult && (
                <div className="guide-repository-result">
                  <img src={guideRepositoryResult.repository.ownerAvatarUrl} alt="" />
                  <div>
                    <strong>{guideRepositoryResult.repository.fullName}</strong>
                    <span>{guideRepositoryResult.repository.language} · {guideRepositoryResult.repository.license.id}</span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="lg:col-span-8">
          {((guideSourceMode === "trending" && guideRepositoriesLoading) || guideDetailLoading || guideRepositorySearchLoading) && (
            <div className="bg-white border border-[#d0d7de] rounded-md p-10 text-center text-[#57606a] space-y-2">
              <span className="recommendation-status-spinner inline-block" aria-hidden="true" />
              <p className="text-xs">공식 기여 문서를 읽고 한국어로 정리하고 있습니다.</p>
            </div>
          )}

          {guideDetailError && !selectedGuideResult && !guideDetailLoading && !guideRepositorySearchLoading && (
            <div className="bg-white border border-[#d0d7de] rounded-md p-8 text-center space-y-3">
              <p className="text-xs text-[#b42318]">{guideDetailError}</p>
              <button
                type="button"
                onClick={() => {
                  setGuideDetailError("");
                  setGuideDetailRefreshVersion(version => version + 1);
                }}
                className="text-xs font-semibold text-[#3f6fd9] hover:underline"
              >
                다시 시도
              </button>
            </div>
          )}

          {!targetRepo && !guide && !guideDetailLoading && !guideRepositorySearchLoading && !guideDetailError && (
            <div className="bg-white border border-[#d0d7de] rounded-md p-8 text-center text-[#57606a]">
              {guideSourceMode === "trending"
                ? "왼쪽 목록에서 기여 가이드를 선택해 주세요."
                : "왼쪽에 저장소 이름을 입력해 기여 가이드를 불러오세요."}
            </div>
          )}

          {targetRepo && guide && !guideDetailLoading && !guideRepositorySearchLoading && (
            <div className="bg-white border border-[#d0d7de] rounded-md shadow-sm overflow-hidden">
              <div className="bg-[#f6f8fa] border-b border-[#d0d7de] px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Icons.FileText className="w-4 h-4 shrink-0 text-[#57606a]" />
                  <span className="text-xs font-mono font-bold text-[#24292f] truncate">CONTRIBUTING.md 한국어 핵심 정리</span>
                </div>
                <a
                  href={targetRepo.contributionGuideUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link-action shrink-0 inline-flex items-center justify-center gap-1.5 bg-white font-bold text-xs px-3 py-1.5 rounded-md border transition-colors"
                >
                  원문 열기
                  <Icons.ArrowRight className="w-3 h-3 text-[#3f6fd9]" />
                </a>
              </div>

              <div className="p-6 space-y-6">
                <div className="border-b border-[#d0d7de] pb-4 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-[#57606a]">
                    {targetRepo.trendingRank && <span>월간 Trending #{targetRepo.trendingRank}</span>}
                    {targetRepo.trendingRank && <span>·</span>}
                    <span>{targetRepo.language}</span>
                    <span>·</span>
                    <span>{targetRepo.license?.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#24292f]">{targetRepo.fullName} 기여 가이드</h3>
                  <p className="text-xs text-[#57606a]">{targetRepo.description}</p>
                  <p className="text-xs text-[#24292f] leading-relaxed">{guide.summaryKo}</p>
                </div>

                {guide.branchPattern && (
                  <GuideCodeBlock
                    title="작업용 권장 브랜치 유형"
                    value={guide.branchPattern}
                    onCopy={() => handleCopyToClipboard(guide.branchPattern, "브랜치명")}
                  />
                )}
                {guide.commitConvention && (
                  <GuideCodeBlock
                    title="권장 커밋 헤더 메시지"
                    value={guide.commitConvention}
                    onCopy={() => handleCopyToClipboard(guide.commitConvention, "커밋 메시지")}
                  />
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#57606a] uppercase">기여 프로세스 핵심 단계</h4>
                  <div className="space-y-3">
                    {guide.steps.map((step, index) => (
                      <div key={`${step.title}-${index}`} className="flex gap-3 items-start bg-[#f6f8fa] p-3.5 rounded border border-[#d0d7de]">
                        <span className="text-xs font-bold bg-[#24292f] text-white px-2 py-0.5 rounded">{index + 1}</span>
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-[#24292f]">{step.title}</h5>
                          <p className="text-[11px] text-[#57606a] leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5 border-t border-[#d0d7de] space-y-3">
                  <h4 className="text-xs font-bold text-[#57606a] uppercase">제출 전 최종 체크리스트</h4>
                  <div className="space-y-2">
                    {guide.checklist.map((item, index) => {
                      const checkedKey = `${guideRepoKey}-${index}`;
                      const isChecked = !!guideCompletedChecklist[checkedKey];
                      return (
                        <label key={`${item}-${index}`} className="flex items-start gap-2.5 p-2 rounded hover:bg-[#f6f8fa] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setGuideCompletedChecklist(previous => ({ ...previous, [checkedKey]: !previous[checkedKey] }))}
                            className="mt-0.5 rounded border-[#d0d7de] text-[#3f6fd9] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className={`text-xs transition-all ${isChecked ? "line-through text-slate-400" : "text-[#24292f]"}`}>
                            {item}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#d0d7de] flex justify-end">
                  <button
                    type="button"
                    onClick={() => triggerToast(`'${targetRepo.fullName}' 기여 준비 항목을 확인했습니다.`)}
                    className="bg-[#3f6fd9] hover:bg-[#3158b0] text-white font-bold text-xs px-4 py-2 rounded-md shadow-sm border border-[rgba(27,31,36,0.15)] flex items-center gap-1.5 transition-all"
                  >
                    기여 준비 확인
                    <Icons.ArrowRight className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GuideCodeBlock({ title, value, onCopy }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-[#57606a] uppercase">{title}</h4>
        <button type="button" onClick={onCopy} className="text-xs text-[#3f6fd9] hover:underline font-semibold flex items-center gap-1">
          <Icons.Clipboard className="w-3 h-3 text-[#3f6fd9]" />
          복사
        </button>
      </div>
      <div className="bg-[#f6f8fa] border border-[#d0d7de] rounded p-3 font-mono text-[11px] text-[#24292f] break-all overflow-x-auto">
        {value}
      </div>
    </div>
  );
}
