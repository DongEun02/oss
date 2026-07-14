import { handleGithubIssueRequest } from "../server/geminiIssueService.js";

export default function handler(request, response) {
  return handleGithubIssueRequest(request, response);
}
