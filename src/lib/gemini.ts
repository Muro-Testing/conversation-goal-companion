const MODEL = "gemini-3.8-flash";

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type GeminiOptions = {
  contents: GeminiContent[];
  systemInstruction: string;
  responseSchema?: Record<string, unknown>;
  jsonMode?: boolean;
  maxOutputTokens?: number;
  continueIncomplete?: boolean;
};

export class GeminiRequestError extends Error {
  constructor(readonly status: number | "missing-key" | "invalid-response" | "incomplete-response") {
    super("Gemini request failed");
  }
}

export async function generateGeminiText({
  contents,
  systemInstruction,
  responseSchema,
  jsonMode = false,
  maxOutputTokens = 1200,
  continueIncomplete = false,
}: GeminiOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiRequestError("missing-key");

  const generationConfig: Record<string, unknown> = { maxOutputTokens };
  if (responseSchema || jsonMode) {
    generationConfig.responseFormat = {
      text: {
        mimeType: "APPLICATION_JSON",
        ...(responseSchema ? { schema: responseSchema } : {}),
      },
    };
  }

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig,
      }),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
  } catch {
    throw new GeminiRequestError(0);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errorBody: unknown = await response.json();
      if (errorBody && typeof errorBody === "object" && "error" in errorBody) {
        const providerError = (errorBody as { error?: { message?: unknown } }).error;
        if (typeof providerError?.message === "string") detail = providerError.message.replace(/AIza[\w-]+/g, "[redacted]").slice(0, 180);
      }
    } catch {
      // The status code is enough to present a safe retry message.
    }
    console.warn("Gemini API returned an HTTP error", response.status, detail);
    throw new GeminiRequestError(response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GeminiRequestError("invalid-response");
  }

  if (!payload || typeof payload !== "object") throw new GeminiRequestError("invalid-response");
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== "object") {
    throw new GeminiRequestError("invalid-response");
  }
  const candidate = candidates[0] as { content?: unknown; finishReason?: unknown };
  const content = candidate.content;
  if (!content || typeof content !== "object") throw new GeminiRequestError("invalid-response");
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) throw new GeminiRequestError("invalid-response");
  const text = parts
    .filter((part): part is { text: string } => Boolean(part && typeof part === "object" && "text" in part && typeof part.text === "string"))
    .map((part) => part.text)
    .join("")
    .trim();
  if (!text) throw new GeminiRequestError("invalid-response");

  const finishReason = candidate.finishReason;
  const endedCleanly = /[.!?…][\"'’”)}\]]*\s*$/.test(text);
  const hitTokenLimit = finishReason === "MAX_TOKENS";
  if (hitTokenLimit && !continueIncomplete) throw new GeminiRequestError("incomplete-response");
  if (continueIncomplete && (hitTokenLimit || !endedCleanly)) {
    const continuation = await generateGeminiText({
      contents: [
        ...contents,
        { role: "model", parts: [{ text }] },
        { role: "user", parts: [{ text: "Continue from the exact point where your previous reply stopped. Do not repeat any of it. Finish the incomplete sentence, then complete the reply concisely." }] },
      ],
      systemInstruction,
      maxOutputTokens: 1000,
    });
    const completedText = `${text.trimEnd()} ${continuation.trimStart()}`;
    if (!/[.!?…][\"'’”)}\]]*\s*$/.test(completedText)) throw new GeminiRequestError("incomplete-response");
    return completedText;
  }
  return text;
}

export function publicGeminiError(error: unknown): { status: number; message: string } {
  if (!(error instanceof GeminiRequestError)) {
    return { status: 502, message: "Gemini could not finish that reply. Please try again." };
  }
  if (error.status === "missing-key") {
    return { status: 503, message: "Gemini is not configured on this preview yet." };
  }
  if (error.status === 429) {
    return { status: 429, message: "Gemini is busy or the API quota is reached. Wait a moment, then try again." };
  }
  if (error.status === 400) {
    return { status: 502, message: "Gemini couldn't organize this conversation. Your chat is safe; please retry in a moment." };
  }
  if (error.status === 401 || error.status === 403) {
    return { status: 503, message: "Gemini could not authenticate this preview. Check the server API key configuration." };
  }
  if (error.status === "invalid-response") {
    return { status: 502, message: "Gemini returned an incomplete response. Please try again." };
  }
  if (error.status === "incomplete-response") {
    return { status: 502, message: "Gemini stopped before finishing the reply. Your message is saved; please retry." };
  }
  return { status: 502, message: "Gemini could not connect. Your saved chat is still here, so you can try again." };
}
