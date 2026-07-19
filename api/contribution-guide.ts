import { handleContributionGuideRequest } from "../server/contributionGuideService.js";

export default function handler(request: any, response: any) {
  return handleContributionGuideRequest(request, response);
}
