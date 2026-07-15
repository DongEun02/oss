import { handleContributionGuideRequest } from "../server/contributionGuideService.js";

export default function handler(request, response) {
  return handleContributionGuideRequest(request, response);
}
