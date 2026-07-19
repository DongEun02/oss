import { handleAnalyzeIssueRequest, handleGithubIssueRequest } from "./issueAnalysisService.js";
import {
  handleRecommendedIssuesRequest,
  handleRepositoryIssuesRequest
} from "./githubRecommendationsService.js";
import { handleTranslationStatusRequest } from "./translationStatusService.js";
import { handleContributionGuideRequest } from "./contributionGuideService.js";
import { handleTrendingRepositoriesRequest } from "./trendingRepositoriesService.js";

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
    server.middlewares.use("/api/recommended-issues", (request: any, response: any) => (
      handleRecommendedIssuesRequest(request, response, {
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
    server.middlewares.use("/api/trending-repositories", (request: any, response: any) => (
      handleTrendingRepositoriesRequest(request, response, {
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
