import { useNavigate } from "react-router-dom";
import { useOssApp } from "../app/OssAppContext";
import { Icons } from "../components/Icons";
import { getGithubLoginUrl } from "../services/auth";

const SERVICE_FEATURES = [
  {
    icon: Icons.Search,
    eyebrow: "DISCOVER",
    title: "내 수준에 맞는 첫 기여 찾기",
    description: "문서, 테스트, 타입, 버그, 기능처럼 작업 유형과 언어를 고르면 시작하기 좋은 실제 이슈를 추천합니다.",
    points: ["단계별 성장 경로", "언어별 프로젝트 추천", "담당자·연결 PR·선점 댓글 확인"]
  },
  {
    icon: Icons.Code,
    eyebrow: "UNDERSTAND",
    title: "이슈를 작업 가능한 언어로 이해하기",
    description: "긴 영문 이슈의 핵심을 한국어로 정리하고, 예상 작업 순서와 필요한 기술, 주의할 점을 함께 보여줍니다.",
    points: ["제목·본문 핵심 정리", "기여 가능성 확인", "작업 단계와 위험 요소 안내"]
  },
  {
    icon: Icons.BookOpen,
    eyebrow: "PREPARE",
    title: "프로젝트 규칙 확인하고 준비하기",
    description: "저장소의 CONTRIBUTING.md를 찾아 번역하고 브랜치, 커밋, 테스트, PR 규칙을 제출 전 체크리스트로 정리합니다.",
    points: ["기여 가이드 한국어 번역", "원문과 함께 비교", "제출 전 체크리스트"]
  }
];

const BASIC_FEATURES = [
  "작업 유형과 언어별 단계 추천",
  "저장소 이름 또는 GitHub 이슈 URL로 탐색",
  "이슈 핵심 내용과 예상 작업 분석",
  "프로젝트별 기여 가이드 번역"
];

const GITHUB_FEATURES = [
  "공개 저장소의 언어·의존성·최근 활동 기반 맞춤 추천",
  "관심 있는 이슈와 번역 작업 저장",
  "관심·작업 중·리뷰 중·완료 상태 관리",
  "다른 기기에서도 이어지는 마이페이지 동기화"
];

const CONTRIBUTION_STEPS = [
  { number: "01", title: "나에게 맞는 작업 찾기", description: "언어와 작업 유형을 고르거나 GitHub 경험을 바탕으로 프로젝트를 추천받습니다." },
  { number: "02", title: "지금 참여해도 되는지 확인", description: "담당자, 연결된 PR, 선점 의사가 담긴 댓글을 확인해 작업 중복 가능성을 줄입니다." },
  { number: "03", title: "이슈와 규칙 이해하기", description: "이슈 요약과 예상 작업을 읽고 프로젝트의 기여 규칙과 제출 체크리스트를 준비합니다." },
  { number: "04", title: "기여 과정 이어가기", description: "로그인했다면 관심 작업을 저장하고 진행 상태를 마이페이지에서 관리합니다." }
];

export function AboutPage() {
  const navigate = useNavigate();
  const { authUser } = useOssApp();

  return (
    <div className="about-page animate-fade-in">
      <section className="about-problem" aria-labelledby="about-problem-heading">
        <div>
          <span className="about-section-number">01</span>
          <h1 id="about-problem-heading">좋은 첫 이슈를 찾는 것부터 어렵기 때문에</h1>
        </div>
        <p>
          <code>good first issue</code> 라벨만으로는 난이도, 프로젝트의 응답 속도, 이미 누군가 작업 중인지 알기 어렵습니다.
          기여로는 단순히 이슈를 모으는 데서 끝나지 않고, 지금 시작할 만한 작업인지 판단하는 데 필요한 정보를 함께 보여줍니다.
        </p>
      </section>

      <section className="about-feature-section" aria-labelledby="about-feature-heading">
        <header className="about-section-heading">
          <span className="about-section-number">02</span>
          <div>
            <h2 id="about-feature-heading">첫 기여에 필요한 세 가지 도움</h2>
            <p>찾고, 이해하고, 준비하는 흐름을 한곳에 연결했습니다.</p>
          </div>
        </header>

        <div className="about-feature-grid">
          {SERVICE_FEATURES.map(feature => {
            const FeatureIcon = feature.icon;
            return (
              <article key={feature.title} className="about-feature-card">
                <div className="about-feature-card-top">
                  <span><FeatureIcon className="w-5 h-5" /></span>
                  <small>{feature.eyebrow}</small>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul>{feature.points.map(point => <li key={point}><Icons.Check className="w-3.5 h-3.5" />{point}</li>)}</ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="about-login-section" aria-labelledby="about-login-heading">
        <header className="about-section-heading about-login-heading">
          <span className="about-section-number">03</span>
          <div>
            <h2 id="about-login-heading">GitHub 로그인 전에도, 로그인 후에는 더 개인적으로</h2>
            <p>핵심 탐색 기능은 누구나 사용할 수 있고, 로그인하면 내 경험과 기여 기록이 연결됩니다.</p>
          </div>
        </header>

        <div className="about-access-grid">
          <article className="about-access-card">
            <div className="about-access-title">
              <span><Icons.Home className="w-5 h-5" /></span>
              <div><small>로그인 없이</small><h3>바로 사용할 수 있어요</h3></div>
            </div>
            <ul>{BASIC_FEATURES.map(feature => <li key={feature}><Icons.Check className="w-4 h-4" />{feature}</li>)}</ul>
            <button type="button" onClick={() => navigate("/issues")}>지금 둘러보기</button>
          </article>

          <article className="about-access-card about-access-card-github">
            <div className="about-access-badge">개인화 기능</div>
            <div className="about-access-title">
              <span><Icons.Github className="w-5 h-5" /></span>
              <div><small>GitHub 로그인하면</small><h3>내 경험에 맞춰 이어져요</h3></div>
            </div>
            <ul>{GITHUB_FEATURES.map(feature => <li key={feature}><Icons.Check className="w-4 h-4" />{feature}</li>)}</ul>
            {authUser ? (
              <button type="button" onClick={() => navigate("/issues?source=personalized")}>
                내 맞춤 프로젝트 보기 <Icons.ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <a href={getGithubLoginUrl("/about")}><Icons.Github className="w-4 h-4" /> GitHub로 시작하기</a>
            )}
          </article>
        </div>

        <div className="about-privacy-note">
          <Icons.Check className="w-5 h-5" />
          <div>
            <strong>공개된 GitHub 정보만 사용합니다.</strong>
            <span>공개 저장소, 사용 언어, 최근 공개 활동과 공개된 의존성 파일만 분석하며 비공개 저장소 권한은 요청하지 않습니다.</span>
          </div>
        </div>
      </section>

      <section className="about-process-section" aria-labelledby="about-process-heading">
        <header className="about-section-heading">
          <span className="about-section-number">04</span>
          <div>
            <h2 id="about-process-heading">기여로에서 시작하는 방법</h2>
            <p>무작정 코드를 고치기 전에, 실패 가능성을 줄이는 순서로 안내합니다.</p>
          </div>
        </header>

        <ol className="about-process-list">
          {CONTRIBUTION_STEPS.map(step => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-final-cta">
        <div>
          <span>READY TO CONTRIBUTE?</span>
          <h2>첫 기여, 이제 어디서 시작할지 알 수 있게.</h2>
          <p>내게 맞는 언어와 작업 유형을 고르고 첫 번째 기여 후보를 찾아보세요.</p>
        </div>
        <button type="button" onClick={() => navigate("/issues")}>
          첫 기여 시작하기 <Icons.ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}
