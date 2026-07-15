import { handleAnalyzeIssueRequest, handleGithubIssueRequest } from "./issueAnalysisService.js";
import { handleRecommendedIssuesRequest } from "./githubRecommendationsService.js";
import { handleTranslationStatusRequest } from "./translationStatusService.js";

export const localApiPlugin = options => ({
  name: "oss-local-api",
  configureServer(server) {
    server.middlewares.use("/api/analyze-issue", (request, response) => (
      handleAnalyzeIssueRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/github-issue", (request, response) => (
      handleGithubIssueRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/translation-status", (request, response) => (
      handleTranslationStatusRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/recommended-issues", (request, response) => (
      handleRecommendedIssuesRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
  }
});
