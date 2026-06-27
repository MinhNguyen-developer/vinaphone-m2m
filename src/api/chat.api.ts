export interface ChatStreamEvent {
  type: "token" | "tool_start" | "tool_end" | "done" | "error";
  /** Partial answer text — present on `token` events */
  content?: string;
  /** Tool function name — present on `tool_start` / `tool_end` events */
  name?: string;
  /** Session ID — present on `done` event */
  session_id?: string;
  /** Tool names used — present on `done` event */
  tools_used?: string[];
  /** Error description — present on `error` event */
  message?: string;
}

/** Shared helper: resolve base URL and JWT from local storage */
function resolveBaseAndToken(): { baseUrl: string; token: string | null } {
  const rawUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:3000/api/v1";
  const baseUrl = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  let token: string | null = null;
  try {
    const raw = localStorage.getItem("vinaphone-auth");
    if (raw) {
      token =
        (JSON.parse(raw) as { state?: { token?: string } }).state?.token ??
        null;
    }
  } catch {
    // ignore JSON parse errors
  }
  return { baseUrl, token };
}

/**
 * Stream a chat message to the API gateway and call `onEvent` for each
 * SSE event received. Uses `fetch` with `ReadableStream` so JWT headers
 * can be attached (EventSource does not support custom headers).
 */
export async function streamChat(
  message: string,
  sessionId: string | null,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { baseUrl, token } = resolveBaseAndToken();

  const response = await fetch(`${baseUrl}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, session_id: sessionId ?? undefined }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE lines end with \n\n; process all complete events in the buffer
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            onEvent(JSON.parse(line.slice(6)) as ChatStreamEvent);
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
  }
}

export interface IndexStats {
  sims: number;
  alerts: number;
  groups: number;
  masterSims: number;
  usageHistory: number;
}

/**
 * Trigger a full re-index of all database records into Qdrant.
 * Calls POST /chat/index on the API gateway, which fetches all data from the
 * database and sends it to the AI agent for embedding and storage.
 */
export async function triggerIndex(): Promise<{
  message: string;
  stats: IndexStats;
}> {
  const { baseUrl, token } = resolveBaseAndToken();

  const response = await fetch(`${baseUrl}/chat/index`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json() as Promise<{ message: string; stats: IndexStats }>;
}
