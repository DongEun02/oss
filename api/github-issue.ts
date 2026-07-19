import { handleGithubIssueRequest } from "../server/issueAnalysisService.js";

export default function handler(request: any, response: any) {
  return handleGithubIssueRequest(request, response);
}
