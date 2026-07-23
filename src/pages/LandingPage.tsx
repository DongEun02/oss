import { useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { Icons } from "../components/Icons";
import { getRepoVisual } from "../data/content";
import { CONTRIBUTION_CATEGORIES } from "../../shared/contributionCategories";

const LANDING_PREVIEW_ISSUES = CONTRIBUTION_CATEGORIES.flatMap(category => (
  category.repositoryNames.slice(0, 2).map(repo => ({
    repo,
    stage: category.stageLabel,
    title: category.description,
    badge: category.title
  }))
));

const LANDING_PREVIEW_LANES = [
  LANDING_PREVIEW_ISSUES.filter((_, index) => index % 2 === 0),
  LANDING_PREVIEW_ISSUES.filter((_, index) => index % 2 === 1)
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-home landing-home-minimal animate-fade-in">
      <section className="landing-intro">
        <button type="button" className="landing-intro-brand" onClick={() => navigate("/")} aria-label="기여로 홈">
          <span><BrandMark /></span>
          <strong>기여로</strong>
        </button>

        <div className="landing-intro-glow" aria-hidden="true" />

        <div className="landing-intro-content">
          <h1>
            <span>기여로에서</span>
            <span><strong className="landing-intro-highlight">첫 오픈소스 기여</strong>를</span>
            <span>시작하세요</span>
          </h1>
          <p className="landing-intro-copy">
            문서 번역부터 기능 추가까지, 내게 맞는 첫 기여를 단계별로 찾을 수 있습니다.<br />
            추천 작업을 고르고 프로젝트별 기여 규칙까지 한곳에서 확인하세요.
          </p>
          <div className="landing-intro-actions">
            <button type="button" className="landing-intro-primary" onClick={() => navigate("/issues")}>
              첫 기여 찾아보기 <Icons.ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" className="landing-intro-secondary" onClick={() => navigate("/about")}>
              기여로 알아보기
            </button>
          </div>
        </div>

        <div className="landing-issue-marquee" aria-hidden="true">
          {LANDING_PREVIEW_LANES.map((lane, laneIndex) => (
            <div className="landing-issue-marquee-lane" key={laneIndex}>
              <div className="landing-issue-marquee-track">
                {[0, 1].map(groupIndex => (
                  <div className="landing-issue-marquee-group" key={groupIndex}>
                    {lane.map(issue => (
                      <div className="landing-issue-marquee-card" key={`${groupIndex}-${issue.repo}`}>
                        <img src={getRepoVisual(issue.repo).image} alt="" />
                        <div>
                          <span>{issue.repo} · {issue.stage}</span>
                          <strong>{issue.title}</strong>
                        </div>
                        <em>{issue.badge}</em>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
