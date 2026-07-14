import { handleAnalyzeIssueRequest } from "../server/geminiIssueService.js";

export default function handler(request, response) {
  return handleAnalyzeIssueRequest(request, response);
}
