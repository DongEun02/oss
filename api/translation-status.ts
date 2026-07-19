import { handleTranslationStatusRequest } from "../server/translationStatusService.js";

export default function handler(request: any, response: any) {
  return handleTranslationStatusRequest(request, response);
}
