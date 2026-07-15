import React, { useState, useEffect, useRef } from "react";
import { BrandMark, SITE_ICON_DATA_URL } from "./components/BrandMark.jsx";
import { Icons, PRStatusBadge } from "./components/Icons.jsx";
import { IssueFilters, IssueRecommendationGrid } from "./components/IssueExplorer.jsx";
import { MyPage } from "./components/MyPage.jsx";
import { usePersistentState } from "./hooks/usePersistentState.js";
import {
  TRANSLATION_PROJECTS,
  TRANSLATION_TASKS,
  formatGithubDate,
  getRepoVisual,
  matchesLanguage
} from "./data/content.js";
import { fetchContributionGuide } from "./services/contributionGuide.js";
import { fetchRecommendedIssues } from "./services/githubRecommendations.js";
import { fetchRepositoryIssues } from "./services/repositoryIssues.js";
import { fetchTrendingRepositories } from "./services/trendingRepositories.js";
import {
  clearTranslationStatusCache,
  fetchTranslationStatuses,
  indexTranslationStatuses
} from "./services/translationStatus.js";
import { createWorkspaceItem, WORKSPACE_STATUSES } from "./services/userWorkspace.js";

const LANDING_PREVIEW_ISSUES = [
  {
    repo: "TanStack/query",
    meta: "Open · Bug",
    title: "ErrorBoundary retry behavior",
    badge: "분석 중"
  },
  {
    repo: "facebook/react",
    meta: "Open · Compiler",
    title: "Compiler serialization issue",
    badge: "핵심 정리"
  },
  {
    repo: "vercel/next.js",
    meta: "Good first issue",
    title: "Dynamic route in symlink",
    badge: "추천"
  },
  {
    repo: "TanStack/query",
    meta: "Open · Help wanted",
    title: "StackBlitz example behavior",
    badge: "분석 대기"
  }
];

export default function App() {
  // --- Navigation & States ---
  const [view, setView] = useState('landing'); // 'landing' | 'translation' | 'feature' | 'guide' | 'mypage'
  const [myPageStatus, setMyPageStatus] = useState('interested');
  const [landingFeaturesVisible, setLandingFeaturesVisible] = useState(false);
  const landingFeatureSectionRef = useRef(null);

  // Translation Screen States
  const [translationViewMode, setTranslationViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedRepo, setSelectedRepo] = useState('react');
  const [selectedDocId, setSelectedDocId] = useState('useid');
  const [translationChecked, setTranslationChecked] = usePersistentState("oss:translation-checklist:v1", {
    fork: false, clone: false, branch: false, edit: false, pr: false
  });
  const [translationSearch, setTranslationQuery] = useState("");
  const [translationLanguage, setTranslationLanguage] = useState("All");
  const [translationStatuses, setTranslationStatuses] = useState({});
  const [translationStatusLoading, setTranslationStatusLoading] = useState(false);
  const [translationStatusLoaded, setTranslationStatusLoaded] = useState(false);
  const [translationStatusError, setTranslationStatusError] = useState("");
  const [translationStatusGeneratedAt, setTranslationStatusGeneratedAt] = useState("");
  const [translationStatusStale, setTranslationStatusStale] = useState(false);
  const [translationStatusRefreshVersion, setTranslationStatusRefreshVersion] = useState(0);

  // Feature screen States
  const [featureViewMode, setFeatureViewMode] = useState('repo-list'); // 'repo-list' | 'detail'
  const [issueData, setIssueData] = useState(null);
  const [selectedPrId, setSelectedPrId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [selectedIssueType, setSelectedIssueType] = useState("All");
  const [featureRepoSearch, setFeatureRepoSearch] = useState("");
  const [featureRepoLanguage, setFeatureRepoLanguage] = useState("All");
  const [featureSourceMode, setFeatureSourceMode] = useState('recommended'); // 'recommended' | 'repository'
  const [repositoryQuery, setRepositoryQuery] = useState("");
  const [repositoryIssues, setRepositoryIssues] = useState([]);
  const [repositoryIssueResult, setRepositoryIssueResult] = useState(null);
  const [repositoryIssuesLoading, setRepositoryIssuesLoading] = useState(false);
  const [repositoryIssuesError, setRepositoryIssuesError] = useState("");
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
  const [guideDetails, setGuideDetails] = useState({});
  const [guideDetailLoading, setGuideDetailLoading] = useState(false);
  const [guideDetailError, setGuideDetailError] = useState("");
  const [guideDetailRefreshVersion, setGuideDetailRefreshVersion] = useState(0);

  // Global Interactive Utilities
  const [bookmarks, setBookmarks] = usePersistentState("oss:repository-bookmarks:v1", {
    "TanStack Query": true,
    "React (공식 한국어 문서)": false,
    "Next.js": false
  });
  const [trackedTasks, setTrackedTasks] = usePersistentState("oss:workspace-items:v1", {});
  const interestedTasks = trackedTasks;
  const [toast, setToast] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [view, translationViewMode, featureViewMode, myPageStatus]);

  useEffect(() => {
    if (view !== 'landing' || landingFeaturesVisible) return undefined;

    const section = landingFeatureSectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      setLandingFeaturesVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setLandingFeaturesVisible(true);
      observer.disconnect();
    }, { threshold: 0.18 });

    observer.observe(section);
    return () => observer.disconnect();
  }, [view, landingFeaturesVisible]);

  useEffect(() => {
    let favicon = document.querySelector('link[rel="icon"]');
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
        const repositoriesWithGuides = result.repositories.filter(repo => repo.contributionGuideUrl);
        setGuideRepositories(repositoriesWithGuides);
        setGuideRepoKey(currentKey => (
          repositoriesWithGuides.some(repo => repo.fullName === currentKey)
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
    if (view !== 'translation' || translationStatusLoaded) return undefined;

    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 45_000);
    let active = true;
    setTranslationStatusLoading(true);
    setTranslationStatusError("");

    fetchTranslationStatuses({
      force: translationStatusRefreshVersion > 0,
      signal: controller.signal
    })
      .then(result => {
        if (!active) return;
        clearTimeout(requestTimeout);
        setTranslationStatuses(indexTranslationStatuses(result));
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
  }, [view, translationStatusRefreshVersion]);

  const refreshTranslationStatuses = () => {
    clearTranslationStatusCache();
    setTranslationStatusLoaded(false);
    setTranslationStatusRefreshVersion(version => version + 1);
  };

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const toggleBookmark = (repoName) => {
    setBookmarks(prev => {
      const updated = { ...prev, [repoName]: !prev[repoName] };
      triggerToast(updated[repoName] ? `'${repoName}' 가 즐겨찾기에 등록되었습니다.` : `'${repoName}' 즐겨찾기가 해제되었습니다.`);
      return updated;
    });
  };

  const toggleTaskInterest = (task, kind) => {
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

  const updateWorkspaceStatus = (taskId, status) => {
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

  const removeWorkspaceItem = item => {
    setTrackedTasks(previousItems => {
      const updatedItems = { ...previousItems };
      delete updatedItems[item.id];
      return updatedItems;
    });
    triggerToast(`'${item.title}' 작업을 목록에서 삭제했습니다.`);
  };

  const handleCopyToClipboard = (text, type) => {
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

  const openTranslatedGuide = (repoName) => {
    setGuideSourceMode('repository');
    setGuideRepositoryQuery(repoName || "");
    setGuideRepositoryResult(null);
    setGuideRepoKey(repoName || "");
    setGuideSearchQuery("");
    setGuideRepositorySearchError("");
    setGuideDetailError("");
    setView('guide');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const searchContributionGuide = async event => {
    event.preventDefault();
    const query = guideRepositoryQuery.trim();
    if (!query) {
      setGuideRepositorySearchError("owner/repository 형식의 저장소 이름을 입력해 주세요.");
      return;
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
    } catch (error) {
      setGuideRepositorySearchError(
        error instanceof Error ? error.message : "저장소의 기여 가이드를 불러오지 못했습니다."
      );
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

  const analyzeIssueWithCodex = async targetUrl => {
    setCodexAnalysis(null);
    setCodexAnalysisError("");
    setCodexAnalysisLoading(true);

    try {
      const response = await fetch("/api/analyze-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueUrl: targetUrl })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "이슈 분석 요청에 실패했습니다.");

      const nextAnalysis = {
        ...data.analysis,
        cached: !!data.cached,
        generatedAt: data.generatedAt
      };
      const translatedIssueFields = {
        titleKo: nextAnalysis.translatedTitleKo,
        summaryKo: nextAnalysis.summaryKo,
        codexAnalysis: nextAnalysis
      };

      setCodexAnalysis(nextAnalysis);
      setIssueData(currentIssue => (
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

  const openWorkspaceItem = item => {
    if (item.kind === "translation") {
      const projectKey = TRANSLATION_PROJECTS[item.data.repoKey] ? item.data.repoKey : "react";
      const project = TRANSLATION_PROJECTS[projectKey];
      const documentId = project.docs.some(document => document.id === item.data.docId)
        ? item.data.docId
        : project.docs[0].id;
      setSelectedRepo(projectKey);
      setSelectedDocId(documentId);
      setTranslationViewMode('detail');
      setView('translation');
      return;
    }

    const savedIssue = {
      ...item.data,
      titleKo: item.data.titleKo || item.title,
      summaryKo: item.data.summaryKo || item.summary
    };
    setIssueData(savedIssue);
    setSelectedPrId("");
    setCodexAnalysis(savedIssue.codexAnalysis || null);
    setCodexAnalysisError("");
    setFeatureSourceMode(
      savedIssue.source === 'github-import' || savedIssue.source === 'github-repository'
        ? 'repository'
        : 'recommended'
    );
    setFeatureViewMode('detail');
    setView('feature');
    if (!savedIssue.codexAnalysis) void analyzeIssueWithCodex(savedIssue.url);
  };

  const loadRepositoryRecommendations = async (event) => {
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

  const openIssueDetail = issue => {
    setIssueData(issue);
    setSelectedPrId("");
    setCodexAnalysis(issue.codexAnalysis || null);
    setCodexAnalysisError("");
    setFeatureViewMode('detail');
    if (!issue.codexAnalysis) void analyzeIssueWithCodex(issue.url);
  };

  const liveTranslationTasks = TRANSLATION_TASKS
    .map(task => {
      const liveStatus = translationStatuses[task.id];
      return {
        ...task,
        status: liveStatus?.status || "checking",
        statusText: liveStatus?.statusText || "상태 확인 중",
        summary: liveStatus?.summary || task.summary,
        difficulty: liveStatus?.statusText || "상태 확인 중"
      };
    })
    .filter(task => !translationStatusLoaded || task.status !== "completed");

  const filteredTranslationTasks = liveTranslationTasks.filter(task => {
    const query = translationSearch.trim().toLowerCase();
    const matchSearch = !query || [task.repo, task.title, task.summary]
      .some(value => value.toLowerCase().includes(query));
    const matchLanguage = matchesLanguage(task.languageTags, translationLanguage);
    return matchSearch && matchLanguage;
  });

  const activeFeatureIssues = featureSourceMode === 'repository' ? repositoryIssues : featureIssues;
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

  const prsList = issueData?.prs || [];
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
  const selectedTranslationProject = TRANSLATION_PROJECTS[selectedRepo] || TRANSLATION_PROJECTS.react;
  const selectedTranslationDoc = selectedTranslationProject.docs.find(doc => doc.id === selectedDocId)
    || selectedTranslationProject.docs[0];
  const selectedTranslationStatus = translationStatuses[`translation-${selectedRepo}-${selectedTranslationDoc.id}`] || null;
  const issueAssignees = Array.isArray(issueData?.assignees) ? issueData.assignees : [];

  return (
    <>
      <div className="app-root font-sans antialiased flex flex-col selection:bg-[#d5e0f8] selection:text-[#18201d]">

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1f2933] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-[#30363d] text-sm animate-fade-in">
          <Icons.Check className="text-[#3fb950] w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* --- App Navigation Header --- */}
      <header className="app-header">
        <div className="app-header-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

          {/* Logo & Service Brand */}
          <div className="app-brand flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
            <span className="brand-mark">
              <BrandMark />
            </span>
            <div className="flex items-center gap-2">
              <span className="brand-name font-bold text-[#1f2933] text-sm tracking-tight flex items-center gap-1.5">
                OSS
              </span>
              <span className="preview-badge text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Preview
              </span>
            </div>
          </div>

          {/* Nav Links / Quick Navigation */}
          <nav className="app-nav flex items-center gap-2" aria-label="주요 메뉴">
            <button
              onClick={() => { setView('translation'); setTranslationViewMode('list'); }}
              className={`nav-button text-xs px-3 py-1.5 transition-all ${
                view === 'translation'
                  ? "nav-button-active"
                  : ""
              }`}
            >
              번역 기여
            </button>
            <button
              onClick={() => { setView('feature'); setFeatureViewMode('repo-list'); setFeatureSourceMode('recommended'); }}
              className={`nav-button text-xs px-3 py-1.5 transition-all ${
                view === 'feature'
                  ? "nav-button-active"
                  : ""
              }`}
            >
              코드 이슈
            </button>
            <button
              onClick={() => { setView('guide'); setGuideRepoKey('tanstack'); }}
              className={`nav-button text-xs px-3 py-1.5 transition-all ${
                view === 'guide'
                  ? "nav-button-active"
                  : ""
              }`}
            >
              기여 가이드
            </button>
            <button
              onClick={() => setView('mypage')}
              className={`nav-button text-xs px-3 py-1.5 transition-all ${
                view === 'mypage'
                  ? "nav-button-active"
                  : ""
              }`}
            >
              마이페이지
            </button>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              aria-label="코드 이슈 검색"
              onClick={() => { setView('feature'); setFeatureViewMode('repo-list'); setFeatureSourceMode('recommended'); }}
              className="header-search-button"
            >
              <Icons.Search className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => triggerToast("GitHub 로그인 연동은 준비 중입니다.")} className="header-login-button">
              GitHub 로그인
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content Layout --- */}
      <main className="app-main flex-grow">

        {/* ==================== LANDING VIEW ==================== */}
        {view === 'landing' && (
          <div className="landing-home animate-fade-in">
            <section className="landing-intro">
              <div className="landing-intro-visual" aria-hidden="true">
                <div className="landing-intro-stream">
                  <div className="landing-intro-stream-track">
                    {[0, 1].map(groupIndex => (
                      <div className="landing-intro-stream-group" key={groupIndex}>
                        {LANDING_PREVIEW_ISSUES.map(issue => (
                          <div className="landing-intro-issue-row" key={`${groupIndex}-${issue.repo}-${issue.title}`}>
                            <img src={getRepoVisual(issue.repo).image} alt="" />
                            <div>
                              <span>{issue.repo} · {issue.meta}</span>
                              <strong>{issue.title}</strong>
                            </div>
                            <em>{issue.badge}</em>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="landing-intro-content">
                <h1>
                  OSS에서 첫 오픈소스 기여를<br />
                  시작하세요.
                </h1>
                <p className="landing-intro-copy">
                  번역 작업, 코드 이슈 분석, 프로젝트별 기여 규칙을 한곳에서 확인할 수 있습니다.<br />
                  지금 필요한 도움부터 선택해 순서대로 진행하세요.
                </p>
              </div>
            </section>

            <section
              ref={landingFeatureSectionRef}
              className={`landing-feature-section${landingFeaturesVisible ? ' is-visible' : ''}`}
              aria-labelledby="landing-feature-heading"
            >
              <div className="landing-section-heading">
                <div>
                  <h2 id="landing-feature-heading">필요한 도움을 선택하세요.</h2>
                  <p>문서 번역, 코드 개선, 프로젝트별 제출 규칙 중 지금 필요한 작업부터 확인하세요.</p>
                </div>
              </div>

              <div className="landing-feature-grid">
                <button
                  type="button"
                  className="landing-feature-card"
                  style={{ '--landing-card-index': 0 }}
                  onClick={() => { setView('translation'); setTranslationViewMode('list'); }}
                >
                  <div className="landing-feature-visual" aria-hidden="true">
                    <div className="landing-translation-preview">
                      <div><strong>EN</strong><span></span><span></span><span></span></div>
                      <div><strong>KO</strong><span></span><span></span><span></span></div>
                    </div>
                  </div>
                  <div className="landing-feature-body">
                    <span className="landing-feature-label">문서부터 시작한다면</span>
                    <h3>번역 기여</h3>
                    <p>언어별 번역 작업을 찾고 영어 원문과 한국어 문서를 나란히 비교해 실제로 수정해야 할 문단을 확인합니다.</p>
                    <div className="landing-feature-points"><span>언어 필터</span><span>원문 대조</span></div>
                    <span className="landing-feature-link">번역 작업 보기 <Icons.ArrowRight className="w-3 h-3" /></span>
                  </div>
                </button>

                <button
                  type="button"
                  className="landing-feature-card"
                  style={{ '--landing-card-index': 1 }}
                  onClick={() => { setView('feature'); setFeatureViewMode('repo-list'); setFeatureSourceMode('recommended'); }}
                >
                  <div className="landing-feature-visual" aria-hidden="true">
                    <div className="landing-issue-preview">
                      <div><span>Good first issue</span><em>Open</em></div>
                      <b>Fix query cache behavior</b>
                    </div>
                  </div>
                  <div className="landing-feature-body">
                    <span className="landing-feature-label">코드로 기여한다면</span>
                    <h3>코드 이슈</h3>
                    <p>언어, 난이도, 작업 유형으로 코드 이슈를 찾고 관련 PR과 실제 변경 파일을 확인해 작업 범위를 파악합니다.</p>
                    <div className="landing-feature-points"><span>이슈 필터</span><span>PR 분석</span></div>
                    <span className="landing-feature-link">코드 이슈 보기 <Icons.ArrowRight className="w-3 h-3" /></span>
                  </div>
                </button>

                <button
                  type="button"
                  className="landing-feature-card"
                  style={{ '--landing-card-index': 2 }}
                  onClick={() => { setView('guide'); setGuideRepoKey('tanstack'); }}
                >
                  <div className="landing-feature-visual" aria-hidden="true">
                    <div className="landing-guide-preview">
                      <div><strong><Icons.FileText className="w-3 h-3" /> CONTRIBUTING.md</strong><span>KO</span></div>
                      <div className="landing-guide-lines"><span></span><span></span><span></span></div>
                    </div>
                  </div>
                  <div className="landing-feature-body">
                    <span className="landing-feature-label">제출 전에 확인한다면</span>
                    <h3>기여 가이드</h3>
                    <p>프로젝트의 CONTRIBUTING.md 번역본과 브랜치명, 커밋 규칙, 제출 전 체크리스트를 한 번에 확인합니다.</p>
                    <div className="landing-feature-points"><span>번역 가이드</span><span>원문 링크</span></div>
                    <span className="landing-feature-link">가이드 확인하기 <Icons.ArrowRight className="w-3 h-3" /></span>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}

        {view === 'mypage' && (
          <MyPage
            items={trackedTasks}
            activeStatus={myPageStatus}
            onActiveStatusChange={setMyPageStatus}
            onStatusChange={updateWorkspaceStatus}
            onRemove={removeWorkspaceItem}
            onOpen={openWorkspaceItem}
            onBrowse={() => {
              setView('feature');
              setFeatureViewMode('repo-list');
              setFeatureSourceMode('recommended');
            }}
          />
        )}

        {/* ==================== 2. DOCUMENT TRANSLATION VIEW ==================== */}
        {view === 'translation' && (
          <div className="space-y-5 animate-fade-in">

            {/* 2-A. TRANSLATION LIST VIEW (RECOMMENDED DIRECTORY) */}
            {translationViewMode === 'list' && (
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
                      onChange={(e) => setTranslationQuery(e.target.value)}
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
                  <LanguageFilterBar
                    selectedLanguage={translationLanguage}
                    onChange={setTranslationLanguage}
                  />
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
                      onClick={() => {
                        setSelectedRepo(task.repoKey);
                        setSelectedDocId(task.docId);
                        setTranslationViewMode('detail');
                      }}
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
                          <span>{task.repo}</span>
                          <span>·</span>
                          <span className="contribution-kind">문서 번역</span>
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
                        onClick={(e) => {
                          e.stopPropagation();
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

            {/* 2-B. TRANSLATION DETAIL SPLIT-DIFF VIEW */}
            {translationViewMode === 'detail' && (
              <div className="space-y-5 animate-fade-in">

                {/* Back Link */}
                <div>
                  <button
                    onClick={() => setTranslationViewMode('list')}
                    className="inline-flex items-center gap-1 text-xs text-[#3f6fd9] font-semibold hover:underline"
                  >
                    <Icons.ArrowLeft className="w-3 h-3 text-[#3f6fd9]" />
                    번역 작업 목록으로 돌아가기
                  </button>
                </div>

                {/* Selected Repository Context */}
                <div className="border-b border-[#d0d7de] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white border border-[#d0d7de] p-2 rounded-md shadow-sm">
                      <Icons.Github className="w-5 h-5 text-[#24292f]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[#24292f]">{selectedTranslationProject.name}</h2>
                        <button
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

                    {/* 1. Left side: Select Document Sidebar List */}
                    <div className="translation-detail-sidebar space-y-3">
                      <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">번역 대상 가이드 문서</span>
                      <div className="space-y-1.5">
                        {selectedTranslationProject.docs.map(doc => {
                          const liveDoc = translationStatuses[`translation-${selectedRepo}-${doc.id}`];
                          const status = liveDoc?.status || "checking";
                          return (
                            <button
                              key={doc.id}
                              onClick={() => setSelectedDocId(doc.id)}
                              className={`w-full text-left px-3.5 py-3 rounded-md border transition-all ${
                                selectedDocId === doc.id
                                  ? "bg-white border-[#d0d7de] ring-1 ring-[#3f6fd9] shadow-sm"
                                  : "bg-[#f6f8fa] border-[#d0d7de] hover:border-slate-300 hover:bg-white"
                              }`}
                            >
                              <h4 className="text-xs font-bold text-[#24292f] mb-1.5">{doc.title}</h4>
                              <span className={`translation-detail-status translation-detail-status-${status}`}>
                                {liveDoc?.statusText || (translationStatusError ? "확인 실패" : "상태 확인 중")}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Tips Card Widget */}
                      <div className="bg-white border border-[#d0d7de] rounded-md p-4 space-y-2 shadow-sm">
                        <h5 className="text-xs font-bold text-[#24292f] flex items-center gap-1.5">
                          번역 PR 작성 팁
                        </h5>
                        <p className="text-[11px] text-[#57606a] leading-relaxed">
                          용어는 저장소 전체에서 일관되게 유지하세요. `Repository`처럼 자주 나오는 단어는 기존 번역 방식을 먼저 확인하는 편이 안전합니다.
                        </p>
                      </div>
                    </div>

                    {/* 2. Middle side: live source comparison */}
                    <div className="translation-detail-main space-y-4">
                      <section className="translation-analysis-card">
                        <header className="translation-analysis-header">
                          <div>
                            <span>실제 GitHub 문서 비교</span>
                            <strong>{selectedTranslationDoc.title}</strong>
                          </div>
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
                                <ul>
                                  {selectedTranslationStatus.missingSections.map(section => <li key={section}>{section}</li>)}
                                </ul>
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

                    {/* 3. Right side: Interactive Checklist */}
                    <div className="translation-detail-checklist space-y-4">
                      <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">번역 패치 기여 로드맵</span>
                      <div className="bg-white border border-[#d0d7de] rounded-md p-4 space-y-4 shadow-sm">
                        <span className="text-xs font-bold text-[#24292f] block pb-2 border-b border-[#d0d7de]">실시간 기여 체크리스트</span>
                        <div className="space-y-3">
                          {Object.keys(translationChecked).map((key) => (
                            <label
                              key={key}
                              className="flex items-start gap-2.5 cursor-pointer select-none text-xs"
                              onClick={() => setTranslationChecked(prev => ({ ...prev, [key]: !prev[key] }))}
                            >
                              <input
                                type="checkbox"
                                checked={translationChecked[key]}
                                readOnly
                                className="mt-0.5 rounded border-[#d0d7de] text-[#3f6fd9] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className={`leading-relaxed ${translationChecked[key] ? "line-through text-slate-400" : "text-[#24292f] font-medium"}`}>
                                {key === 'fork' && '오픈소스 레포지토리 Fork 생성'}
                                {key === 'clone' && '로컬 컴퓨터에 git clone 및 환경 매칭'}
                                {key === 'branch' && '새 작업 브랜치 개설'}
                                {key === 'edit' && '비교 결과와 실제 원문을 기준으로 번역 수정'}
                                {key === 'pr' && '기여 원격 브랜치에 문서 PR 생성 완료'}
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
        )}

        {/* ==================== 3. FEATURE/BUG FIX VIEW ==================== */}
        {view === 'feature' && (
          <div className="space-y-6 animate-fade-in">

            {/* 3-STEP FLOW: STEP 1 - REPOSITORY SEARCH/LIST */}
            {featureViewMode === 'repo-list' && (
              <div className="space-y-6">
                <div className="page-heading pb-2">
                  <h2 className="text-xl font-bold text-[#1f2933]">코드 이슈</h2>
                  <p className="text-xs text-[#57606a]">
                    <a
                      href="https://github.com/trending?since=monthly"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#3f6fd9] font-semibold hover:underline"
                    >
                      GitHub 월간 Trending
                    </a>{' '}
                    오픈소스의 추천 목록을 살펴보거나 저장소 이름으로 직접 찾을 수 있습니다.
                  </p>
                </div>

                <div className="feature-source-tabs" role="tablist" aria-label="코드 이슈 찾기 방식">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={featureSourceMode === 'recommended'}
                    onClick={() => {
                      setFeatureSourceMode('recommended');
                      setRepositoryIssuesError("");
                      resetFeatureIssueFilters();
                    }}
                    className={`feature-source-tab ${featureSourceMode === 'recommended' ? 'feature-source-tab-active' : ''}`}
                  >
                    추천 이슈
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={featureSourceMode === 'repository'}
                    onClick={() => {
                      setFeatureSourceMode('repository');
                      setRepositoryIssuesError("");
                      resetFeatureIssueFilters();
                    }}
                    className={`feature-source-tab ${featureSourceMode === 'repository' ? 'feature-source-tab-active' : ''}`}
                  >
                    저장소로 찾기
                  </button>
                </div>

                {featureSourceMode === 'recommended' ? (
                  <>
                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full md:max-w-md">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Icons.Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={featureRepoSearch}
                      onChange={(e) => setFeatureRepoSearch(e.target.value)}
                      placeholder="코드 이슈, 저장소, 기술 검색"
                      className="search-input w-full bg-white border focus:border-[#3f6fd9] focus:ring-1 focus:ring-[#3f6fd9] pl-9 pr-4 py-2 text-xs text-[#1f2933] outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="recommendation-sync-summary">
                    <span>
                      {featureRecommendationsLoading
                        ? "GitHub 이슈를 불러오는 중"
                        : <>총 <strong>{filteredFeatureIssues.length}개</strong>의 추천 이슈</>}
                    </span>
                    {recommendationLoadedAtText && !featureRecommendationsLoading && (
                      <small>{recommendationLoadedAtText} 동기화</small>
                    )}
                    <button
                      type="button"
                      onClick={refreshFeatureRecommendations}
                      disabled={featureRecommendationsLoading}
                    >
                      새로고침
                    </button>
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
                    <div>
                      <strong>실제 GitHub 이슈를 확인하고 있습니다.</strong>
                      <span>열린 이슈와 저장소 라벨을 기준으로 추천 목록을 구성합니다.</span>
                    </div>
                  </div>
                )}

                {featureRecommendationsError && !featureRecommendationsLoading && (
                  <div className="recommendation-status recommendation-status-error" role="alert">
                    <Icons.Alert className="w-4 h-4 shrink-0" />
                    <div>
                      <strong>추천 이슈를 불러오지 못했습니다.</strong>
                      <span>{featureRecommendationsError}</span>
                    </div>
                    <button type="button" onClick={refreshFeatureRecommendations}>다시 시도</button>
                  </div>
                )}

                {featureRecommendationFailures.length > 0 && !featureRecommendationsLoading && (
                  <div className="recommendation-partial-notice" role="status">
                    일부 저장소를 불러오지 못해 나머지 저장소의 이슈만 표시합니다.
                  </div>
                )}

                {!featureRecommendationsLoading && !featureRecommendationsError && (
                  <IssueRecommendationGrid
                    issues={filteredFeatureIssues}
                    interestedTasks={interestedTasks}
                    onSelectIssue={openIssueDetail}
                    onToggleInterest={toggleTaskInterest}
                  />
                )}
                  </>
                ) : (
                  <div className="space-y-5">
                    <section className="issue-import-panel" aria-labelledby="repository-search-heading">
                      <h3 id="repository-search-heading">저장소 추천 이슈 찾기</h3>
                      <p>GitHub의 <code>owner/repository</code> 이름을 입력하면 기여하기 적합한 열린 이슈를 선별합니다.</p>

                      <form className="issue-import-form" onSubmit={loadRepositoryRecommendations}>
                        <div className="issue-import-input-wrap">
                          <Icons.Github className="w-4 h-4" />
                          <input
                            type="text"
                            value={repositoryQuery}
                            onChange={(event) => {
                              setRepositoryQuery(event.target.value);
                              setRepositoryIssuesError("");
                            }}
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
                        <div className="issue-import-error" role="alert">
                          <Icons.Alert className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{repositoryIssuesError}</span>
                        </div>
                      )}

                      <div className="issue-import-note">
                        공개 상태이며 GitHub에서 라이선스가 확인되는 저장소만 지원합니다.
                      </div>
                    </section>

                    {repositoryIssuesLoading && (
                      <div className="recommendation-status" role="status">
                        <span className="recommendation-status-spinner" aria-hidden="true" />
                        <div>
                          <strong>저장소의 열린 이슈를 확인하고 있습니다.</strong>
                          <span>라벨, 담당자, 본문 내용과 최근 업데이트를 기준으로 정렬합니다.</span>
                        </div>
                      </div>
                    )}

                    {repositoryIssueResult && !repositoryIssuesLoading && (
                      <>
                        <div className="repository-search-summary">
                          <img src={repositoryIssueResult.repository.ownerAvatarUrl} alt="" />
                          <div>
                            <a href={repositoryIssueResult.repository.url} target="_blank" rel="noreferrer">
                              {repositoryIssueResult.repository.fullName}
                            </a>
                            <p>{repositoryIssueResult.repository.description}</p>
                            <span>
                              {repositoryIssueResult.repository.language} · {repositoryIssueResult.repository.license.id} · 별 {repositoryIssueResult.repository.stars.toLocaleString()}개
                            </span>
                          </div>
                          <strong>{repositoryIssues.length}개 추천</strong>
                        </div>

                        <div className="relative w-full md:max-w-md">
                          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <Icons.Search className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            value={featureRepoSearch}
                            onChange={(event) => setFeatureRepoSearch(event.target.value)}
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
                          onSelectIssue={openIssueDetail}
                          onToggleInterest={toggleTaskInterest}
                          emptyText={repositoryIssues.length === 0
                            ? "이 저장소에서 추천할 만한 열린 이슈를 찾지 못했습니다."
                            : "현재 필터에 맞는 이슈가 없습니다."}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {featureViewMode === 'detail' && isGithubIssue && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setFeatureViewMode('repo-list');
                      setFeatureSourceMode(
                        issueData.source === 'github-import' || issueData.source === 'github-repository'
                          ? 'repository'
                          : 'recommended'
                      );
                    }}
                    className="inline-flex items-center gap-1 text-xs text-[#3f6fd9] font-semibold hover:underline"
                  >
                    <Icons.ArrowLeft className="w-3 h-3 text-[#3f6fd9]" />
                    {issueData.source === 'github-import' || issueData.source === 'github-repository'
                      ? '저장소 이슈 목록으로 돌아가기'
                      : '코드 이슈 목록으로 돌아가기'}
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
                      <span className={`imported-issue-state ${issueData.status === 'Closed' ? 'imported-issue-state-closed' : ''}`}>
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
                      className={`issue-assignment-status ${issueAssignees.length > 0 ? "issue-assignment-status-assigned" : "issue-assignment-status-available"}`}
                      role="status"
                    >
                      {issueAssignees.length > 0 ? (
                        <>
                          <Icons.Alert className="w-4 h-4 shrink-0" />
                          <div className="issue-assignment-copy">
                            <strong>담당자 {issueAssignees.length}명이 지정되어 있습니다.</strong>
                            <span>이미 작업 중일 수 있으니 중복 기여 여부를 먼저 확인하세요.</span>
                          </div>
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
                            style={{
                              borderColor: `#${label.color}`,
                              backgroundColor: `#${label.color}18`
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </header>

                  <header className="codex-analysis-header">
                    <div>
                      <span className="codex-analysis-kicker">핵심 정리</span>
                      <h3 id="codex-analysis-heading">이슈 핵심 분석</h3>
                    </div>
                  </header>

                  {codexAnalysisLoading && (
                    <div className="codex-analysis-loading" role="status">
                      <span className="codex-analysis-spinner" aria-hidden="true" />
                      <div>
                        <strong>이슈 범위를 분석하고 있습니다.</strong>
                        <span>첫 분석은 최대 1분 정도 걸릴 수 있습니다.</span>
                      </div>
                    </div>
                  )}

                  {codexAnalysisError && !codexAnalysisLoading && (
                    <div className="codex-analysis-error" role="alert">
                      <Icons.Alert className="w-4 h-4 shrink-0" />
                      <span>{codexAnalysisError}</span>
                      <button type="button" onClick={() => analyzeIssueWithCodex(issueData.url)}>
                        다시 분석
                      </button>
                    </div>
                  )}

                  {codexAnalysis && !codexAnalysisLoading && (
                    <div className="codex-analysis-content">
                      <div className="codex-analysis-summary">
                        <span>AI 요약</span>
                        <p>{codexAnalysis.summaryKo}</p>
                      </div>

                      <div className="codex-analysis-metrics">
                        <div>
                          <span>예상 난이도</span>
                          <strong>{codexAnalysis.difficulty.level}</strong>
                          <small>신뢰도 {codexAnalysis.difficulty.confidence}</small>
                        </div>
                        <div>
                          <span>작업 유형</span>
                          <strong>{codexAnalysis.workType}</strong>
                          <small>{codexAnalysis.cached ? "캐시된 분석" : "새로 분석됨"}</small>
                        </div>
                      </div>

                      <p className="codex-analysis-rationale">{codexAnalysis.difficulty.rationale}</p>

                      <div className="codex-analysis-grid">
                        <div>
                          <h4>먼저 확인할 순서</h4>
                          <ol>
                            {codexAnalysis.firstSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
                          </ol>
                        </div>
                        <div>
                          <h4>필요한 기술</h4>
                          {codexAnalysis.requiredSkills.length > 0 ? (
                            <div className="codex-analysis-skills">
                              {codexAnalysis.requiredSkills.map(skill => <span key={skill}>{skill}</span>)}
                            </div>
                          ) : <p className="codex-analysis-empty">이슈 본문만으로 특정하기 어렵습니다.</p>}

                          <h4 className="codex-analysis-subheading">예상 수정 영역</h4>
                          {codexAnalysis.likelyAreas.length > 0 ? (
                            <ul>{codexAnalysis.likelyAreas.map(area => <li key={area}>{area}</li>)}</ul>
                          ) : <p className="codex-analysis-empty">확정할 수 있는 파일 정보가 없습니다.</p>}
                        </div>
                      </div>

                      {codexAnalysis.risks.length > 0 && (
                        <div className="codex-analysis-risks">
                          <h4>주의할 점</h4>
                          <ul>{codexAnalysis.risks.map(risk => <li key={risk}>{risk}</li>)}</ul>
                        </div>
                      )}

                      <footer className="codex-analysis-footer">
                        <span>저장소 라벨과 이슈 본문을 바탕으로 정리한 결과입니다. 실제 작업 전 기여 가이드를 확인하세요.</span>
                        <a href={issueData.url} target="_blank" rel="noreferrer">
                          GitHub 원문 열기
                          <Icons.ArrowRight className="w-3 h-3" />
                        </a>
                      </footer>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* 3-C. FEATURE/BUG FIX DETAILED CHANGES AND PR TRACKING VIEW */}
            {featureViewMode === 'detail' && issueData?.source === 'mock-recommendation' && (
              <div className="space-y-6 animate-fade-in">

                {/* Back Link */}
                <div>
                  <button
                    onClick={() => setFeatureViewMode('repo-list')}
                    className="inline-flex items-center gap-1 text-xs text-[#3f6fd9] font-semibold hover:underline"
                  >
                    <Icons.ArrowLeft className="w-3 h-3 text-[#3f6fd9]" />
                    코드 이슈 목록으로 돌아가기
                  </button>
                </div>

                {/* Top Area: GitHub Issue Target Panel */}
                <div className="detail-panel p-5 space-y-4">
                  <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">버그 개선 대상 및 분석 현황</span>

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-[#f6f8fa] text-[#24292f] px-2.5 py-0.5 rounded-full font-mono border border-[#d0d7de]">
                          {issueData?.url ? issueData.url.split('/')[4] + "/" + issueData.url.split('/')[5] : "query/issues"}
                        </span>
                        <span className="text-xs bg-[#ffebe9] text-[#cf222e] px-2.5 py-0.5 rounded-full font-bold border border-[#ffc1c0]">
                          {issueData?.status || "Open"}
                        </span>
                        <span className="text-xs bg-[#eef3ff] text-[#3f6fd9] px-2.5 py-0.5 rounded-full font-semibold border border-[#d5e0f8]">
                          {issueData?.difficulty || "난이도 미분류"}
                        </span>
                        <span className="text-xs bg-white text-[#57606a] px-2.5 py-0.5 rounded-full font-semibold border border-[#d0d7de]">
                          {issueData?.typeLabel || issueData?.workType || "유형 미분류"}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#1f2933]">{issueData?.title}</h3>
                    </div>

                    {/* Tech Badges Container */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(issueData?.techs || []).map(tech => (
                        <span key={tech} className="text-[10px] font-bold bg-[#eef3ff] text-[#3f6fd9] border border-[#d5e0f8] px-2.5 py-1 rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Translation Summary in Korean */}
                  <div className="metric-card p-4 rounded-md border space-y-1.5">
                    <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">이슈 요약</span>
                    <p className="text-xs text-[#24292f] leading-relaxed font-sans">
                      {issueData?.summary}
                    </p>
                  </div>
                </div>

                {/* Dynamic PR Selection and Scope View Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Left Column: Candidates PR Cards */}
                  <div className="lg:col-span-5 space-y-4">
                    <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">연관 PR 및 대조 히스토리</span>

                    <div className="space-y-2.5">
                      {prsList.map(pr => {
                        const isSelected = selectedPrId === pr.id;
                        return (
                          <div
                            key={pr.id}
                            className={`rounded-md border transition-all relative overflow-hidden ${
                              isSelected
                                ? "bg-white border-[#c7d0ca] shadow-md ring-1 ring-[#3f6fd9]"
                                : "bg-[#f7faf8] border-[#d6ddd8] hover:border-[#c7d0ca] hover:bg-white"
                            }`}
                          >
                            {pr.resolving && (
                              <div className="absolute top-0 right-0 bg-[#3f6fd9] text-white font-bold text-[9px] px-2 py-0.5 rounded-bl">
                                해결 PR
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedPrId(pr.id)}
                              className="w-full text-left p-4"
                              aria-pressed={isSelected}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-mono font-bold text-[#3f6fd9]">PR #{pr.number}</span>
                                <PRStatusBadge status={pr.status} size="sm" />
                              </div>
                              <h4 className="text-xs font-bold text-[#1f2933] leading-snug mb-2 line-clamp-2">{pr.title}</h4>
                              <p className="text-[11px] text-[#637083] line-clamp-2 font-sans">{pr.summary}</p>
                            </button>
                            <div className="border-t border-[#e3e8e5] px-4 py-2 flex justify-end">
                              <a
                                href={pr.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3158b0] hover:underline"
                              >
                                GitHub PR 열기
                                <Icons.ArrowRight className="w-3 h-3 text-[#3f6fd9]" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Code Scope Detailed Workspace */}
                  <div className="lg:col-span-7 space-y-4">
                    <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">선택 PR 코드 요약 및 기여 가이드</span>

                    {(() => {
                      const currentPr = prsList.find(p => p.id === selectedPrId);
                      if (!currentPr) return null;
                      return (
                        <div className="detail-panel p-6 space-y-5">

                          {/* PR Title Header */}
                          <div className="soft-divider border-b pb-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <span className="text-xs font-mono font-bold text-[#57606a]">Pull Request #{currentPr.number} 변경 내역</span>
                                <h3 className="text-sm font-bold text-[#1f2933] leading-snug">{currentPr.title}</h3>
                              </div>
                              <a
                                href={currentPr.url}
                                target="_blank"
                                rel="noreferrer"
                                className="link-action shrink-0 inline-flex items-center justify-center gap-1.5 bg-white font-bold text-xs px-3 py-2 rounded-md border transition-colors"
                              >
                                PR 원문
                                <Icons.ArrowRight className="w-3 h-3 text-[#3f6fd9]" />
                              </a>
                            </div>
                          </div>

                          {/* Detailed Summary */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[#1f2933]">핵심 변경사항 요약</h4>
                            <p className="metric-card text-xs text-[#637083] leading-relaxed p-4 rounded-md border">
                              {currentPr.summary}
                            </p>
                          </div>

                          {/* Exact File line numbers */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[#1f2933] flex items-center gap-1.5">
                              <Icons.Code className="w-4 h-4 text-[#3f6fd9]" />
                              코드 변경 범위
                            </h4>
                            <div className="space-y-2">
                              {currentPr.changes.map((change, idx) => (
                                <a
                                  key={idx}
                                  href={change.url || `${currentPr.url}/files`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="code-panel p-3.5 border font-mono text-xs text-slate-300"
                                  title="GitHub PR에서 변경 파일 열기"
                                >
                                  <span className="text-[#5eead4] font-semibold block mb-1">{change.file}</span>
                                  <span className="flex items-start justify-between gap-3">
                                    <span className="text-slate-400 text-[11px] leading-relaxed">→ {change.action}</span>
                                    <Icons.ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-slate-500" />
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>

                          {/* Repository Guide Link */}
                          <div className="soft-divider space-y-3 pt-4 border-t">
                            <h4 className="text-xs font-bold text-[#1f2933]">레포지토리 기여 가이드</h4>
                            <div className="metric-card border rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-[#1f2933] block">{issueData?.repo}</span>
                                <span className="text-[11px] text-[#57606a] block">작업 전 공식 기여 규칙과 브랜치, 테스트, PR 기준을 확인하세요.</span>
                              </div>
                              {issueData?.contributionGuideUrl ? (
                                <button
                                  type="button"
                                  onClick={() => openTranslatedGuide(issueData?.repo)}
                                  className="link-action inline-flex items-center justify-center gap-1.5 bg-white font-bold text-xs px-3.5 py-2 rounded-md border shadow-sm transition-colors"
                                >
                                  번역 가이드 보기
                                  <Icons.ArrowRight className="w-3 h-3 text-[#3f6fd9]" />
                                </button>
                              ) : (
                                <span className="text-[11px] text-[#6e7781]">공식 기여 가이드 없음</span>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ==================== 4. GUIDE EXPLORER VIEW (NEWLY ADDED PAGE) ==================== */}
        {view === 'guide' && (
          <div className="space-y-6 animate-fade-in">

            {/* Page Header */}
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
                </a>{' '}
                오픈소스 목록을 살펴보거나 저장소 이름으로 <code className="bg-[#eaeef2] text-[#24292f] px-1.5 py-0.5 rounded font-mono text-[11px] border border-[#d0d7de]">CONTRIBUTING.md</code>를 직접 찾을 수 있습니다.
              </p>
            </div>

            <div className="feature-source-tabs" role="tablist" aria-label="기여 가이드 찾기 방식">
              <button
                type="button"
                role="tab"
                aria-selected={guideSourceMode === 'trending'}
                onClick={() => {
                  setGuideSourceMode('trending');
                  setGuideRepositorySearchError("");
                  setGuideDetailError("");
                  setGuideRepoKey(currentKey => (
                    guideRepositories.some(repo => repo.fullName === currentKey)
                      ? currentKey
                      : guideRepositories[0]?.fullName || ""
                  ));
                }}
                className={`feature-source-tab ${guideSourceMode === 'trending' ? 'feature-source-tab-active' : ''}`}
              >
                월간 Trending
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={guideSourceMode === 'repository'}
                onClick={() => {
                  setGuideSourceMode('repository');
                  setGuideRepositorySearchError("");
                  setGuideDetailError("");
                  setGuideRepoKey(guideRepositoryResult?.repository.fullName || "");
                }}
                className={`feature-source-tab ${guideSourceMode === 'repository' ? 'feature-source-tab-active' : ''}`}
              >
                저장소로 찾기
              </button>
            </div>

            {/* Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* Left Side: Repos Selector with Search */}
              <div className="lg:col-span-4 space-y-4">
                {guideSourceMode === 'trending' ? (
                <div className="bg-white border border-[#d0d7de] rounded-md p-4 space-y-3 shadow-sm">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400">
                      <Icons.Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={guideSearchQuery}
                      onChange={(e) => setGuideSearchQuery(e.target.value)}
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
                    {!guideRepositoriesLoading && !guideRepositoriesError && filteredGuideRepos.map(repo => {
                      const isSelected = guideRepoKey === repo.fullName;
                      return (
                        <button
                          key={repo.fullName}
                          onClick={() => {
                            setGuideRepoKey(repo.fullName);
                            setGuideDetailError("");
                          }}
                          className={`w-full text-left p-3 rounded-md transition-all flex items-center gap-3 ${
                            isSelected
                              ? "bg-[#eaeef2] text-slate-900 border border-[#d0d7de] shadow-sm font-semibold"
                              : "text-[#57606a] hover:bg-[#f6f8fa]"
                          }`}
                        >
                          <img src={repo.ownerAvatarUrl} alt="" className="w-8 h-8 rounded-md border border-[#d0d7de] shrink-0" />
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <span className="text-xs block text-[#24292f] truncate">{repo.fullName}</span>
                            <span className="text-[10px] text-[#57606a] block truncate">
                              Trending #{repo.trendingRank} · {repo.language} · {repo.license?.id}
                            </span>
                          </div>
                          <Icons.ArrowRight className="w-3 h-3 text-slate-400" />
                        </button>
                      );
                    })}
                    {!guideRepositoriesLoading && !guideRepositoriesError && filteredGuideRepos.length === 0 && (
                      <div className="py-8 text-center text-xs text-[#57606a]">검색 결과가 없습니다.</div>
                    )}
                  </div>
                </div>
                ) : (
                  <section className="guide-repository-search-panel" aria-labelledby="guide-repository-search-heading">
                    <h3 id="guide-repository-search-heading">저장소 기여 가이드 찾기</h3>
                    <p><code>owner/repository</code> 이름으로 공식 기여 문서를 불러옵니다.</p>

                    <form className="guide-repository-search-form" onSubmit={searchContributionGuide}>
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

              {/* Right Side: Contributing Guideline README Renderer */}
              <div className="lg:col-span-8">
                {(() => {
                  if (
                    (guideSourceMode === 'trending' && guideRepositoriesLoading)
                    || guideDetailLoading
                    || guideRepositorySearchLoading
                  ) return (
                    <div className="bg-white border border-[#d0d7de] rounded-md p-10 text-center text-[#57606a] space-y-2">
                      <span className="recommendation-status-spinner inline-block" aria-hidden="true" />
                      <p className="text-xs">공식 기여 문서를 읽고 한국어로 정리하고 있습니다.</p>
                    </div>
                  );
                  if (guideDetailError) return (
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
                  );
                  const targetRepo = selectedGuideResult?.repository
                    ? {
                        ...selectedGuideRepository,
                        ...selectedGuideResult.repository,
                        trendingRank: selectedGuideRepository?.trendingRank
                          || selectedGuideResult.repository.trendingRank
                      }
                    : selectedGuideRepository;
                  const gl = selectedGuideResult?.guide;
                  if (!targetRepo || !gl) return (
                    <div className="bg-white border border-[#d0d7de] rounded-md p-8 text-center text-[#57606a]">
                      {guideSourceMode === 'trending'
                        ? "왼쪽 목록에서 기여 가이드를 선택해 주세요."
                        : "왼쪽에 저장소 이름을 입력해 기여 가이드를 불러오세요."}
                    </div>
                  );
                  return (
                    <div className="bg-white border border-[#d0d7de] rounded-md shadow-sm overflow-hidden">

                      {/* Readme Header */}
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

                      {/* Readme Body */}
                      <div className="p-6 space-y-6">

                        {/* Title and Intro */}
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
                          <p className="text-xs text-[#24292f] leading-relaxed">{gl.summaryKo}</p>
                        </div>

                        {/* Branch Pattern Segment */}
                        {gl.branchPattern && <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-[#57606a] uppercase">작업용 권장 브랜치 유형</h4>
                            <button
                              onClick={() => handleCopyToClipboard(gl.branchPattern, "브랜치명")}
                              className="text-xs text-[#3f6fd9] hover:underline font-semibold flex items-center gap-1"
                            >
                              <Icons.Clipboard className="w-3 h-3 text-[#3f6fd9]" />
                              복사
                            </button>
                          </div>
                          <div className="bg-[#f6f8fa] border border-[#d0d7de] rounded p-3 font-mono text-[11px] text-[#24292f] overflow-x-auto">
                            {gl.branchPattern}
                          </div>
                        </div>}

                        {/* Commit Convention Segment */}
                        {gl.commitConvention && <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-[#57606a] uppercase">권장 커밋 헤더 메시지</h4>
                            <button
                              onClick={() => handleCopyToClipboard(gl.commitConvention, "커밋 메시지")}
                              className="text-xs text-[#3f6fd9] hover:underline font-semibold flex items-center gap-1"
                            >
                              <Icons.Clipboard className="w-3 h-3 text-[#3f6fd9]" />
                              복사
                            </button>
                          </div>
                          <div className="bg-[#f6f8fa] border border-[#d0d7de] rounded p-3 font-mono text-[11px] text-[#24292f] break-all">
                            {gl.commitConvention}
                          </div>
                        </div>}

                        {/* Sequential Steps */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-[#57606a] uppercase">기여 프로세스 핵심 단계</h4>
                          <div className="space-y-3">
                            {gl.steps.map((step, idx) => (
                              <div key={idx} className="flex gap-3 items-start bg-[#f6f8fa] p-3.5 rounded border border-[#d0d7de]">
                                <span className="text-xs font-bold bg-[#24292f] text-white px-2 py-0.5 rounded">
                                  {idx + 1}
                                </span>
                                <div className="space-y-1">
                                  <h5 className="text-xs font-bold text-[#24292f]">{step.title}</h5>
                                  <p className="text-[11px] text-[#57606a] leading-relaxed">{step.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Submit Checklist */}
                        <div className="pt-5 border-t border-[#d0d7de] space-y-3">
                          <h4 className="text-xs font-bold text-[#57606a] uppercase">제출 전 최종 체크리스트</h4>
                          <div className="space-y-2">
                            {gl.checklist.map((item, idx) => {
                              const checkedKey = `${guideRepoKey}-${idx}`;
                              const isChecked = !!guideCompletedChecklist[checkedKey];
                              return (
                                <label
                                  key={idx}
                                  onClick={() => setGuideCompletedChecklist(prev => ({ ...prev, [checkedKey]: !prev[checkedKey] }))}
                                  className="flex items-start gap-2.5 p-2 rounded hover:bg-[#f6f8fa] cursor-pointer select-none"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    readOnly
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

                        {/* Quick Action Button */}
                        <div className="pt-4 border-t border-[#d0d7de] flex justify-end">
                          <button
                            onClick={() => triggerToast(`'${targetRepo.fullName}' 기여 준비 항목을 확인했습니다.`)}
                            className="bg-[#3f6fd9] hover:bg-[#3158b0] text-white font-bold text-xs px-4 py-2 rounded-md shadow-sm border border-[rgba(27,31,36,0.15)] flex items-center gap-1.5 transition-all"
                          >
                            기여 준비 확인
                            <Icons.ArrowRight className="w-3 h-3 text-white" />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>

          </div>
        )}

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
    </>
  );
}
