export type Message = {
  id: string;
  role: "user" | "assistant" | "summary";
  text: string;
  createdAt: string;
  source?: "typed" | "voice";
};

export type Chat = {
  id: string;
  startedAt: string;
  endedAt?: string;
  messages: Message[];
  summary?: string;
};

export type GoalPlan = {
  id: string;
  goal: string;
  why?: string;
  nextStep?: string;
  context: string[];
  constraints: string[];
  motivation?: string[];
  tasks: Array<{
    id: string;
    title: string;
    status: "open" | "complete";
    expectation?: string;
    completionEvidence?: string;
    completedBy?: "you" | "companion";
    completedAt?: string;
    manuallyReopenedAt?: string;
  }>;
  updatedAt: string;
};

export type AppState = {
  version: 2;
  profile: { displayName: string };
  chats: Chat[];
  activeChatId: string;
  plans: GoalPlan[];
  activePlanId: string | null;
};
