import { handleAnalyzeIssueRequest, handleGithubIssueRequest } from "./issueAnalysisService.js";
import { handleRepositoryIssuesRequest } from "./githubRecommendationsService.js";
import { handleTranslationStatusRequest } from "./translationStatusService.js";
import { handleContributionGuideRequest } from "./contributionGuideService.js";

export const localApiPlugin = (options: any) => ({
  name: "oss-local-api",
  configureServer(server: any) {
    server.middlewares.use("/api/analyze-issue", (request: any, response: any) => (
      handleAnalyzeIssueRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/github-issue", (request: any, response: any) => (
      handleGithubIssueRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/translation-status", (request: any, response: any) => (
      handleTranslationStatusRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/repository-issues", (request: any, response: any) => (
      handleRepositoryIssuesRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/contribution-guide", (request: any, response: any) => (
      handleContributionGuideRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
  }
});
