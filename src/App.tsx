import React, { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { OssAppProvider } from "./app/OssAppContext";
import { BrandMark, SITE_ICON_DATA_URL } from "./components/BrandMark";
import { Icons } from "./components/Icons";
import { usePersistentState } from "./hooks/usePersistentState";
import {
  matchesLanguage
} from "./data/content";
import { CodeIssuesPage } from "./pages/CodeIssuesPage";
import { ContributionGuidePage } from "./pages/ContributionGuidePage";
import { LandingPage } from "./pages/LandingPage";
import { TranslationPage } from "./pages/TranslationPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { fetchContributionGuide } from "./services/contributionGuide";
import { initializeAnalytics, trackAnalyticsEvent } from "./services/analytics";
import { fetchGithubIssueByUrl } from "./services/githubIssue";
import { fetchRecommendedIssues } from "./services/githubRecommendations";
import { fetchRepositoryIssues } from "./services/repositoryIssues";
import { fetchTrendingRepositories } from "./services/trendingRepositories";
import {
  clearTranslationStatusCache,
  fetchTranslationStatuses,
  indexTranslationProjects,
  indexTranslationStatuses
} from "./services/translationStatus";
import { createWorkspaceItem, WORKSPACE_STATUSES } from "./services/userWorkspace";
import type { WorkspaceItem } from "./services/userWorkspace";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const view = location.pathname.startsWith("/translations")
    ? "translation"
    : location.pathname.startsWith("/issues")
      ? "feature"
      : location.pathname.startsWith("/guides")
        ? "guide"
        : location.pathname.startsWith("/mypage") ? "mypage" : "landing";
  const routeForView: Record<string, string> = {
    landing: "/",
    translation: "/translations",
    feature: "/issues",
    guide: "/guides",
    mypage: "/mypage"
  };
  const setView = (nextView: any) => {
    trackAnalyticsEvent("navigation_click", { destination: nextView });
    navigate(routeForView[nextView] || "/");
  };
  const [myPageStatus, setMyPageStatus] = useState('interested');

  const [selectedRepo, setSelectedRepo] = useState('react');
  const [selectedDocId, setSelectedDocId] = useState('useid');
  const [translationChecked, setTranslationChecked] = usePersistentState("oss:translation-checklist:v1", {
    fork: false, clone: false, branch: false, edit: false, pr: false
  });
  const [translationSearch, setTranslationQuery] = useState("");
  const [translationLanguage, setTranslationLanguage] = useState("All");
  const [translationProjects, setTranslationProjects] = useState<Record<string, any>>({});
  const [translationStatuses, setTranslationStatuses] = useState<Record<string, any>>({});
  const [translationStatusLoading, setTranslationStatusLoading] = useState(false);
  const [translationStatusLoaded, setTranslationStatusLoaded] = useState(false);
  const [translationStatusError, setTranslationStatusError] = useState("");
  const [translationStatusGeneratedAt, setTranslationStatusGeneratedAt] = useState("");
  const [translationStatusStale, setTranslationStatusStale] = useState(false);
  const [translationStatusRefreshVersion, setTranslationStatusRefreshVersion] = useState(0);
  const [translationDiscoverySummary, setTranslationDiscoverySummary] = useState({
    projectCount: 0,
    checkedDocumentCount: 0,
    actionableCount: 0,
    reviewCount: 0,
    failedProjects: [] as Array<{ key: string; name: string }>
  });
  const handledTranslationRefresh = useRef(0);

  useEffect(() => {
    initializeAnalytics();
  }, []);

  const [issueData, setIssueData] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [selectedIssueType, setSelectedIssueType] = useState("All");
  const [featureRepoSearch, setFeatureRepoSearch] = useState("");
  const [featureRepoLanguage, setFeatureRepoLanguage] = useState("All");
  const [featureSourceMode, setFeatureSourceMode] = useState('recommended'); // 'recommended' | 'repository' | 'issue-url'
  const [repositoryQuery, setRepositoryQuery] = useState("");
  const [repositoryIssues, setRepositoryIssues] = useState([]);
  const [repositoryIssueResult, setRepositoryIssueResult] = useState(null);
  const [repositoryIssuesLoading, setRepositoryIssuesLoading] = useState(false);
  const [repositoryIssuesError, setRepositoryIssuesError] = useState("");
  const [issueUrlQuery, setIssueUrlQuery] = useState("");
  const [issueUrlLoading, setIssueUrlLoading] = useState(false);
  const [issueUrlError, setIssueUrlError] = useState("");
  const [codexAnalysis, setCodexAnalysis] = useState(null);
  const [codexAnalysisLoading, setCodexAnalysisLoading] = useState(false);
  const [codexAnalysisError, setCodexAnalysisError] = useState("");
  const [featureIssues, setFeatureIssues] = useState([]);
  const [featureRecommendationsLoading, setFeatureRecommendationsLoading] = useState(false);
  const [featureRecommendationsLoaded, setFeatureRecommendationsLoaded] = useState(false);
  const [featureRecommendationsError, setFeatureRecommendationsError] = useState("");
  const [featureRecommendationsLoadedAt, setFeatureRecommendationsLoadedAt] = useState("");
  const [featureRecommendationFailures, setFeatureRecommendationFailures] = useState([]);
  const [recommendationRefreshVersion, setRecommendationRefreshVersion] = useState(0);

  // Guide Explorer States (New Page)
  const [guideSourceMode, setGuideSourceMode] = useState('trending'); // 'trending' | 'repository'
  const [guideRepoKey, setGuideRepoKey] = useState('');
  const [guideSearchQuery, setGuideSearchQuery] = useState("");
  const [guideRepositoryQuery, setGuideRepositoryQuery] = useState("");
  const [guideRepositoryResult, setGuideRepositoryResult] = useState(null);
  const [guideRepositorySearchLoading, setGuideRepositorySearchLoading] = useState(false);
  const [guideRepositorySearchError, setGuideRepositorySearchError] = useState("");
  const [guideCompletedChecklist, setGuideCompletedChecklist] = usePersistentState("oss:guide-checklist:v1", {});
  const [guideRepositories, setGuideRepositories] = useState([]);
  const [guideRepositoriesLoading, setGuideRepositoriesLoading] = useState(false);
  const [guideRepositoriesLoaded, setGuideRepositoriesLoaded] = useState(false);
  const [guideRepositoriesError, setGuideRepositoriesError] = useState("");
  const [guideDetails, setGuideDetails] = useState<Record<string, any>>({});
  const [guideDetailLoading, setGuideDetailLoading] = useState(false);
  const [guideDetailError, setGuideDetailError] = useState("");
  const [guideDetailRefreshVersion, setGuideDetailRefreshVersion] = useState(0);

  // Global Interactive Utilities
  const [bookmarks, setBookmarks] = usePersistentState<Record<string, boolean>>("oss:repository-bookmarks:v1", {
    "TanStack Query": true,
    "React (공식 한국어 문서)": false,
    "Next.js": false
  });
  const [trackedTasks, setTrackedTasks] = usePersistentState<Record<string, WorkspaceItem>>(
    "oss:workspace-items:v1",
    {}
  );
  const interestedTasks = trackedTasks;
  const [toast, setToast] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, myPageStatus]);

  useEffect(() => {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.type = 'image/svg+xml';
    favicon.href = SITE_ICON_DATA_URL;
    document.title = 'OSS';
  }, []);

  useEffect(() => {
    if (view !== 'feature' || featureSourceMode !== 'recommended' || featureRecommendationsLoaded) return undefined;

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 45_000);
    let active = true;
    setFeatureRecommendationsLoading(true);
    setFeatureRecommendationsError("");
    setFeatureRecommendationFailures([]);

    fetchRecommendedIssues({
      force: recommendationRefreshVersion > 0,
      signal: controller.signal
    })
      .then(result => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setFeatureIssues(result.issues);
        setFeatureRecommendationFailures(result.failedRepositories);
        setFeatureRecommendationsLoadedAt(result.loadedAt);
        setFeatureRecommendationsLoading(false);
        setFeatureRecommendationsLoaded(true);
      })
      .catch(error => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setFeatureRecommendationsError(
          error?.name === 'AbortError'
            ? "추천 이슈를 불러오는 시간이 초과됐습니다."
            : error?.message || "GitHub 추천 이슈를 불러오지 못했습니다."
        );
        setFeatureRecommendationsLoading(false);
        setFeatureRecommendationsLoaded(true);
      });

    return () => {
      active = false;
      clearTimeout(requestTimeout);
      controller.abort();
    };
  }, [view, featureSourceMode, recommendationRefreshVersion]);

  useEffect(() => {
    if (view !== 'guide' || guideSourceMode !== 'trending' || guideRepositoriesLoaded) return undefined;

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 45_000);
    let active = true;
    setGuideRepositoriesLoading(true);
    setGuideRepositoriesError("");

    fetchTrendingRepositories({ signal: controller.signal })
      .then(result => {
        if (!active) return;
        clearTimeout(requestTimeout);
        const repositoriesWithGuides = result.repositories.filter((repo: any) => repo.contributionGuideUrl);
        setGuideRepositories(repositoriesWithGuides);
        setGuideRepoKey(currentKey => (
          repositoriesWithGuides.some((repo: any) => repo.fullName === currentKey)
            ? currentKey
            : repositoriesWithGuides[0]?.fullName || ""
        ));
        setGuideRepositoriesLoading(false);
        setGuideRepositoriesLoaded(true);
      })
      .catch(error => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setGuideRepositoriesError(
          error?.name === 'AbortError'
            ? "월간 Trending 저장소를 불러오는 시간이 초과됐습니다."
            : error?.message || "월간 Trending 저장소를 불러오지 못했습니다."
        );
        setGuideRepositoriesLoading(false);
        setGuideRepositoriesLoaded(true);
      });

    return () => {
      active = false;
      clearTimeout(requestTimeout);
      controller.abort();
    };
  }, [view, guideSourceMode, guideRepositoriesLoaded]);

  useEffect(() => {
    if (view !== 'guide' || !guideRepoKey || guideDetails[guideRepoKey]) return undefined;

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 100_000);
    let active = true;
    setGuideDetailLoading(true);
    setGuideDetailError("");

    fetchContributionGuide(guideRepoKey, { signal: controller.signal })
      .then(result => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setGuideDetails(current => ({ ...current, [guideRepoKey]: result }));
        if (guideSourceMode === 'repository') setGuideRepositoryResult(result);
        setGuideDetailError("");
        setGuideDetailLoading(false);
      })
      .catch(error => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setGuideDetailError(
          error?.name === 'AbortError'
            ? "기여 가이드를 정리하는 시간이 초과됐습니다."
            : error?.message || "기여 가이드를 불러오지 못했습니다."
        );
        setGuideDetailLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(requestTimeout);
      controller.abort();
    };
  }, [view, guideSourceMode, guideRepoKey, guideDetailRefreshVersion]);

  useEffect(() => {
    if (view !== 'translation') return undefined;

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 100_000);
    let active = true;
    const force = translationStatusRefreshVersion > handledTranslationRefresh.current;
    handledTranslationRefresh.current = translationStatusRefreshVersion;
    setTranslationStatusLoading(true);
    setTranslationStatusLoaded(false);
    setTranslationStatusError("");
    setTranslationStatuses({});
    setTranslationProjects({});

    fetchTranslationStatuses({
      language: translationLanguage,
      force,
      signal: controller.signal
    })
      .then(result => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setTranslationStatuses(indexTranslationStatuses(result));
        setTranslationProjects(indexTranslationProjects(result));
        setTranslationDiscoverySummary({
          projectCount: result.projectCount || 0,
          checkedDocumentCount: result.checkedDocumentCount || 0,
          actionableCount: result.actionableCount || 0,
          reviewCount: result.reviewCount || 0,
          failedProjects: result.failedProjects || []
        });
        setTranslationStatusGeneratedAt(result.generatedAt || "");
        setTranslationStatusStale(!!result.stale);
        setTranslationStatusLoading(false);
        setTranslationStatusLoaded(true);
      })
      .catch(error => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setTranslationStatusError(
          error?.name === 'AbortError'
            ? "번역 상태를 확인하는 시간이 초과됐습니다. 다시 시도해 주세요."
            : error?.message || "번역 상태를 확인하지 못했습니다."
        );
        setTranslationStatusLoading(false);
        setTranslationStatusLoaded(true);
      });

    return () => {
      active = false;
      clearTimeout(requestTimeout);
      controller.abort();
    };
  }, [view, translationLanguage, translationStatusRefreshVersion]);

  const refreshTranslationStatuses = () => {
    trackAnalyticsEvent("content_refresh", {
      content_type: "translation",
      language: translationLanguage
    });
    clearTranslationStatusCache(translationLanguage);
    setTranslationProjects({});
    setTranslationStatuses({});
    setTranslationStatusGeneratedAt("");
    setTranslationStatusStale(false);
    setTranslationStatusError("");
    setTranslationStatusLoading(true);
    setTranslationStatusLoaded(false);
    setTranslationStatusRefreshVersion(version => version + 1);
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const toggleBookmark = (repoName: string) => {
    setBookmarks(prev => {
      const updated: Record<string, boolean> = { ...prev, [repoName]: !prev[repoName] };
      triggerToast(updated[repoName] ? `'${repoName}' 가 즐겨찾기에 등록되었습니다.` : `'${repoName}' 즐겨찾기가 해제되었습니다.`);
      return updated;
    });
  };

  const toggleTaskInterest = (task: any, kind: any) => {
    trackAnalyticsEvent("interest_toggle", {
      content_type: kind,
      item_id: task.id,
      action: trackedTasks[task.id] ? "remove" : "add"
    });
    setTrackedTasks(previousItems => {
      if (previousItems[task.id]) {
        const updatedItems = { ...previousItems };
        delete updatedItems[task.id];
        triggerToast(`'${task.titleKo || task.title}' 작업을 관심 목록에서 제외했습니다.`);
        return updatedItems;
      }

      const workspaceItem = createWorkspaceItem(task, kind);
      triggerToast(`'${workspaceItem.title}' 작업을 관심 목록에 추가했습니다.`);
      return { ...previousItems, [task.id]: workspaceItem };
    });
  };

  const updateWorkspaceStatus = (taskId: any, status: any) => {
    const statusLabel = WORKSPACE_STATUSES.find(item => item.value === status)?.label || "진행 상태";
    setTrackedTasks(previousItems => {
      const targetItem = previousItems[taskId];
      if (!targetItem) return previousItems;
      return {
        ...previousItems,
        [taskId]: {
          ...targetItem,
          status,
          updatedAt: new Date().toISOString()
        }
      };
    });
    triggerToast(`${statusLabel}로 이동했습니다.`);
  };

  const removeWorkspaceItem = (item: any) => {
    setTrackedTasks(previousItems => {
      const updatedItems = { ...previousItems };
      delete updatedItems[item.id];
      return updatedItems;
    });
    triggerToast(`'${item.title}' 작업을 목록에서 삭제했습니다.`);
  };

  const handleCopyToClipboard = (text: any, type: any) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      triggerToast(`${type} 템플릿이 클립보드에 복사되었습니다!`);
    } catch (err) {
      triggerToast("복사 실패. 브라우저 보안 설정을 확인해 주세요.");
    }
    document.body.removeChild(textArea);
  };

  const openTranslatedGuide = (repoName: any) => {
    setGuideSourceMode('repository');
    setGuideRepositoryQuery(repoName || "");
    setGuideRepositoryResult(null);
    setGuideRepoKey(repoName || "");
    setGuideSearchQuery("");
    setGuideRepositorySearchError("");
    setGuideDetailError("");
    navigate(repoName ? `/guides/${repoName}` : "/guides");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const searchContributionGuide = async (event: any) => {
    event.preventDefault();
    const query = guideRepositoryQuery.trim();
    if (!query) {
      setGuideRepositorySearchError("owner/repository 형식의 저장소 이름을 입력해 주세요.");
      return null;
    }

    setGuideRepositorySearchLoading(true);
    setGuideRepositorySearchError("");
    setGuideDetailError("");
    setGuideRepositoryResult(null);
    setGuideRepoKey("");

    try {
      const result = await fetchContributionGuide(query);
      const fullName = result.repository.fullName;
      setGuideDetails(current => ({ ...current, [fullName]: result }));
      setGuideRepositoryResult(result);
      setGuideRepositoryQuery(fullName);
      setGuideRepoKey(fullName);
      return result;
    } catch (error) {
      setGuideRepositorySearchError(
        error instanceof Error ? error.message : "저장소의 기여 가이드를 불러오지 못했습니다."
      );
      return null;
    } finally {
      setGuideRepositorySearchLoading(false);
    }
  };

  const refreshFeatureRecommendations = () => {
    setFeatureRecommendationsLoaded(false);
    setFeatureRecommendationsError("");
    setFeatureIssues([]);
    setRecommendationRefreshVersion(version => version + 1);
  };

  const resetFeatureIssueFilters = () => {
    setFeatureRepoSearch("");
    setFeatureRepoLanguage("All");
    setSelectedDifficulty("All");
    setSelectedIssueType("All");
  };

  const analyzeIssueWithCodex = async (targetUrl: any) => {
    setCodexAnalysis(null);
    setCodexAnalysisError("");
    setCodexAnalysisLoading(true);

    try {
      const response = await fetch("/api/analyze-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueUrl: targetUrl })
      });
      const data: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "이슈 분석 요청에 실패했습니다.");

      const nextAnalysis = {
        ...data.analysis,
        cached: !!data.cached,
        generatedAt: data.generatedAt
      };
      const translatedIssueFields = {
        titleKo: nextAnalysis.translatedTitleKo,
        summaryKo: nextAnalysis.summaryKo,
        difficulty: nextAnalysis.difficulty.level === "판단 보류"
          ? "난이도 판단 보류"
          : `예상 ${nextAnalysis.difficulty.level}`,
        difficultyLevel: ({
          "첫 기여": "starter",
          "중간": "medium",
          "도전": "challenging"
        } as Record<string, string>)[nextAnalysis.difficulty.level] || "unlabeled",
        difficultySource: "ai-analysis",
        difficultyConfidence: nextAnalysis.difficulty.confidence,
        difficultyReason: nextAnalysis.difficulty.rationale,
        workType: nextAnalysis.workType === "기타" ? "유형 미분류" : nextAnalysis.workType,
        typeLabel: nextAnalysis.workType === "기타" ? "유형 미분류" : nextAnalysis.workType,
        codexAnalysis: nextAnalysis
      };

      setCodexAnalysis(nextAnalysis);
      setIssueData((currentIssue: any) => (
        currentIssue?.url === targetUrl
          ? { ...currentIssue, ...translatedIssueFields }
          : currentIssue
      ));
      setFeatureIssues(currentIssues => currentIssues.map(issue => (
        issue.url === targetUrl
          ? { ...issue, ...translatedIssueFields }
          : issue
      )));
      setRepositoryIssues(currentIssues => currentIssues.map(issue => (
        issue.url === targetUrl
          ? { ...issue, ...translatedIssueFields }
          : issue
      )));
      setTrackedTasks(previousItems => {
        const matchingItem = Object.values(previousItems).find(item => item.url === targetUrl);
        if (!matchingItem) return previousItems;

        return {
          ...previousItems,
          [matchingItem.id]: {
            ...matchingItem,
            title: nextAnalysis.translatedTitleKo,
            summary: nextAnalysis.summaryKo,
            difficulty: translatedIssueFields.difficulty,
            workType: translatedIssueFields.workType,
            updatedAt: new Date().toISOString(),
            data: {
              ...matchingItem.data,
              ...translatedIssueFields
            }
          }
        };
      });
    } catch (error) {
      const isNetworkError = error instanceof TypeError;
      setCodexAnalysisError(
        isNetworkError
          ? "분석 서버에 연결할 수 없습니다. 개발 서버 상태를 확인해 주세요."
          : error.message
      );
    } finally {
      setCodexAnalysisLoading(false);
    }
  };

  const openWorkspaceItem = (item: any) => {
    if (item.kind === "translation") {
      const language = item.languageTags?.[0] || "All";
      setTranslationLanguage(language);
      setSelectedRepo(item.data.repoKey);
      setSelectedDocId(item.data.docId);
      navigate(`/translations/${item.data.repoKey}/${item.data.docId}`);
      return;
    }

    const savedIssue = {
      ...item.data,
      titleKo: item.data.titleKo || item.title,
      summaryKo: item.data.summaryKo || item.summary
    };
    setIssueData(savedIssue);
    setCodexAnalysis(savedIssue.codexAnalysis || null);
    setCodexAnalysisError("");
    setFeatureSourceMode(savedIssue.source === 'github-import'
      ? 'issue-url'
      : savedIssue.source === 'github-repository' ? 'repository' : 'recommended');
    navigate(`/issues/${savedIssue.repo}/${savedIssue.number}`);
    if (!savedIssue.codexAnalysis) void analyzeIssueWithCodex(savedIssue.url);
  };

  const loadRepositoryRecommendations = async (event: any) => {
    event.preventDefault();
    const query = repositoryQuery.trim();
    if (!query) {
      setRepositoryIssuesError("owner/repository 형식의 저장소 이름을 입력해 주세요.");
      return;
    }

    setRepositoryIssuesLoading(true);
    setRepositoryIssuesError("");
    setRepositoryIssueResult(null);
    setRepositoryIssues([]);

    try {
      const result = await fetchRepositoryIssues(query);
      setRepositoryIssues(result.issues);
      setRepositoryIssueResult(result);
      resetFeatureIssueFilters();
    } catch (error) {
      setRepositoryIssuesError(
        error instanceof Error ? error.message : "저장소의 추천 이슈를 불러오지 못했습니다."
      );
    } finally {
      setRepositoryIssuesLoading(false);
    }
  };

  const openIssueDetail = (issue: any) => {
    trackAnalyticsEvent("select_content", {
      content_type: "issue",
      item_id: `${issue.repo}#${issue.number}`,
      repository: issue.repo,
      source: issue.source
    });
    setIssueData(issue);
    setCodexAnalysis(issue.codexAnalysis || null);
    setCodexAnalysisError("");
    if (!issue.codexAnalysis) void analyzeIssueWithCodex(issue.url);
  };

  const loadIssueByUrl = async (event: any) => {
    event.preventDefault();
    const query = issueUrlQuery.trim();
    if (!query) {
      setIssueUrlError("GitHub Issue URL을 입력해 주세요.");
      return null;
    }

    setIssueUrlLoading(true);
    setIssueUrlError("");

    try {
      const issue = await fetchGithubIssueByUrl(query);
      setIssueUrlQuery(issue.url);
      openIssueDetail(issue);
      return issue;
    } catch (error) {
      setIssueUrlError(error instanceof Error ? error.message : "GitHub 이슈를 불러오지 못했습니다.");
      return null;
    } finally {
      setIssueUrlLoading(false);
    }
  };

  const loadIssueFromRoute = async (repositoryName: any, issueNumber: any) => {
    setIssueUrlLoading(true);
    setIssueUrlError("");

    try {
      const issue = await fetchGithubIssueByUrl(`https://github.com/${repositoryName}/issues/${issueNumber}`);
      setIssueUrlQuery(issue.url);
      openIssueDetail(issue);
      return issue;
    } catch (error) {
      setIssueUrlError(error instanceof Error ? error.message : "GitHub 이슈를 불러오지 못했습니다.");
      return null;
    } finally {
      setIssueUrlLoading(false);
    }
  };

  const liveTranslationTasks = translationStatusLoaded && !translationStatusError
    ? Object.values(translationProjects).flatMap((project: any) => (
        (project.docs || []).flatMap((document: any) => {
          if (!["alert", "partial"].includes(document.status)) return [];
          return [{
            id: `translation-${project.key}-${document.id}`,
            repoKey: project.key,
            docId: document.id,
            repo: project.name,
            title: `${document.title} 한국어 번역 업데이트`,
            summary: document.summary,
            difficulty: document.statusText,
            status: document.status,
            statusText: document.statusText,
            languageTags: document.languageTags || project.languageTags || [],
            techs: (project.techStack || []).slice(0, 2)
          }];
        })
      ))
    : [];

  const filteredTranslationTasks = liveTranslationTasks.filter(task => {
    const query = translationSearch.trim().toLowerCase();
    const matchSearch = !query || [task.repo, task.title, task.summary]
      .some(value => value.toLowerCase().includes(query));
    const matchLanguage = matchesLanguage(task.languageTags, translationLanguage);
    return matchSearch && matchLanguage;
  });

  const activeFeatureIssues = featureSourceMode === 'repository'
    ? repositoryIssues
    : featureSourceMode === 'recommended' ? featureIssues : [];
  const filteredFeatureIssues = activeFeatureIssues.filter(issue => {
    const query = featureRepoSearch.trim().toLowerCase();
    const matchSearch = !query || [issue.repo, issue.title, issue.summary, issue.workType, issue.typeLabel]
      .some(value => value.toLowerCase().includes(query));
    const matchDifficulty = selectedDifficulty === "All" || issue.difficultyLevel === selectedDifficulty;
    const matchIssueType = selectedIssueType === "All" || issue.workType === selectedIssueType;
    const matchLanguage = matchesLanguage(issue.languageTags, featureRepoLanguage);
    return matchSearch && matchDifficulty && matchIssueType && matchLanguage;
  });

  const filteredGuideRepos = guideRepositories.filter(repo => {
    const query = guideSearchQuery.trim().toLowerCase();
    return !query || [repo.fullName, repo.description, repo.language]
      .some(value => String(value || "").toLowerCase().includes(query));
  });
  const selectedGuideRepository = guideRepositories.find(repo => repo.fullName === guideRepoKey);
  const selectedGuideResult = guideDetails[guideRepoKey];
  const featureLanguageOptions = [
    "All",
    ...[...new Set(activeFeatureIssues.flatMap(issue => issue.languageTags || []))]
      .sort((a, b) => a.localeCompare(b))
  ];

  const isGithubIssue = [
    'github-import',
    'github-recommendation',
    'github-repository'
  ].includes(issueData?.source);
  const recommendationLoadedAtText = featureRecommendationsLoadedAt
    ? new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(featureRecommendationsLoadedAt))
    : '';
  const translationStatusGeneratedAtText = translationStatusGeneratedAt
    ? new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(translationStatusGeneratedAt))
    : '';
  const selectedTranslationProject = translationProjects[selectedRepo] || null;
  const selectedTranslationDoc = selectedTranslationProject?.docs.find((doc: any) => doc.id === selectedDocId)
    || selectedTranslationProject?.docs[0]
    || null;
  const selectedTranslationStatus = selectedTranslationDoc
    ? translationStatuses[`translation-${selectedRepo}-${selectedTranslationDoc.id}`] || null
    : null;
  const issueAssignees = Array.isArray(issueData?.assignees) ? issueData.assignees : [];

  const appContextValue = {
    trackedTasks,
    myPageStatus,
    setMyPageStatus,
    updateWorkspaceStatus,
    removeWorkspaceItem,
    openWorkspaceItem,
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
    translationProjects,
    translationStatuses,
    translationStatusLoading,
    translationStatusLoaded,
    translationStatusError,
    translationStatusStale,
    translationDiscoverySummary,
    bookmarks,
    interestedTasks,
    refreshTranslationStatuses,
    toggleBookmark,
    toggleTaskInterest,
    filteredTranslationTasks,
    translationStatusGeneratedAtText,
    selectedTranslationProject,
    selectedTranslationDoc,
    selectedTranslationStatus,
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
    issueAssignees,
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
  };

  return (
    <OssAppProvider value={appContextValue}>
      <div className="app-root font-sans antialiased flex flex-col selection:bg-[#d5e0f8] selection:text-[#18201d]">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#1f2933] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-[#30363d] text-sm animate-fade-in">
            <Icons.Check className="text-[#3fb950] w-4 h-4" />
            <span>{toast}</span>
          </div>
        )}

        <header className="app-header">
          <div className="app-header-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <button type="button" className="app-brand flex items-center gap-3" onClick={() => setView("landing")}>
              <span className="brand-mark"><BrandMark /></span>
              <span className="flex items-center gap-2">
                <span className="brand-name font-bold text-[#1f2933] text-sm tracking-tight">OSS</span>
                <span className="preview-badge text-[10px] font-semibold px-2 py-0.5 rounded-full">Preview</span>
              </span>
            </button>

            <nav className="app-nav flex items-center gap-2" aria-label="주요 메뉴">
              <button type="button" onClick={() => setView("translation")} className={`nav-button text-xs px-3 py-1.5 transition-all ${view === "translation" ? "nav-button-active" : ""}`}>번역 기여</button>
              <button type="button" onClick={() => { setFeatureSourceMode("recommended"); setView("feature"); }} className={`nav-button text-xs px-3 py-1.5 transition-all ${view === "feature" ? "nav-button-active" : ""}`}>코드 이슈</button>
              <button type="button" onClick={() => setView("guide")} className={`nav-button text-xs px-3 py-1.5 transition-all ${view === "guide" ? "nav-button-active" : ""}`}>기여 가이드</button>
              <button type="button" onClick={() => setView("mypage")} className={`nav-button text-xs px-3 py-1.5 transition-all ${view === "mypage" ? "nav-button-active" : ""}`}>마이페이지</button>
            </nav>

            <div className="header-actions">
              <button type="button" aria-label="코드 이슈 검색" onClick={() => { setFeatureSourceMode("recommended"); setView("feature"); }} className="header-search-button">
                <Icons.Search className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => triggerToast("GitHub 로그인 연동은 준비 중입니다.")} className="header-login-button">GitHub 로그인</button>
            </div>
          </div>
        </header>

        <main className="app-main flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/translations" element={<TranslationPage />} />
            <Route path="/translations/:repoKey/:docId" element={<TranslationPage />} />
            <Route path="/issues" element={<CodeIssuesPage />} />
            <Route path="/issues/:owner/:repository/:issueNumber" element={<CodeIssuesPage />} />
            <Route path="/guides" element={<ContributionGuidePage />} />
            <Route path="/guides/:owner/:repository" element={<ContributionGuidePage />} />
            <Route path="/mypage" element={<WorkspacePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="app-footer-inner">
            <div className="app-footer-top">
              <div className="app-footer-brand">
                <span className="brand-mark"><BrandMark /></span>
                <strong>OSS</strong>
              </div>
              <div className="app-footer-links">
                <a href="#">서비스 소개</a>
                <a href="#">이용약관</a>
                <a href="#">개인정보 처리방침</a>
                <a href="#">문의하기</a>
              </div>
            </div>
            <p>오픈소스 첫 기여를 찾고 준비하는 작업 공간입니다. © 2026 OSS</p>
          </div>
        </footer>
      </div>
    </OssAppProvider>
  );
}
