import { handleTrendingRepositoriesRequest } from "../server/trendingRepositoriesService.js";

export default function handler(request: any, response: any) {
  return handleTrendingRepositoriesRequest(request, response);
}
