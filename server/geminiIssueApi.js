import { handleAnalyzeIssueRequest } from "./geminiIssueService.js";

export const geminiIssueApiPlugin = options => ({
  name: "oss-local-gemini-issue-api",
  configureServer(server) {
    server.middlewares.use("/api/analyze-issue", (request, response) => (
      handleAnalyzeIssueRequest(request, response, {
        ...options,
        enforceLoopback: true
      })
    ));
  }
});
