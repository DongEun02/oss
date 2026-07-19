import { handleAnalyzeIssueRequest } from "../server/issueAnalysisService.js";

export default function handler(request: any, response: any) {
  return handleAnalyzeIssueRequest(request, response);
}
