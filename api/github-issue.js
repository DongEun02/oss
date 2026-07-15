import { handleGithubIssueRequest } from "../server/issueAnalysisService.js";

export default function handler(request, response) {
  return handleGithubIssueRequest(request, response);
}
