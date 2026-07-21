import React from "react";
import { DIFFICULTY_CARD_LABELS, DIFFICULTY_FILTERS, ISSUE_TYPE_FILTERS, formatGithubDate, getRepoVisual } from "../data/content";
import { Icons } from "./Icons";
import { LanguageFilterBar } from "./LanguageFilterBar";

export const IssueFilters = ({
  language,
  languages,
  onLanguageChange,
  difficulty,
  onDifficultyChange,
  issueType,
  onIssueTypeChange
}: any) => (
  <div className="filter-panel p-3 space-y-3">
    <div className="space-y-2">
      <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider">언어 필터</span>
      <LanguageFilterBar
        selectedLanguage={language}
        onChange={onLanguageChange}
        languages={languages}
      />
    </div>
    <div className="soft-divider pt-3 border-t space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">난이도</span>
        <span className="text-[10px] text-[#6e7781]">저장소 라벨 우선 · 자동 추정</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {DIFFICULTY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onDifficultyChange(value)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              difficulty === value
                ? "bg-[#3f6fd9] text-white border-[#3f6fd9]"
                : "bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
    <div className="soft-divider pt-3 border-t space-y-2">
      <span className="text-[10px] font-bold text-[#57606a] uppercase tracking-wider block">작업 유형</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {ISSUE_TYPE_FILTERS.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => onIssueTypeChange(type)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              issueType === type
                ? "bg-[#3f6fd9] text-white border-[#3f6fd9]"
                : "bg-white text-[#57606a] border-[#d0d7de] hover:bg-[#f6f8fa]"
            }`}
          >
            {type === "All" ? "전체 유형" : type}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const IssueRecommendationGrid = ({
  issues,
  interestedTasks,
  onSelectIssue,
  onToggleInterest,
  emptyText = "현재 조건에 맞는 코드 이슈가 없습니다."
}: any) => (
  <div className="contribution-list">
    {issues.length > 0 ? issues.map((issue: any) => (
      <article
        key={issue.id}
        className="contribution-item"
        onClick={() => onSelectIssue(issue)}
      >
        <div
          className="contribution-cover"
          style={{ background: getRepoVisual(issue.repo).background }}
          aria-hidden="true"
        >
          <span className="contribution-cover-label">
            {(DIFFICULTY_CARD_LABELS as Record<string, string>)[issue.difficultyLevel] || DIFFICULTY_CARD_LABELS.unlabeled}
          </span>
          <span
            className={`contribution-assignee-status ${(issue.assignees?.length || 0) > 0 ? "contribution-assignee-status-assigned" : "contribution-assignee-status-available"}`}
            title={(issue.assignees?.length || 0) > 0
              ? `담당자: ${issue.assignees.map((assignee: any) => assignee.login).join(", ")}`
              : "현재 지정된 담당자가 없습니다."}
          >
            {(issue.assignees?.length || 0) > 0 ? `담당자 ${issue.assignees.length}명` : "담당자 없음"}
          </span>
          <img src={issue.repositoryAvatarUrl || getRepoVisual(issue.repo).image} alt="" />
          <span className="contribution-cover-kind"><Icons.Code className="w-3.5 h-3.5" /> 코드</span>
        </div>

        <div className="contribution-main">
          <div className="contribution-eyebrow">
            <span>{issue.repo}</span>
            <span>·</span>
            <span className="contribution-kind">Issue #{issue.number}</span>
          </div>
          <h3 className="contribution-title">{issue.titleKo || issue.title}</h3>
          <p className="contribution-summary">{issue.summaryKo || issue.summary}</p>
          <div className="contribution-meta">
            <span
              className="contribution-chip contribution-chip-accent"
              title={`${issue.difficultySource === "repository-label" ? "저장소 라벨" : `자동 추정 · 신뢰도 ${issue.difficultyConfidence || "낮음"}`} · ${issue.difficultyReason || "판정 근거 없음"}`}
            >
              {issue.difficulty}
            </span>
            <span className="contribution-chip">{issue.typeLabel}</span>
            {(issue.languageTags || []).map((language: any) => (
              <span key={`${issue.id}-${language}`} className="contribution-chip">{language}</span>
            ))}
            {(issue.techs || []).filter((tech: any) => !(issue.languageTags || []).includes(tech)).slice(0, 2).map((tech: any) => (
              <span key={`${issue.id}-${tech}`} className="contribution-chip">{tech}</span>
            ))}
          </div>
          <div className="contribution-live-meta">
            <span>{formatGithubDate(issue.updatedAt)} 업데이트</span>
            <span>댓글 {issue.comments}개</span>
            <span title="GitHub 이슈 타임라인에서 확인한 연관 PR 수">
              {Number.isInteger(issue.relatedPullRequestCount)
                ? `연관 PR ${issue.relatedPullRequestCount}${issue.relatedPullRequestCountTruncated ? "+" : ""}개`
                : "연관 PR 확인 불가"}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label={interestedTasks[issue.id] ? `${issue.title} 관심 해제` : `${issue.title} 관심 추가`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleInterest(issue, "issue");
          }}
          className={`interest-button ${interestedTasks[issue.id] ? "interest-button-active" : ""}`}
        >
          <Icons.Bookmark filled={!!interestedTasks[issue.id]} className="w-4 h-4" />
        </button>
      </article>
    )) : (
      <div className="empty-list">{emptyText}</div>
    )}
  </div>
);
