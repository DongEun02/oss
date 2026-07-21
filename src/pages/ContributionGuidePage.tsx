import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOssApp } from "../app/OssAppContext";
import { Icons } from "../components/Icons";

export function ContributionGuidePage() {
  const navigate = useNavigate();
  const { owner, repository } = useParams();
  const {
    guideRepoKey,
    setGuideRepoKey,
    guideRepositoryQuery,
    setGuideRepositoryQuery,
    guideRepositoryResult,
    guideRepositorySearchLoading,
    guideRepositorySearchError,
    setGuideRepositorySearchError,
    guideCompletedChecklist,
    setGuideCompletedChecklist,
    guideDetailLoading,
    guideDetailError,
    setGuideDetailError,
    setGuideDetailRefreshVersion,
    triggerToast,
    handleCopyToClipboard,
    searchContributionGuide,
    selectedGuideResult
  } = useOssApp();
  const routeRepository = owner && repository ? `${owner}/${repository}` : "";

  useEffect(() => {
    if (!routeRepository) return;
    setGuideRepositoryQuery(routeRepository);
    setGuideRepoKey(routeRepository);
    setGuideRepositorySearchError("");
    setGuideDetailError("");
  }, [routeRepository, setGuideDetailError, setGuideRepoKey, setGuideRepositoryQuery, setGuideRepositorySearchError]);

  const submitRepositorySearch = async (event: any) => {
    const result = await searchContributionGuide(event);
    if (result?.repository?.fullName) navigate(`/guides/${result.repository.fullName}`);
  };

  const targetRepo = selectedGuideResult?.repository;
  const guide = selectedGuideResult?.guide;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-[#d0d7de] pb-4">
        <h2 className="text-xl font-bold text-[#24292f]">기여 가이드</h2>
        <p className="text-xs text-[#57606a]">
          저장소 이름을 입력하면 공식 <code className="bg-[#eaeef2] text-[#24292f] px-1.5 py-0.5 rounded font-mono text-[11px] border border-[#d0d7de]">CONTRIBUTING.md</code>를 찾아 한국어로 정리합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-4">
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
        </div>

        <div className="lg:col-span-8">
          {(guideDetailLoading || guideRepositorySearchLoading) && (
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
                  setGuideDetailRefreshVersion((version: any) => version + 1);
                }}
                className="text-xs font-semibold text-[#3f6fd9] hover:underline"
              >
                다시 시도
              </button>
            </div>
          )}

          {!targetRepo && !guide && !guideDetailLoading && !guideRepositorySearchLoading && !guideDetailError && (
            <div className="bg-white border border-[#d0d7de] rounded-md p-8 text-center text-[#57606a]">
              왼쪽에 저장소 이름을 입력해 기여 가이드를 불러오세요.
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
                    {guide.steps.map((step: any, index: any) => (
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
                    {guide.checklist.map((item: any, index: any) => {
                      const checkedKey = `${guideRepoKey}-${index}`;
                      const isChecked = !!guideCompletedChecklist[checkedKey];
                      return (
                        <label key={`${item}-${index}`} className="flex items-start gap-2.5 p-2 rounded hover:bg-[#f6f8fa] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setGuideCompletedChecklist((previous: any) => ({ ...previous, [checkedKey]: !previous[checkedKey] }))}
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

function GuideCodeBlock({ title, value, onCopy }: any) {
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
