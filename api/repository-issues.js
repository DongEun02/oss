import { handleRepositoryIssuesRequest } from "../server/githubRecommendationsService.js";

export default function handler(request, response) {
  return handleRepositoryIssuesRequest(request, response);
}
