import { handleRepositoryIssuesRequest } from "../server/githubRecommendationsService.js";

export default function handler(request: any, response: any) {
  return handleRepositoryIssuesRequest(request, response);
}
