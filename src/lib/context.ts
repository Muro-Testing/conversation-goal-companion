import type { Chat, GoalPlan } from "@/lib/types";

const MAX_PRIOR_CONTEXT = 10000;

const goalSignals = /\b(my goal|goal is|want to|i want|trying to|working toward|aim to|target|plan to|i plan|hope to|my dream|important to me|next step|committed to)\b/i;

function recentMessageContext(chat: Chat, limit = 4): string {
  const messages = chat.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-limit);
  return messages.map((message) => {
    const speaker = message.role === "user" ? "Person" : "Companion";
    return `${speaker}: ${message.text.trim().slice(0, 420)}`;
  }).join("\n");
}

export function buildPriorChatContext(chats: Chat[], activeChatId: string): string {
  const relevantChats = chats
    .filter((chat) => Boolean(chat.summary) || chat.messages.length > 0)
    .sort((first, second) => {
      if (first.id === activeChatId) return -1;
      if (second.id === activeChatId) return 1;
      const latest = (chat: Chat) => chat.messages.at(-1)?.createdAt ?? chat.startedAt;
      return latest(second).localeCompare(latest(first));
    });

  const entries: string[] = [];
  let used = 0;
  const append = (entry: string, budget: { remaining: number }) => {
    const available = Math.min(MAX_PRIOR_CONTEXT - used, budget.remaining);
    if (available <= 80) return;
    const clipped = entry.slice(0, available - 2);
    entries.push(clipped);
    used += clipped.length + 2;
    budget.remaining -= clipped.length + 2;
  };

  // Preserve each chat's saved summary first so older chats survive the context limit.
  const summaryBudget = { remaining: 2400 };
  for (const chat of relevantChats) {
    const summary = (chat.summary ?? chat.messages.filter((message) => message.role === "summary").at(-1)?.text)?.trim();
    if (summary) {
      const label = chat.id === activeChatId ? "Saved summary from this chat" : "Earlier chat summary";
      append(`${label} (${new Date(chat.startedAt).toLocaleDateString("en-GB")}): ${summary.slice(0, 700)}`, summaryBudget);
    }
  }

  // Pull goal and commitment details from the full history, not only the latest turns.
  const goalBudget = { remaining: 6000 };
  for (const chat of relevantChats) {
    const conversation = chat.messages.filter((message) => message.role === "user" || message.role === "assistant");
    const goalDetails = conversation
      .filter((message) => goalSignals.test(message.text))
      .sort((first, second) => Number(second.role === "user") - Number(first.role === "user"))
      .slice(0, 2);
    for (const message of goalDetails) {
      const speaker = message.role === "user" ? "Person" : "Companion";
      append(`Earlier goal detail: ${speaker}: ${message.text.trim().slice(0, 600)}`, goalBudget);
    }
  }

  // Fill remaining space with recent context from every chat, including chats without summaries.
  const recentBudget = { remaining: 1600 };
  for (const chat of relevantChats) {
    const recent = recentMessageContext(chat, 2);
    if (recent) append(`Recent exchange (${new Date(chat.startedAt).toLocaleDateString("en-GB")}):\n${recent}`, recentBudget);
  }

  return entries.length ? entries.join("\n\n") : "No earlier chats have been saved.";
}

export function buildDashboardContext(plans: GoalPlan[], activePlanId: string | null): string {
  if (!plans.length) return "No goal plans have been saved yet.";
  const active = plans.find((plan) => plan.id === activePlanId) ?? plans[0];
  return plans.map((plan) => {
    const tasks = plan.tasks.slice(0, 16);
    const completed = tasks.filter((task) => task.status === "complete");
    const open = tasks.filter((task) => task.status === "open");
    const progress = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
    return [
      `${plan.id === active.id ? "ACTIVE GOAL" : "GOAL"}: ${plan.goal}`,
      plan.why ? `Why it matters: ${plan.why}` : "",
      plan.nextStep ? `Dashboard's next step: ${plan.nextStep}` : "",
      `Progress: ${completed.length} of ${tasks.length} steps complete (${progress}%).`,
      completed.length ? `Completed steps: ${completed.map((task) => task.title).join("; ")}` : "",
      open.length ? `Open steps in order: ${open.map((task) => `${task.title}${task.expectation ? ` (expect: ${task.expectation})` : ""}`).join("; ")}` : "",
      plan.motivation?.length ? `Personal reasons to keep going: ${plan.motivation.join("; ")}` : "",
      plan.context.length ? `Life context: ${plan.context.join("; ")}` : "",
      plan.constraints.length ? `Constraints: ${plan.constraints.join("; ")}` : "",
    ].filter(Boolean).join("\n");
  }).join("\n\n").slice(0, 16000);
}
