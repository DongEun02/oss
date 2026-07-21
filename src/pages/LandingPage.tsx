import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Icons } from "../components/Icons";
import { getRepoVisual } from "../data/content";

const landingCardStyle = (index: number) => ({
  "--landing-card-index": index
}) as CSSProperties;

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
            기여로에서 첫 오픈소스 기여를<br />
            시작하세요.
          </h1>
          <p className="landing-intro-copy">
            문서 번역부터 기능 추가까지, 내게 맞는 첫 기여를 단계별로 찾을 수 있습니다.<br />
            추천 작업을 고르고 프로젝트별 기여 규칙까지 한곳에서 확인하세요.
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
            <p>첫 기여를 찾거나, 선택한 프로젝트의 제출 규칙을 확인하세요.</p>
          </div>
        </div>

        <div className="landing-feature-grid">
          <button
            type="button"
            className="landing-feature-card"
            style={landingCardStyle(0)}
            onClick={() => navigate("/issues")}
          >
            <div className="landing-feature-visual" aria-hidden="true">
              <div className="landing-issue-preview">
                <div><span>Good first issue</span><em>Open</em></div>
                <b>Fix query cache behavior</b>
              </div>
            </div>
            <div className="landing-feature-body">
              <span className="landing-feature-label">무엇부터 할지 고민된다면</span>
              <h3>첫 기여 찾기</h3>
              <p>문서 번역부터 테스트, 타입 개선, 버그 수정과 기능 추가까지 권장 순서에 따라 내게 맞는 작업을 찾습니다.</p>
              <div className="landing-feature-points"><span>단계별 추천</span><span>실제 작업 분석</span></div>
              <span className="landing-feature-link">첫 기여 찾아보기 <Icons.ArrowRight className="w-3 h-3" /></span>
            </div>
          </button>

          <button
            type="button"
            className="landing-feature-card"
            style={landingCardStyle(1)}
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
