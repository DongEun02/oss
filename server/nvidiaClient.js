export const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

const DEFAULT_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const extractJsonObject = value => {
  const content = String(value || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  if (!content) throw new Error("NVIDIA_EMPTY_RESPONSE");

  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fencedMatch?.[1], content].filter(Boolean);
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim());
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // Try the next JSON-shaped candidate.
    }
  }

  throw new Error("NVIDIA_INVALID_RESPONSE");
};

const readErrorMessage = async response => {
  try {
    const body = await response.json();
    return String(body?.error?.message || body?.detail || body?.message || "");
  } catch {
    return "";
  }
};

export const generateNvidiaJson = async ({
  apiKey,
  model = DEFAULT_NVIDIA_MODEL,
  prompt,
  schema,
  maxTokens = 8192,
  timeoutMs = 90_000,
  apiUrl = process.env.NVIDIA_API_URL || DEFAULT_API_URL
}) => {
  if (!apiKey) throw new Error("NVIDIA_KEY_MISSING");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `Return exactly one valid JSON object. Do not use Markdown or add explanatory text. The JSON must satisfy this schema:\n${JSON.stringify(schema)}`
          },
          { role: "user", content: prompt }
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: maxTokens,
        stream: false,
        chat_template_kwargs: {
          enable_thinking: true,
          medium_effort: true,
          force_nonempty_content: true
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const providerMessage = await readErrorMessage(response);
      const error = new Error(`NVIDIA_HTTP_${response.status}`);
      error.providerMessage = providerMessage;
      throw error;
    }

    const data = await response.json();
    return extractJsonObject(data?.choices?.[0]?.message?.content);
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("NVIDIA_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
