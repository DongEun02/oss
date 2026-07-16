import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOssApp } from "../app/OssAppContext.jsx";
import { Icons } from "../components/Icons.jsx";
import { LanguageFilterBar } from "../components/LanguageFilterBar.jsx";
import { formatGithubDate, getRepoVisual, TRANSLATION_PROJECTS } from "../data/content.js";

export function TranslationPage() {
  const navigate = useNavigate();
  const { repoKey, docId } = useParams();
  const {
    selectedRepo,
    setSelectedRepo,
    selectedDocId,
    setSelectedDocId,
    translationChecked,
    setTranslationChecked,
    translationSearch,
    setTranslationQuery,
    translationLanguage,
    setTranslationLanguage,
    translationStatuses,
    translationStatusLoading,
    translationStatusLoaded,
    translationStatusError,
    translationStatusStale,
    bookmarks,
    interestedTasks,
    refreshTranslationStatuses,
    toggleBookmark,
    toggleTaskInterest,
    filteredTranslationTasks,
    translationStatusGeneratedAtText,
    selectedTranslationProject,
    selectedTranslationDoc,
    selectedTranslationStatus
  } = useOssApp();
  const isDetail = !!repoKey && !!docId;

  useEffect(() => {
    if (!isDetail) return;
    const project = TRANSLATION_PROJECTS[repoKey];
    if (!project) {
      navigate("/translations", { replace: true });
      return;
    }
    const document = project.docs.find(item => item.id === docId);
    if (!document) {
      navigate(`/translations/${repoKey}/${project.docs[0].id}`, { replace: true });
      return;
    }
    setSelectedRepo(repoKey);
    setSelectedDocId(docId);
  }, [docId, isDetail, navigate, repoKey, setSelectedDocId, setSelectedRepo]);

  return (
    <div className="space-y-5 animate-fade-in">
      {!isDetail && (
        <div className="space-y-6">
          <div className="page-heading pb-2">
            <h2 className="text-xl font-bold text-[#1f2933]">번역 작업 추천</h2>
            <p className="text-xs text-[#57606a]">원문과 차이가 있는 문서를 작업 단위로 확인합니다.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Icons.Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={translationSearch}
                onChange={event => setTranslationQuery(event.target.value)}
                placeholder="번역 문서, 저장소 검색"
                className="search-input w-full bg-white border focus:border-[#3f6fd9] focus:ring-1 focus:ring-[#3f6fd9] pl-9 pr-4 py-2 text-xs text-[#1f2933] outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="text-xs text-[#57606a] font-medium">
              총 <span className="text-[#3f6fd9] font-bold">{filteredTranslationTasks.length}개</span>의 추천 작업
            </div>
          </div>

          <div className="filter-panel p-3 space-y-2">
            <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider">언어 필터</span>
            <LanguageFilterBar selectedLanguage={translationLanguage} onChange={setTranslationLanguage} />
          </div>

          {translationStatusLoading && (
            <div className="recommendation-status" role="status">
              <span className="recommendation-status-spinner" aria-hidden="true" />
              <div>
                <strong>실제 문서의 번역 상태를 확인하고 있습니다.</strong>
                <span>GitHub의 영문 원문과 한국어 문서를 가져와 의미상 차이를 비교합니다.</span>
              </div>
            </div>
          )}

          {translationStatusError && !translationStatusLoading && (
            <div className="recommendation-status recommendation-status-error" role="alert">
              <Icons.Alert className="w-4 h-4 shrink-0" />
              <div>
                <strong>번역 상태를 확인하지 못했습니다.</strong>
                <span>{translationStatusError}</span>
              </div>
              <button type="button" className="translation-status-refresh" onClick={refreshTranslationStatuses}>
                <Icons.Refresh className="w-3.5 h-3.5" />
                다시 확인
              </button>
            </div>
          )}

          {translationStatusLoaded && !translationStatusError && !translationStatusLoading && (
            <div className="translation-live-status">
              <span><i aria-hidden="true" />{translationStatusStale ? "캐시된 비교 결과" : "GitHub 문서 비교 완료"} · {translationStatusGeneratedAtText}</span>
              <button type="button" onClick={refreshTranslationStatuses} title="번역 상태 새로고침">
                <Icons.Refresh className="w-3.5 h-3.5" />
                <span>새로고침</span>
              </button>
            </div>
          )}

          <div className="contribution-list">
            {filteredTranslationTasks.length > 0 ? filteredTranslationTasks.map(task => (
              <article
                key={task.id}
                className="contribution-item"
                onClick={() => navigate(`/translations/${task.repoKey}/${task.docId}`)}
              >
                <div
                  className="contribution-cover"
                  style={{ background: getRepoVisual(task.repo).background }}
                  aria-hidden="true"
                >
                  <span className="contribution-cover-label">번역 기여 추천</span>
                  <img src={getRepoVisual(task.repo).image} alt="" />
                  <span className="contribution-cover-kind"><Icons.FileText className="w-3.5 h-3.5" /> 문서</span>
                </div>

                <div className="contribution-main">
                  <div className="contribution-eyebrow">
                    <span>{task.repo}</span><span>·</span><span className="contribution-kind">문서 번역</span>
                  </div>
                  <h3 className="contribution-title">{task.title}</h3>
                  <p className="contribution-summary">{task.summary}</p>
                  <div className="contribution-meta">
                    <span className={`contribution-chip translation-task-status translation-task-status-${task.status}`}>
                      {task.statusText}
                    </span>
                    {task.languageTags.map(language => (
                      <span key={`${task.id}-${language}`} className="contribution-chip">{language}</span>
                    ))}
                    {task.techs.filter(tech => !task.languageTags.includes(tech)).map(tech => (
                      <span key={`${task.id}-${tech}`} className="contribution-chip">{tech}</span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={interestedTasks[task.id] ? `${task.title} 관심 해제` : `${task.title} 관심 추가`}
                  onClick={event => {
                    event.stopPropagation();
                    toggleTaskInterest(task, "translation");
                  }}
                  className={`interest-button ${interestedTasks[task.id] ? "interest-button-active" : ""}`}
                >
                  <Icons.Bookmark filled={!!interestedTasks[task.id]} className="w-4 h-4" />
                </button>
              </article>
            )) : (
              <div className="empty-list">현재 조건에 맞는 번역 작업이 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {isDetail && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <button
              type="button"
              onClick={() => navigate("/translations")}
              className="inline-flex items-center gap-1 text-xs text-[#3f6fd9] font-semibold hover:underline"
            >
              <Icons.ArrowLeft className="w-3 h-3 text-[#3f6fd9]" />
              번역 작업 목록으로 돌아가기
            </button>
          </div>

          <div className="border-b border-[#d0d7de] pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white border border-[#d0d7de] p-2 rounded-md shadow-sm">
                <Icons.Github className="w-5 h-5 text-[#24292f]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#24292f]">{selectedTranslationProject.name}</h2>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(selectedTranslationProject.name)}
                    className="text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    <Icons.Bookmark filled={bookmarks[selectedTranslationProject.name]} className="w-4 h-4 text-amber-500" />
                  </button>
                </div>
                <p className="text-xs text-[#57606a]">{selectedTranslationProject.description}</p>
              </div>
            </div>
          </div>

          <div className="translation-detail-layout">
            <div className="translation-detail-sidebar space-y-3">
              <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">번역 대상 가이드 문서</span>
              <div className="space-y-1.5">
                {selectedTranslationProject.docs.map(document => {
                  const liveDocument = translationStatuses[`translation-${selectedRepo}-${document.id}`];
                  const status = liveDocument?.status || "checking";
                  return (
                    <button
                      type="button"
                      key={document.id}
                      onClick={() => navigate(`/translations/${selectedRepo}/${document.id}`)}
                      className={`w-full text-left px-3.5 py-3 rounded-md border transition-all ${
                        selectedDocId === document.id
                          ? "bg-white border-[#d0d7de] ring-1 ring-[#3f6fd9] shadow-sm"
                          : "bg-[#f6f8fa] border-[#d0d7de] hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <h4 className="text-xs font-bold text-[#24292f] mb-1.5">{document.title}</h4>
                      <span className={`translation-detail-status translation-detail-status-${status}`}>
                        {liveDocument?.statusText || (translationStatusError ? "확인 실패" : "상태 확인 중")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white border border-[#d0d7de] rounded-md p-4 space-y-2 shadow-sm">
                <h5 className="text-xs font-bold text-[#24292f] flex items-center gap-1.5">번역 PR 작성 팁</h5>
                <p className="text-[11px] text-[#57606a] leading-relaxed">
                  용어는 저장소 전체에서 일관되게 유지하세요. `Repository`처럼 자주 나오는 단어는 기존 번역 방식을 먼저 확인하는 편이 안전합니다.
                </p>
              </div>
            </div>

            <div className="translation-detail-main space-y-4">
              <section className="translation-analysis-card">
                <header className="translation-analysis-header">
                  <div><span>실제 GitHub 문서 비교</span><strong>{selectedTranslationDoc.title}</strong></div>
                  <span className={`translation-detail-status translation-detail-status-${selectedTranslationStatus?.status || "checking"}`}>
                    {selectedTranslationStatus?.statusText || (translationStatusError ? "확인 실패" : "상태 확인 중")}
                  </span>
                </header>

                {translationStatusLoading && (
                  <div className="translation-analysis-pending" role="status">
                    <span className="recommendation-status-spinner" aria-hidden="true" />
                    <p>영문 원문과 한국어 번역본의 의미상 차이를 비교하고 있습니다.</p>
                  </div>
                )}

                {translationStatusError && !translationStatusLoading && (
                  <div className="translation-analysis-error" role="alert">
                    <Icons.Alert className="w-4 h-4" />
                    <p>{translationStatusError}</p>
                    <button type="button" onClick={refreshTranslationStatuses}>다시 확인</button>
                  </div>
                )}

                {selectedTranslationStatus && !translationStatusLoading && (
                  <div className="translation-analysis-content">
                    <div className="translation-analysis-summary">
                      <span>판정 근거 · 신뢰도 {selectedTranslationStatus.confidence}</span>
                      <p>{selectedTranslationStatus.summary}</p>
                    </div>

                    {selectedTranslationStatus.missingSections.length > 0 && (
                      <div className="translation-missing-sections">
                        <span>확인이 필요한 내용</span>
                        <ul>{selectedTranslationStatus.missingSections.map(section => <li key={section}>{section}</li>)}</ul>
                      </div>
                    )}

                    <div className="translation-source-list">
                      <a href={selectedTranslationStatus.source.url} target="_blank" rel="noreferrer">
                        <div>
                          <span>영문 원문</span>
                          <strong>{selectedTranslationStatus.source.repo}</strong>
                          <code>{selectedTranslationStatus.source.path}</code>
                        </div>
                        <em>{formatGithubDate(selectedTranslationStatus.source.committedAt)} · {selectedTranslationStatus.source.commitSha.slice(0, 7)}</em>
                        <Icons.ArrowRight className="w-3.5 h-3.5" />
                      </a>
                      <a href={selectedTranslationStatus.translation.url} target="_blank" rel="noreferrer">
                        <div>
                          <span>한국어 번역본</span>
                          <strong>{selectedTranslationStatus.translation.repo}</strong>
                          <code>{selectedTranslationStatus.translation.path}</code>
                        </div>
                        <em>{formatGithubDate(selectedTranslationStatus.translation.committedAt)} · {selectedTranslationStatus.translation.commitSha.slice(0, 7)}</em>
                        <Icons.ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="translation-detail-checklist space-y-4">
              <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">번역 패치 기여 로드맵</span>
              <div className="bg-white border border-[#d0d7de] rounded-md p-4 space-y-4 shadow-sm">
                <span className="text-xs font-bold text-[#24292f] block pb-2 border-b border-[#d0d7de]">실시간 기여 체크리스트</span>
                <div className="space-y-3">
                  {Object.keys(translationChecked).map(key => (
                    <label
                      key={key}
                      className="flex items-start gap-2.5 cursor-pointer select-none text-xs"
                      onClick={() => setTranslationChecked(previous => ({ ...previous, [key]: !previous[key] }))}
                    >
                      <input
                        type="checkbox"
                        checked={translationChecked[key]}
                        readOnly
                        className="mt-0.5 rounded border-[#d0d7de] text-[#3f6fd9] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className={`leading-relaxed ${translationChecked[key] ? "line-through text-slate-400" : "text-[#24292f] font-medium"}`}>
                        {key === "fork" && "오픈소스 레포지토리 Fork 생성"}
                        {key === "clone" && "로컬 컴퓨터에 git clone 및 환경 매칭"}
                        {key === "branch" && "새 작업 브랜치 개설"}
                        {key === "edit" && "비교 결과와 실제 원문을 기준으로 번역 수정"}
                        {key === "pr" && "기여 원격 브랜치에 문서 PR 생성 완료"}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="pt-3 border-t border-[#d0d7de]">
                  <div className="bg-[#eef3ff] text-[#3f6fd9] text-[10px] p-2.5 rounded border border-[#d5e0f8] font-semibold leading-relaxed">
                    체크리스트는 작업 순서를 기록하기 위한 용도입니다. 제출 전 해당 저장소의 기여 규칙을 다시 확인하세요.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
