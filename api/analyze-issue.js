import { handleAnalyzeIssueRequest } from "../server/issueAnalysisService.js";

export default function handler(request, response) {
  return handleAnalyzeIssueRequest(request, response);
}
