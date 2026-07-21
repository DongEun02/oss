import React, { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { OssAppProvider } from "./app/OssAppContext";
import { BrandMark, SITE_ICON_DATA_URL } from "./components/BrandMark";
import { GitHubAuthControl } from "./components/GitHubAuthControl";
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
import { fetchCategoryIssues } from "./services/categoryIssues";
import { initializeAnalytics, trackAnalyticsEvent } from "./services/analytics";
import { fetchAuthSession, getGithubLoginUrl, logoutGithub } from "./services/auth";
import type { AuthUser } from "./services/auth";
import { fetchGithubIssueByUrl } from "./services/githubIssue";
import { fetchRepositoryIssues } from "./services/repositoryIssues";
import { updateSeoMetadata } from "./services/seo";
import {
  clearTranslationStatusCache,
  fetchTranslationStatuses,
  indexTranslationProjects,
  indexTranslationStatuses
} from "./services/translationStatus";
import {
  clearLegacyWorkspaceItems,
  createWorkspaceItem,
  indexWorkspaceItems,
  readLegacyWorkspaceItems,
  WORKSPACE_STATUSES,
  writeLegacyWorkspaceItems
} from "./services/userWorkspace";
import type { WorkspaceItem } from "./services/userWorkspace";
import {
  deleteRemoteWorkspaceItem,
  syncWorkspaceItems,
  updateRemoteWorkspaceStatus,
  upsertWorkspaceItem
} from "./services/workspace";
import type { ContributionCategoryId } from "../shared/contributionCategories";

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

  const [issueData, setIssueData] = useState<any>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [selectedIssueType, setSelectedIssueType] = useState("All");
  const [featureRepoSearch, setFeatureRepoSearch] = useState("");
  const [featureRepoLanguage, setFeatureRepoLanguage] = useState("All");
  const [featureSourceMode, setFeatureSourceMode] = useState('category'); // 'category' | 'personalized' | 'repository' | 'issue-url'
  const [selectedContributionCategory, setSelectedContributionCategory] = useState<ContributionCategoryId>("documentation");
  const [categoryRecommendationResults, setCategoryRecommendationResults] = useState<Record<string, any>>({});
  const [categoryIssuesLoading, setCategoryIssuesLoading] = useState(false);
  const [categoryIssuesError, setCategoryIssuesError] = useState("");
  const [categoryRefreshVersion, setCategoryRefreshVersion] = useState(0);
  const handledCategoryRefresh = useRef(0);

  useEffect(() => {
    if (location.pathname !== "/translations") return;
    setFeatureSourceMode("category");
    setSelectedContributionCategory("documentation");
    navigate("/issues", { replace: true });
  }, [location.pathname, navigate]);

  const [repositoryQuery, setRepositoryQuery] = useState("");
  const [repositoryIssues, setRepositoryIssues] = useState<any[]>([]);
  const [repositoryIssueResult, setRepositoryIssueResult] = useState<any>(null);
  const [repositoryIssuesLoading, setRepositoryIssuesLoading] = useState(false);
  const [repositoryIssuesError, setRepositoryIssuesError] = useState("");
  const [issueUrlQuery, setIssueUrlQuery] = useState("");
  const [issueUrlLoading, setIssueUrlLoading] = useState(false);
  const [issueUrlError, setIssueUrlError] = useState("");
  const [codexAnalysis, setCodexAnalysis] = useState<any>(null);
  const [codexAnalysisLoading, setCodexAnalysisLoading] = useState(false);
  const [codexAnalysisError, setCodexAnalysisError] = useState("");

  // Guide Explorer States (New Page)
  const [guideRepoKey, setGuideRepoKey] = useState('');
  const [guideRepositoryQuery, setGuideRepositoryQuery] = useState("");
  const [guideRepositoryResult, setGuideRepositoryResult] = useState<any>(null);
  const [guideRepositorySearchLoading, setGuideRepositorySearchLoading] = useState(false);
  const [guideRepositorySearchError, setGuideRepositorySearchError] = useState("");
  const [guideCompletedChecklist, setGuideCompletedChecklist] = usePersistentState("oss:guide-checklist:v1", {});
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
  const [trackedTasks, setTrackedTasks] = useState<Record<string, WorkspaceItem>>(readLegacyWorkspaceItems);
  const interestedTasks = trackedTasks;
  const [toast, setToast] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authLogoutLoading, setAuthLogoutLoading] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchAuthSession(controller.signal)
      .then(user => {
        if (active) setAuthUser(user);
      })
      .catch(error => {
        if (active && error?.name !== "AbortError") setAuthUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;

    if (!authUser) {
      setTrackedTasks(readLegacyWorkspaceItems());
      setWorkspaceLoading(false);
      setWorkspaceError("");
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    const legacyItems = Object.values(readLegacyWorkspaceItems());
    setWorkspaceLoading(true);
    setWorkspaceError("");

    syncWorkspaceItems(legacyItems, controller.signal)
      .then(items => {
        if (!active) return;
        setTrackedTasks(indexWorkspaceItems(items));
        clearLegacyWorkspaceItems();
      })
      .catch(error => {
        if (!active || error?.name === "AbortError") return;
        setWorkspaceError(error instanceof Error ? error.message : "작업 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setWorkspaceLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [authLoading, authUser]);

  useEffect(() => {
    const parameters = new URLSearchParams(location.search);
    const errorCode = parameters.get("auth_error");
    if (!errorCode) return;

    const messages: Record<string, string> = {
      access_denied: "GitHub 로그인이 취소되었습니다.",
      invalid_flow: "로그인 요청이 만료되었습니다. 다시 시도해 주세요.",
      github_failed: "GitHub 로그인 중 오류가 발생했습니다. 다시 시도해 주세요."
    };
    setToast(messages[errorCode] || "GitHub 로그인을 완료하지 못했습니다.");
    parameters.delete("auth_error");
    navigate({
      pathname: location.pathname,
      search: parameters.toString() ? `?${parameters.toString()}` : "",
      hash: location.hash
    }, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

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
  }, []);

  useEffect(() => {
    updateSeoMetadata(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (
      view !== 'feature'
      || featureSourceMode !== 'category'
      || selectedContributionCategory === 'documentation'
    ) return undefined;

    const force = categoryRefreshVersion > handledCategoryRefresh.current;
    handledCategoryRefresh.current = categoryRefreshVersion;
    if (!force && categoryRecommendationResults[selectedContributionCategory]) return undefined;

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 75_000);
    let active = true;
    setCategoryIssuesLoading(true);
    setCategoryIssuesError("");

    fetchCategoryIssues(selectedContributionCategory, { force, signal: controller.signal })
      .then(result => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setCategoryRecommendationResults(current => ({
          ...current,
          [selectedContributionCategory]: result
        }));
        setCategoryIssuesLoading(false);
      })
      .catch(error => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setCategoryIssuesError(
          error?.name === 'AbortError'
            ? "카테고리 추천 이슈를 불러오는 시간이 초과됐습니다."
            : error?.message || "카테고리 추천 이슈를 불러오지 못했습니다."
        );
        setCategoryIssuesLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(requestTimeout);
      controller.abort();
    };
  }, [
    view,
    featureSourceMode,
    selectedContributionCategory,
    categoryRefreshVersion,
    categoryRecommendationResults
  ]);

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
        setGuideRepositoryResult(result);
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
  }, [view, guideRepoKey, guideDetailRefreshVersion]);

  useEffect(() => {
    const isTranslationDiscoveryView = view === 'translation'
      || (
        view === 'feature'
        && featureSourceMode === 'category'
        && selectedContributionCategory === 'documentation'
      );
    if (!isTranslationDiscoveryView) return undefined;

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
  }, [
    view,
    featureSourceMode,
    selectedContributionCategory,
    translationLanguage,
    translationStatusRefreshVersion
  ]);

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
  };

  const handleGithubLogin = () => {
    trackAnalyticsEvent("login", { method: "github" });
  };

  const handleGithubLogout = async () => {
    if (authLogoutLoading) return;
    setAuthLogoutLoading(true);

    try {
      await logoutGithub();
      setAuthUser(null);
      triggerToast("GitHub에서 로그아웃했습니다.");
      trackAnalyticsEvent("logout", { method: "github" });
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : "GitHub에서 로그아웃하지 못했습니다.");
    } finally {
      setAuthLogoutLoading(false);
    }
  };

  const toggleBookmark = (repoName: string) => {
    setBookmarks(prev => {
      const updated: Record<string, boolean> = { ...prev, [repoName]: !prev[repoName] };
      triggerToast(updated[repoName] ? `'${repoName}' 가 즐겨찾기에 등록되었습니다.` : `'${repoName}' 즐겨찾기가 해제되었습니다.`);
      return updated;
    });
  };

  const toggleTaskInterest = (task: any, kind: any) => {
    if (authUser && workspaceLoading) {
      triggerToast("작업 목록을 불러온 뒤 다시 시도해 주세요.");
      return;
    }

    const existingItem = trackedTasks[task.id];
    trackAnalyticsEvent("interest_toggle", {
      content_type: kind,
      item_id: task.id,
      action: existingItem ? "remove" : "add"
    });

    if (existingItem) {
      const updatedItems = { ...trackedTasks };
      delete updatedItems[task.id];
      setTrackedTasks(updatedItems);
      triggerToast(`'${task.titleKo || task.title}' 작업을 관심 목록에서 제외했습니다.`);

      if (!authUser) {
        writeLegacyWorkspaceItems(updatedItems);
        return;
      }

      void deleteRemoteWorkspaceItem(task.id).catch(error => {
        setTrackedTasks(current => ({ ...current, [existingItem.id]: existingItem }));
        triggerToast(error instanceof Error ? error.message : "작업을 삭제하지 못했습니다.");
      });
      return;
    }

    const workspaceItem = createWorkspaceItem(task, kind);
    const updatedItems = { ...trackedTasks, [task.id]: workspaceItem };
    setTrackedTasks(updatedItems);
    triggerToast(`'${workspaceItem.title}' 작업을 관심 목록에 추가했습니다.`);

    if (!authUser) {
      writeLegacyWorkspaceItems(updatedItems);
      return;
    }

    void upsertWorkspaceItem(workspaceItem).catch(error => {
      setTrackedTasks(current => {
        const rolledBack = { ...current };
        delete rolledBack[workspaceItem.id];
        return rolledBack;
      });
      triggerToast(error instanceof Error ? error.message : "작업을 저장하지 못했습니다.");
    });
  };

  const updateWorkspaceStatus = (taskId: any, status: any) => {
    if (authUser && workspaceLoading) return;
    const statusLabel = WORKSPACE_STATUSES.find(item => item.value === status)?.label || "진행 상태";
    const targetItem = trackedTasks[taskId];
    if (!targetItem) return;
    const updatedItems = {
      ...trackedTasks,
      [taskId]: {
        ...targetItem,
        status,
        updatedAt: new Date().toISOString()
      }
    };
    setTrackedTasks(updatedItems);
    triggerToast(`${statusLabel}로 이동했습니다.`);

    if (!authUser) {
      writeLegacyWorkspaceItems(updatedItems);
      return;
    }

    void updateRemoteWorkspaceStatus(taskId, status).catch(error => {
      setTrackedTasks(current => ({ ...current, [taskId]: targetItem }));
      triggerToast(error instanceof Error ? error.message : "작업 상태를 변경하지 못했습니다.");
    });
  };

  const removeWorkspaceItem = (item: any) => {
    if (authUser && workspaceLoading) return;
    const updatedItems = { ...trackedTasks };
    delete updatedItems[item.id];
    setTrackedTasks(updatedItems);
    triggerToast(`'${item.title}' 작업을 목록에서 삭제했습니다.`);

    if (!authUser) {
      writeLegacyWorkspaceItems(updatedItems);
      return;
    }

    void deleteRemoteWorkspaceItem(item.id).catch(error => {
      setTrackedTasks(current => ({ ...current, [item.id]: item }));
      triggerToast(error instanceof Error ? error.message : "작업을 삭제하지 못했습니다.");
    });
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
    setGuideRepositoryQuery(repoName || "");
    setGuideRepositoryResult(null);
    setGuideRepoKey(repoName || "");
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

  const resetFeatureIssueFilters = () => {
    setFeatureRepoSearch("");
    setFeatureRepoLanguage("All");
    setSelectedDifficulty("All");
    setSelectedIssueType("All");
  };

  const selectContributionCategory = (category: ContributionCategoryId) => {
    trackAnalyticsEvent("select_content", {
      content_type: "contribution_category",
      item_id: category
    });
    setSelectedContributionCategory(category);
    resetFeatureIssueFilters();
  };

  const refreshCategoryRecommendations = () => {
    trackAnalyticsEvent("content_refresh", {
      content_type: "category_issues",
      category: selectedContributionCategory
    });
    setCategoryIssuesError("");
    setCategoryRecommendationResults(current => {
      const updated = { ...current };
      delete updated[selectedContributionCategory];
      return updated;
    });
    setCategoryRefreshVersion(version => version + 1);
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
          : error instanceof Error ? error.message : "이슈 분석 중 알 수 없는 오류가 발생했습니다."
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
      : savedIssue.source === 'github-category' ? 'category' : 'repository');
    navigate(`/issues/${savedIssue.repo}/${savedIssue.number}`);
    if (!savedIssue.codexAnalysis) void analyzeIssueWithCodex(savedIssue.url);
  };

  const requestRepositoryRecommendations = async (query: string) => {
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

  const loadRepositoryRecommendations = async (event: any) => {
    event.preventDefault();
    await requestRepositoryRecommendations(repositoryQuery.trim());
  };

  const openPersonalizedRepository = (fullName: string) => {
    const query = fullName.trim();
    if (!query) return;
    trackAnalyticsEvent("select_content", {
      content_type: "personalized_repository",
      item_id: query
    });
    setRepositoryQuery(query);
    setFeatureSourceMode("repository");
    void requestRepositoryRecommendations(query);
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

  const selectedCategoryResult = categoryRecommendationResults[selectedContributionCategory] || null;
  const categoryIssues: any[] = selectedCategoryResult?.issues || [];
  const categoryRepositories: any[] = selectedCategoryResult?.repositories || [];
  const categoryRecommendationFailures: any[] = selectedCategoryResult?.failedRepositories || [];
  const activeFeatureIssues: any[] = featureSourceMode === 'category'
    ? categoryIssues
    : featureSourceMode === 'repository' ? repositoryIssues : [];
  const filteredFeatureIssues = activeFeatureIssues.filter(issue => {
    const query = featureRepoSearch.trim().toLowerCase();
    const matchSearch = !query || [issue.repo, issue.title, issue.summary, issue.workType, issue.typeLabel]
      .some(value => value.toLowerCase().includes(query));
    const matchDifficulty = selectedDifficulty === "All" || issue.difficultyLevel === selectedDifficulty;
    const matchIssueType = selectedIssueType === "All" || issue.workType === selectedIssueType;
    const matchLanguage = matchesLanguage(issue.languageTags, featureRepoLanguage);
    return matchSearch && matchDifficulty && matchIssueType && matchLanguage;
  });

  const selectedGuideResult = guideDetails[guideRepoKey];
  const featureLanguageOptions: string[] = [
    "All",
    ...[...new Set<string>(activeFeatureIssues.flatMap((issue: any) => issue.languageTags || []))]
      .sort((a, b) => a.localeCompare(b))
  ];

  const isGithubIssue = [
    'github-import',
    'github-recommendation',
    'github-repository',
    'github-category'
  ].includes(issueData?.source);
  const categoryLoadedAtText = selectedCategoryResult?.loadedAt
    ? new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(selectedCategoryResult.loadedAt))
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
    authUser,
    authLoading,
    workspaceLoading,
    workspaceError,
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
    selectedContributionCategory,
    selectContributionCategory,
    categoryIssues,
    categoryRepositories,
    categoryRecommendationFailures,
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
    issueAssignees,
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
                <span className="brand-name font-bold text-[#1f2933] text-sm tracking-tight">기여로</span>
                <span className="preview-badge text-[10px] font-semibold px-2 py-0.5 rounded-full">Preview</span>
              </span>
            </button>

            <nav className="app-nav flex items-center gap-2" aria-label="주요 메뉴">
              <button type="button" onClick={() => { setFeatureSourceMode("category"); setView("feature"); }} className={`nav-button text-xs px-3 py-1.5 transition-all ${view === "feature" || view === "translation" ? "nav-button-active" : ""}`}>첫 기여 찾기</button>
              <button type="button" onClick={() => setView("guide")} className={`nav-button text-xs px-3 py-1.5 transition-all ${view === "guide" ? "nav-button-active" : ""}`}>기여 가이드</button>
              <button type="button" onClick={() => setView("mypage")} className={`nav-button text-xs px-3 py-1.5 transition-all ${view === "mypage" ? "nav-button-active" : ""}`}>마이페이지</button>
            </nav>

            <div className="header-actions">
              <button type="button" aria-label="첫 기여 찾기" onClick={() => { setFeatureSourceMode("category"); setView("feature"); }} className="header-search-button">
                <Icons.Search className="w-4 h-4" />
              </button>
              <GitHubAuthControl
                user={authUser}
                loading={authLoading}
                loggingOut={authLogoutLoading}
                loginHref={getGithubLoginUrl(`${location.pathname}${location.search}${location.hash}`)}
                onLogin={handleGithubLogin}
                onLogout={handleGithubLogout}
              />
            </div>
          </div>
        </header>

        <main className="app-main flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/translations" element={<Navigate to="/issues" replace />} />
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
                <strong>기여로</strong>
              </div>
              <div className="app-footer-links">
                <a href="#">서비스 소개</a>
                <a href="#">이용약관</a>
                <a href="#">개인정보 처리방침</a>
                <a href="#">문의하기</a>
              </div>
            </div>
            <p>오픈소스 첫 기여로 가는 가장 쉬운 길. © 2026 기여로</p>
          </div>
        </footer>
      </div>
    </OssAppProvider>
  );
}
