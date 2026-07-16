import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icons } from "../components/Icons.jsx";
import { getRepoVisual } from "../data/content.js";

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

export function LandingPage() {
  const navigate = useNavigate();
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const featureSectionRef = useRef(null);

  useEffect(() => {
    if (featuresVisible) return undefined;
    const section = featureSectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      setFeaturesVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setFeaturesVisible(true);
      observer.disconnect();
    }, { threshold: 0.18 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [featuresVisible]);

  return (
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
        ref={featureSectionRef}
        className={`landing-feature-section${featuresVisible ? " is-visible" : ""}`}
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
            style={{ "--landing-card-index": 0 }}
            onClick={() => navigate("/translations")}
          >
            <div className="landing-feature-visual" aria-hidden="true">
              <div className="landing-translation-preview">
                <div><strong>EN</strong><span /><span /><span /></div>
                <div><strong>KO</strong><span /><span /><span /></div>
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
            style={{ "--landing-card-index": 1 }}
            onClick={() => navigate("/issues")}
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
            style={{ "--landing-card-index": 2 }}
            onClick={() => navigate("/guides")}
          >
            <div className="landing-feature-visual" aria-hidden="true">
              <div className="landing-guide-preview">
                <div><strong><Icons.FileText className="w-3 h-3" /> CONTRIBUTING.md</strong><span>KO</span></div>
                <div className="landing-guide-lines"><span /><span /><span /></div>
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
  );
}
