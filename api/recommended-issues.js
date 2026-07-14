import { handleRecommendedIssuesRequest } from "../server/githubRecommendationsService.js";

export default function handler(request, response) {
  return handleRecommendedIssuesRequest(request, response);
}
