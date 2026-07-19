import { handleRecommendedIssuesRequest } from "../server/githubRecommendationsService.js";

export default function handler(request: any, response: any) {
  return handleRecommendedIssuesRequest(request, response);
}
