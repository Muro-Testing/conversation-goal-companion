import type { AppState, Chat } from "@/lib/types";

const STORAGE_KEY = "goal-companion-state-v1";

export function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createChat(): Chat {
  return {
    id: createId(),
    startedAt: new Date().toISOString(),
    messages: [],
  };
}

export function createInitialState(): AppState {
  const firstChat = createChat();
  return {
    version: 2,
    profile: { displayName: "" },
    chats: [firstChat],
    activeChatId: firstChat.id,
    plans: [],
    activePlanId: null,
  };
}

export function loadAppState(): AppState {
  const fallback = createInitialState();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed: unknown = JSON.parse(saved);
    if (isAppState(parsed)) return parsed;
    if (!isLegacyAppState(parsed)) return fallback;
    const plan = parsed.plan ? { ...parsed.plan, id: typeof parsed.plan.id === "string" ? parsed.plan.id : createId() } : null;
    return {
      version: 2,
      profile: parsed.profile,
      chats: parsed.chats,
      activeChatId: parsed.activeChatId,
      plans: plan ? [plan] : [],
      activePlanId: plan?.id ?? null,
    };
  } catch {
    return fallback;
  }
}

export function saveAppState(state: AppState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function isLegacyAppState(value: unknown): value is Omit<AppState, "version" | "plans" | "activePlanId"> & { version: 1; plan: AppState["plans"][number] | null } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { version?: unknown; profile?: AppState["profile"]; chats?: unknown; activeChatId?: unknown; plan?: unknown };
  return candidate.version === 1
    && Boolean(candidate.profile && typeof candidate.profile.displayName === "string")
    && Array.isArray(candidate.chats)
    && typeof candidate.activeChatId === "string"
    && (candidate.plan === null || (typeof candidate.plan === "object" && candidate.plan !== null));
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppState>;
  return candidate.version === 2
    && Boolean(candidate.profile && typeof candidate.profile.displayName === "string")
    && Array.isArray(candidate.chats)
    && typeof candidate.activeChatId === "string"
    && Array.isArray(candidate.plans)
    && (candidate.activePlanId === null || typeof candidate.activePlanId === "string");
}
