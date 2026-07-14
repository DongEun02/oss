import { handleAnalyzeIssueRequest, handleGithubIssueRequest } from "./geminiIssueService.js";
import { handleRecommendedIssuesRequest } from "./githubRecommendationsService.js";
import { handleTranslationStatusRequest } from "./translationStatusService.js";

export const geminiIssueApiPlugin = options => ({
  name: "oss-local-gemini-issue-api",
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
