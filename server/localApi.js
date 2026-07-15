import { handleAnalyzeIssueRequest, handleGithubIssueRequest } from "./issueAnalysisService.js";
import {
  handleRecommendedIssuesRequest,
  handleRepositoryIssuesRequest
} from "./githubRecommendationsService.js";
import { handleTranslationStatusRequest } from "./translationStatusService.js";
import { handleContributionGuideRequest } from "./contributionGuideService.js";
import { handleTrendingRepositoriesRequest } from "./trendingRepositoriesService.js";

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
    server.middlewares.use("/api/repository-issues", (request, response) => (
      handleRepositoryIssuesRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/trending-repositories", (request, response) => (
      handleTrendingRepositoriesRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
    server.middlewares.use("/api/contribution-guide", (request, response) => (
      handleContributionGuideRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
  }
});
