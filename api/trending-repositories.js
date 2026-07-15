import { handleTrendingRepositoriesRequest } from "../server/trendingRepositoriesService.js";

export default function handler(request, response) {
  return handleTrendingRepositoriesRequest(request, response);
}
