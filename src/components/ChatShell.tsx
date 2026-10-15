"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatIcon, MapIcon, MenuIcon, MicIcon, PlusIcon, SparkIcon } from "@/components/Icons";
import { VoiceSession } from "@/components/VoiceSession";
import { buildDashboardContext, buildPriorChatContext } from "@/lib/context";
import { createChat, createId, createInitialState, loadAppState, saveAppState } from "@/lib/storage";
import type { AppState, Chat, GoalPlan, Message } from "@/lib/types";

type View = "chat" | "dashboard";

export function ChatShell() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("chat");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [notice, setNotice] = useState("");
  const [replyError, setReplyError] = useState("");
  const [organizeError, setOrganizeError] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Chat | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const replyAttempts = useRef(new Set<string>());
  const progressAttempts = useRef(new Set<string>());
  const organizeAttempts = useRef(new Set<string>());

  useEffect(() => {
    setState(loadAppState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setStorageWarning(!saveAppState(state));
  }, [hydrated, state]);

  const activeChat = useMemo(
    () => state.chats.find((chat) => chat.id === state.activeChatId) ?? state.chats[0],
    [state.activeChatId, state.chats],
  );
  const priorChatContext = useMemo(
    () => buildPriorChatContext(state.chats, activeChat?.id ?? state.activeChatId),
    [activeChat?.id, state.activeChatId, state.chats],
  );
  const activePlan = useMemo(() => state.plans.find((plan) => plan.id === state.activePlanId) ?? state.plans[0] ?? null, [state.activePlanId, state.plans]);
  const dashboardContext = useMemo(() => buildDashboardContext(state.plans, state.activePlanId), [state.activePlanId, state.plans]);
  const hasName = state.profile.displayName.trim().length > 0;

  const refreshTaskProgress = useCallback(async (chats: Chat[], plans: GoalPlan[]) => {
    const recentTurns = chats.flatMap((chat) => chat.messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map(({ id, role, text, createdAt }) => ({ id, role, text, createdAt, chatId: chat.id })))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .slice(-24);
    const latestUser = recentTurns.filter((message) => message.role === "user").at(-1);
    if (!latestUser || !plans.some((plan) => plan.tasks.some((task) => task.status === "open")) || progressAttempts.current.has(latestUser.id)) return;
    progressAttempts.current.add(latestUser.id);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transcript: recentTurns,
          currentPlans: plans,
        }),
      });
      if (!response.ok) throw new Error("Progress update failed");
      const result = await response.json() as { completedTasks?: Array<{ planId: string; taskId: string; evidence: string }> };
      if (!Array.isArray(result.completedTasks) || !result.completedTasks.length) return;
      const completedAt = new Date().toISOString();
      setState((current) => {
        const plans = current.plans.map((plan) => {
          const tasks = plan.tasks.map((task) => {
            const update = result.completedTasks?.find((candidate) => candidate.planId === plan.id && candidate.taskId === task.id);
            return update && task.status === "open" ? {
              ...task,
              status: "complete" as const,
              completionEvidence: update.evidence,
              completedBy: "companion" as const,
              completedAt,
              manuallyReopenedAt: undefined,
            } : task;
          });
          return { ...plan, updatedAt: completedAt, tasks, nextStep: tasks.find((task) => task.status === "open")?.title ?? "" };
        });
        return {
          ...current,
          plans,
        };
      });
    } catch {
      progressAttempts.current.delete(latestUser.id);
    }
  }, []);

  const requestReply = useCallback(async (chatId: string, messages: Message[], userMessageId: string) => {
    if (replyAttempts.current.has(userMessageId)) return;
    replyAttempts.current.add(userMessageId);
    setIsSending(true);
    setReplyError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: state.profile.displayName,
          plans: state.plans,
          activePlanId: state.activePlanId,
          priorContext: priorChatContext,
          messages: messages.filter((message) => message.role !== "summary").map(({ role, text }) => ({ role, text })),
        }),
      });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok || !result.text) throw new Error(result.error || "Gemini could not reply. Try again.");
      const assistantMessage: Message = { id: createId(), role: "assistant", text: result.text, createdAt: new Date().toISOString() };
      setState((current) => ({
        ...current,
        chats: current.chats.map((chat) => chat.id === chatId ? { ...chat, messages: [...chat.messages, assistantMessage] } : chat),
      }));
      if (state.plans.length) void refreshTaskProgress(state.chats.map((chat) => chat.id === chatId ? { ...chat, messages: [...chat.messages, ...messages.filter((message) => !chat.messages.some((existing) => existing.id === message.id))] } : chat), state.plans);
      setNotice("");
    } catch (error) {
      replyAttempts.current.delete(userMessageId);
      setReplyError(error instanceof Error ? error.message : "Gemini could not connect. Your message is saved; you can try again.");
    } finally {
      setIsSending(false);
    }
  }, [priorChatContext, refreshTaskProgress, state.activePlanId, state.plans, state.profile.displayName]);

  useEffect(() => {
    if (!hydrated || !activeChat) return;
    const lastMessage = activeChat.messages.at(-1);
    if (lastMessage?.role === "user" && lastMessage.source !== "voice") void requestReply(activeChat.id, activeChat.messages, lastMessage.id);
  }, [activeChat, hydrated, requestReply]);

  useEffect(() => {
    if (hydrated && state.chats.length && state.plans.length) void refreshTaskProgress(state.chats, state.plans);
  }, [hydrated, refreshTaskProgress, state.chats, state.plans]);

  function updateChat(chatId: string, transform: (chat: Chat) => Chat) {
    setState((current) => ({
      ...current,
      chats: current.chats.map((chat) => chat.id === chatId ? transform(chat) : chat),
    }));
  }

  function toggleGoalTask(planId: string, taskId: string) {
    setState((current) => {
      const plan = current.plans.find((item) => item.id === planId);
      if (!plan) return current;
      const completedAt = new Date().toISOString();
      const tasks = plan.tasks.map((task) => {
        if (task.id !== taskId) return task;
        if (task.status === "complete") {
          return { ...task, status: "open" as const, completedBy: undefined, completedAt: undefined, completionEvidence: undefined, manuallyReopenedAt: completedAt };
        }
        return { ...task, status: "complete" as const, completedBy: "you" as const, completedAt, manuallyReopenedAt: undefined };
      });
      return {
        ...current,
        plans: current.plans.map((item) => item.id === planId ? { ...item, updatedAt: completedAt, tasks, nextStep: tasks.find((task) => task.status === "open")?.title ?? "" } : item),
      };
    });
  }

  function addGoalTask(planId: string, title: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const updatedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) => {
        if (plan.id !== planId) return plan;
        const tasks = [...plan.tasks, { id: createId(), title: cleanTitle, status: "open" as const }];
        return { ...plan, tasks, nextStep: tasks.find((task) => task.status === "open")?.title ?? "", updatedAt };
      }),
    }));
  }

  function updateGoalTaskTitle(planId: string, taskId: string, title: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const updatedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) => {
        if (plan.id !== planId) return plan;
        const tasks = plan.tasks.map((task) => task.id === taskId ? { ...task, title: cleanTitle } : task);
        return { ...plan, tasks, nextStep: tasks.find((task) => task.status === "open")?.title ?? "", updatedAt };
      }),
    }));
  }

  function moveGoalTask(planId: string, taskId: string, offset: -1 | 1) {
    const updatedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) => {
        if (plan.id !== planId) return plan;
        const tasks = [...plan.tasks];
        const index = tasks.findIndex((task) => task.id === taskId);
        const destination = index + offset;
        if (index < 0 || destination < 0 || destination >= tasks.length) return plan;
        [tasks[index], tasks[destination]] = [tasks[destination], tasks[index]];
        return { ...plan, tasks, nextStep: tasks.find((task) => task.status === "open")?.title ?? "", updatedAt };
      }),
    }));
  }

  function removeGoalTask(planId: string, taskId: string) {
    const updatedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      plans: current.plans.map((plan) => {
        if (plan.id !== planId) return plan;
        const tasks = plan.tasks.filter((task) => task.id !== taskId);
        return { ...plan, tasks, nextStep: tasks.find((task) => task.status === "open")?.title ?? "", updatedAt };
      }),
    }));
  }

  function selectGoal(planId: string) {
    setState((current) => current.plans.some((plan) => plan.id === planId) ? { ...current, activePlanId: planId } : current);
  }

  function chooseChat(chatId: string) {
    setState((current) => ({ ...current, activeChatId: chatId }));
    setView("chat");
    setDrawerOpen(false);
    setNotice("");
    setReplyError("");
    setOrganizeError("");
  }

  function startNewChat() {
    const chat = createChat();
    setState((current) => ({ ...current, chats: [chat, ...current.chats], activeChatId: chat.id }));
    setView("chat");
    setDrawerOpen(false);
    setDraft("");
    setNotice("");
  }

  function deleteChat(chatId: string) {
    setState((current) => {
      const remaining = current.chats.filter((chat) => chat.id !== chatId);
      const chats = remaining.length ? remaining : [createChat()];
      const activeChatId = current.activeChatId === chatId ? chats[0].id : current.activeChatId;
      return { ...current, chats, activeChatId };
    });
    setDeleteTarget(null);
    setNotice("Conversation deleted from this browser.");
  }

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = nameDraft.trim();
    if (!displayName) return;
    setState((current) => ({ ...current, profile: { displayName } }));
  }

  function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !activeChat || isSending || isOrganizing) return;
    const message: Message = {
      id: createId(),
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };
    const messages = [...activeChat.messages, message];
    updateChat(activeChat.id, (chat) => ({ ...chat, endedAt: undefined, messages }));
    setDraft("");
    setNotice("");
    setOrganizeError("");
    void requestReply(activeChat.id, messages, message.id);
  }

  function retryReply() {
    if (!activeChat) return;
    const lastMessage = activeChat.messages.at(-1);
    if (lastMessage?.role === "user") void requestReply(activeChat.id, activeChat.messages, lastMessage.id);
  }

  async function finishConversation(additionalMessages: Message[] = []) {
    const hasNewUserTurn = additionalMessages.some((message) => message.role === "user");
    if (!activeChat || isSending || isOrganizing) return;
    const voiceMessages = additionalMessages.filter((message) => message.role === "user" || message.role === "assistant");
    if (voiceMessages.length) {
      updateChat(activeChat.id, (chat) => ({
        ...chat,
        ...(hasNewUserTurn ? { endedAt: undefined } : {}),
        messages: [...chat.messages, ...voiceMessages],
      }));
    }
    if ((activeChat.endedAt && !hasNewUserTurn) || ![...activeChat.messages, ...voiceMessages].some((message) => message.role === "user")) return;
    if (organizeAttempts.current.has(activeChat.id)) return;
    organizeAttempts.current.add(activeChat.id);
    setIsOrganizing(true);
    setOrganizeError("");
    setReplyError("");
    try {
      const transcript = activeChat.messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .concat(voiceMessages)
        .map(({ role, text, createdAt }) => ({ role: role as "user" | "assistant", text, createdAt }));
      const response = await fetch("/api/organize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript, existingPlans: state.plans, earlierChats: priorChatContext }),
      });
      const result = await response.json() as { summary?: string; plans?: GoalPlan[]; error?: string };
      if (!response.ok || !result.summary) throw new Error(result.error || "The summary could not be created. Try again.");
      const summaryMessage: Message = { id: createId(), role: "summary", text: result.summary, createdAt: new Date().toISOString() };
      setState((current) => ({
        ...current,
        plans: result.plans ?? current.plans,
        activePlanId: current.activePlanId && result.plans?.some((plan) => plan.id === current.activePlanId) ? current.activePlanId : result.plans?.[0]?.id ?? current.activePlanId,
        chats: current.chats.map((chat) => chat.id === activeChat.id
          ? { ...chat, endedAt: summaryMessage.createdAt, summary: result.summary, messages: [...chat.messages, summaryMessage] }
          : chat),
      }));
      setNotice("Summary saved. Your life dashboard is up to date.");
      setView("chat");
    } catch (error) {
      organizeAttempts.current.delete(activeChat.id);
      setOrganizeError(error instanceof Error ? error.message : "The chat is saved, but its summary needs another try.");
    } finally {
      organizeAttempts.current.delete(activeChat.id);
      setIsOrganizing(false);
    }
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function openView(next: View) {
    setView(next);
    setDrawerOpen(false);
  }

  function saveVoiceToCurrentChat(messages: Message[]) {
    setVoiceOpen(false);
    if (!activeChat || !messages.length) {
      setNotice("Voice closed. You can continue this chat whenever you’re ready.");
      return;
    }
    updateChat(activeChat.id, (chat) => ({
      ...chat,
      messages: [...chat.messages, ...messages],
    }));
    setNotice("Voice transcript added to this chat. Continue here whenever you’re ready.");
  }

  const chatItems = [...state.chats].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const activeLabel = activeChat?.messages.find((message) => message.role === "user")?.text;

  return (
    <main className="app-frame">
      {drawerOpen && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
      <aside className={`sidebar ${drawerOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-symbol"><SparkIcon /></span>
          <span className="brand-word">your <span>space</span></span>
          <button className="drawer-close" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}>×</button>
        </div>

        <button className="new-chat-button" onClick={startNewChat}>
          <PlusIcon /><span>New conversation</span>
        </button>

        <div className="nav-group-label">YOUR SPACE</div>
        <button className={`nav-link ${view === "chat" ? "nav-active" : ""}`} onClick={() => openView("chat")}>
          <ChatIcon /><span>Chats</span><span className="nav-count">{state.chats.length}</span>
        </button>
        <button className={`nav-link ${view === "dashboard" ? "nav-active" : ""}`} onClick={() => openView("dashboard")}>
          <MapIcon /><span>Life dashboard</span>
          {state.plans.length > 0 && <span className="nav-dot" />}
        </button>

        <div className="history-heading"><span>RECENT</span><span>{chatItems.length ? chatItems.length.toString().padStart(2, "0") : ""}</span></div>
        <div className="history-list">
          {chatItems.map((chat, index) => {
            const firstMessage = chat.messages.find((message) => message.role === "user")?.text;
            const label = firstMessage ? firstMessage.slice(0, 29) + (firstMessage.length > 29 ? "…" : "") : `Conversation ${chatItems.length - index}`;
            return (
              <div key={chat.id} className={`history-item-wrap ${view === "chat" && activeChat?.id === chat.id ? "history-active" : ""}`}>
                <button className="history-item" onClick={() => chooseChat(chat.id)} title={firstMessage || label}>
                  <span className="history-indicator" />
                  <span className="history-label">{label}</span>
                  {chat.summary && <span className="history-saved" aria-label="Summary saved">•</span>}
                </button>
                <button className="history-delete" onClick={() => setDeleteTarget(chat)} aria-label={`Delete ${label}`} title="Delete conversation">×</button>
              </div>
            );
          })}
        </div>

        <div className="sidebar-bottom">
          <div className="privacy-note"><span className="privacy-dot" /><span>Private to this browser</span></div>
          <div className="profile-chip">
            <span className="profile-avatar">{state.profile.displayName ? state.profile.displayName.slice(0, 1).toUpperCase() : "Y"}</span>
            <span className="profile-copy"><strong>{state.profile.displayName || "Your space"}</strong><small>Personal companion</small></span>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}><MenuIcon /></button>
          <div className="breadcrumb"><span>{view === "chat" ? "Chats" : "Life dashboard"}</span>{view === "chat" && <><span className="breadcrumb-slash">/</span><span className="breadcrumb-current">{activeLabel?.slice(0, 36) || "New conversation"}</span></>}</div>
          <div className="topbar-right"><span className="saved-status"><span /> Saved on this device</span><button className="more-button" aria-label="More options">···</button></div>
        </header>

        {storageWarning && <div className="storage-warning" role="alert">This browser could not save your changes. Check available site storage before continuing.</div>}

        {view === "chat" ? (
          <section className="conversation-layout" aria-label="Conversation">
            <div className="conversation-scroll" key={activeChat?.id}>
              <div className="conversation-inner">
                {!activeChat?.messages.length ? (
                  <div className="welcome-block">
                    <span className="welcome-spark"><SparkIcon /></span>
                    <p className="eyebrow">A moment for you</p>
                    <h1>Hey{hasName ? `, ${state.profile.displayName}` : " there"}.<br />How&apos;s it going?</h1>
                    <p className="welcome-copy">You can start anywhere. What&apos;s been taking up space in your mind lately?</p>
                    <div className="suggestion-row">
                      <span>Maybe it&apos;s a goal</span><span className="suggestion-separator">·</span><span>Maybe it&apos;s everything around it</span>
                    </div>
                  </div>
                ) : (
                  <div className="message-list">
                    {activeChat.messages.map((message) => (
                      message.role === "summary" ? (
                        <article key={message.id} className="summary-card">
                          <div className="summary-label"><SparkIcon /><span>Conversation summary</span></div>
                          <p>{message.text}</p>
                          <time>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</time>
                        </article>
                      ) : (
                        <article key={message.id} className={`message-row message-${message.role}`}>
                          {message.role === "assistant" && <span className="message-avatar"><SparkIcon /></span>}
                          <div className="message-bubble"><p>{message.text}</p><time>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(message.createdAt))}</time></div>
                        </article>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="composer-area">
              {notice && <p className="build-note" role="status">{notice}</p>}
              {isSending && <p className="inline-status" role="status">Thinking this through with you…</p>}
              {replyError && <p className="inline-error" role="alert"><span>{replyError}</span><button type="button" onClick={retryReply} disabled={isSending}>Try again</button></p>}
              {organizeError && <p className="inline-error" role="alert"><span>{organizeError}</span><button type="button" onClick={() => void finishConversation()} disabled={isOrganizing}>Retry summary</button></p>}
              <form className="composer" onSubmit={(event) => sendMessage(event)}>
                <textarea
                  aria-label="Write a message"
                  placeholder={activeChat?.endedAt ? "This chat is saved. Send a message to continue here…" : "Share what’s on your mind…"}
                  value={draft}
                  disabled={isSending || isOrganizing}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKey}
                  rows={1}
                />
                <div className="composer-tools">
                  <span className="composer-hint">{activeChat?.endedAt ? "Summary saved to this chat" : "A space to think, at your pace"}</span>
                  <div className="composer-actions">
                    {!activeChat?.endedAt && activeChat?.messages.some((message) => message.role === "user") && <button type="button" className="finish-button" onClick={() => void finishConversation()} disabled={isSending || isOrganizing}>{isOrganizing ? "Saving summary…" : "End & save summary"}</button>}
                    <button type="submit" className="send-button" disabled={!draft.trim() || isSending || isOrganizing} aria-label="Send message"><span>↑</span></button>
                    <button type="button" className="voice-button" aria-label="Start voice conversation" title="Talk with your space" onClick={() => setVoiceOpen(true)} disabled={isSending || isOrganizing}><MicIcon /></button>
                  </div>
                </div>
              </form>
              <p className="composer-disclaimer">Your thoughts are stored in this browser. You can clear them any time.</p>
            </div>
          </section>
        ) : (
          <LifeDashboard plans={state.plans} activePlanId={activePlan?.id ?? null} onSelectGoal={selectGoal} onReturn={() => openView("chat")} onToggleTask={toggleGoalTask} onAddTask={addGoalTask} onUpdateTask={updateGoalTaskTitle} onMoveTask={moveGoalTask} onRemoveTask={removeGoalTask} />
        )}
      </section>

      {!hasName && hydrated && (
        <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="name-title">
          <form className="name-card" onSubmit={saveName}>
            <span className="name-mark"><SparkIcon /></span>
            <p className="eyebrow">Before we begin</p>
            <h2 id="name-title">What should I call you?</h2>
            <p>A name makes this feel a little more like your space.</p>
            <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="Your first name" maxLength={40} required />
            <button className="primary-button" disabled={!nameDraft.trim()}>Continue <span aria-hidden="true">→</span></button>
            <small>Your name stays in this browser.</small>
          </form>
        </div>
      )}
      {voiceOpen && activeChat && <VoiceSession
        displayName={state.profile.displayName}
        plan={activePlan}
        dashboardContext={dashboardContext}
        priorContext={priorChatContext}
        context={activeChat.messages.filter((message) => message.role !== "summary").slice(-10).map((message) => `${message.role === "user" ? "Person" : "Companion"}: ${message.text.slice(0, 500)}`).join("\n")}
        onDismiss={saveVoiceToCurrentChat}
        onFinish={(messages) => { setVoiceOpen(false); void finishConversation(messages); }}
      />}
      {deleteTarget && <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <section className="confirm-card"><span className="confirm-mark">×</span><p className="eyebrow">CHAT HISTORY</p><h2 id="delete-title">Delete this conversation?</h2><p>The full transcript and its summary will be removed from this browser. Your life dashboard stays saved.</p><div className="confirm-actions"><button type="button" className="cancel-button" onClick={() => setDeleteTarget(null)}>Keep it</button><button type="button" className="delete-confirm-button" onClick={() => deleteChat(deleteTarget.id)}>Delete conversation</button></div></section>
      </div>}
    </main>
  );
}

type GoalTone = "health" | "family" | "money" | "work" | "learning" | "home" | "creative" | "travel" | "other";

function getGoalTheme(goal: string): { tone: GoalTone; icon: string } {
  const text = goal.toLocaleLowerCase();
  if (/health|fitness|\bfit\b|six[ -]?pack|body fat|workout|weight|muscle|exercise|nutrition|running/.test(text)) return { tone: "health", icon: "🌿" };
  if (/family|kid|child|baby|parent|partner|relationship|marriage/.test(text)) return { tone: "family", icon: "🧡" };
  if (/income|money|financial|finance|saving|\bsave\b|debt|invest|trading|\btrade\b/.test(text)) return { tone: "money", icon: "✨" };
  if (/business|career|\bwork\b|\bjob\b|client|professional|automation|company|sales/.test(text)) return { tone: "work", icon: "🧭" };
  if (/learn|study|skill|course|degree|language|research|reading/.test(text)) return { tone: "learning", icon: "📚" };
  if (/museum|travel|trip|visit|holiday|vacation|day out|outing|oxford|journey/.test(text)) return { tone: "travel", icon: "🏛️" };
  if (/home|house|flat|property|move|renovat/.test(text)) return { tone: "home", icon: "🏡" };
  if (/create|write|design|art|music|content|video|book/.test(text)) return { tone: "creative", icon: "🎨" };
  return { tone: "other", icon: "✦" };
}

function LifeDashboard({ plans, activePlanId, onSelectGoal, onReturn, onToggleTask, onAddTask, onUpdateTask, onMoveTask, onRemoveTask }: { plans: GoalPlan[]; activePlanId: string | null; onSelectGoal: (planId: string) => void; onReturn: () => void; onToggleTask: (planId: string, taskId: string) => void; onAddTask: (planId: string, title: string) => void; onUpdateTask: (planId: string, taskId: string, title: string) => void; onMoveTask: (planId: string, taskId: string, offset: -1 | 1) => void; onRemoveTask: (planId: string, taskId: string) => void }) {
  const [view, setView] = useState<"map" | "tasks">("map");
  const [manageSteps, setManageSteps] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskDraft, setNewTaskDraft] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState("");
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const plan = plans.find((item) => item.id === activePlanId) ?? plans[0] ?? null;
  useEffect(() => {
    setManageSteps(false);
    setAddingTask(false);
    setEditingTaskId(null);
    setRemoveTarget(null);
  }, [plan?.id]);
  if (!plan) return <DashboardEmpty hasPlan={false} onReturn={onReturn} />;

  const completed = plan.tasks.filter((task) => task.status === "complete").length;
  const progress = plan.tasks.length ? Math.round((completed / plan.tasks.length) * 100) : 0;
  const nextTask = plan.tasks.find((task) => task.status === "open");
  const nextStep = plan.nextStep || nextTask?.title || "Keep talking it through until the next step feels clear.";
  const activeTheme = getGoalTheme(plan.goal);

  function addStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTaskDraft.trim()) return;
    onAddTask(plan.id, newTaskDraft);
    setNewTaskDraft("");
    setAddingTask(false);
  }

  function saveStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTaskId || !taskDraft.trim()) return;
    onUpdateTask(plan.id, editingTaskId, taskDraft);
    setEditingTaskId(null);
    setTaskDraft("");
  }

  function taskManagement(task: GoalPlan["tasks"][number], index: number) {
    if (!manageSteps) return null;
    return <div className="step-actions" aria-label={`Manage ${task.title}`}>
      <button type="button" onClick={() => onMoveTask(plan.id, task.id, -1)} disabled={index === 0} aria-label={`Move ${task.title} earlier`}>↑</button>
      <button type="button" onClick={() => onMoveTask(plan.id, task.id, 1)} disabled={index === plan.tasks.length - 1} aria-label={`Move ${task.title} later`}>↓</button>
      <button type="button" onClick={() => { setEditingTaskId(task.id); setTaskDraft(task.title); setRemoveTarget(null); }} aria-label={`Rename ${task.title}`}>Edit</button>
      {removeTarget === task.id ? <span className="step-remove-confirm"><span>Remove?</span><button type="button" onClick={() => { onRemoveTask(plan.id, task.id); setRemoveTarget(null); }}>Yes</button><button type="button" onClick={() => setRemoveTarget(null)}>No</button></span> : <button type="button" className="step-remove" onClick={() => { setRemoveTarget(task.id); setEditingTaskId(null); }} aria-label={`Remove ${task.title}`}>Remove</button>}
    </div>;
  }

  function taskLabel(task: GoalPlan["tasks"][number], index: number) {
    if (editingTaskId === task.id) return <form className="step-rename-form" onSubmit={saveStep}><input aria-label="Step name" value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} autoFocus /><button type="submit" disabled={!taskDraft.trim()}>Save</button><button type="button" onClick={() => setEditingTaskId(null)}>Cancel</button></form>;
    return <><strong>{task.title}</strong>{task.expectation && <small>Expect: {task.expectation}</small>}{taskManagement(task, index)}</>;
  }

  return (
    <section className="dashboard-page" data-goal-tone={activeTheme.tone}>
      <header className="dashboard-title-row">
        <div className="dashboard-title-copy"><p className="eyebrow">Your life, in view</p><h1>Life dashboard</h1><p>{plans.length} {plans.length === 1 ? "goal tracked" : "goals tracked"}</p></div>
        <div className="dashboard-progress"><strong>{progress}%</strong><span>of steps complete</span></div>
      </header>
      {plans.length > 1 && <div className="goal-switcher" role="group" aria-label="Choose a goal">{plans.map((item) => {
        const done = item.tasks.filter((task) => task.status === "complete").length;
        const percent = item.tasks.length ? Math.round((done / item.tasks.length) * 100) : 0;
        const theme = getGoalTheme(item.goal);
        return <button key={item.id} type="button" data-goal-tone={theme.tone} aria-pressed={item.id === plan.id} onClick={() => onSelectGoal(item.id)}><span className="goal-chip-icon" aria-hidden="true">{theme.icon}</span><span className="goal-chip-copy"><strong>{item.goal}</strong><span>{percent}% · {done}/{item.tasks.length} steps</span></span></button>;
      })}</div>}
      <section className="goal-overview" data-goal-tone={activeTheme.tone} aria-label="Current goal and progress">
        <div className="goal-overview-copy"><span className="goal-overview-icon" aria-hidden="true">{activeTheme.icon}</span><div><span className="goal-kicker">ACTIVE GOAL</span><h2>{plan.goal}</h2></div></div>
        <div className="progress-track" aria-label={`${completed} of ${plan.tasks.length} steps complete`}><span style={{ width: `${progress}%` }} /></div>
        <div className="progress-caption"><span>{completed} of {plan.tasks.length} steps complete</span><span>Updates as you progress</span></div>
      </section>
      <section className="next-step-card"><div className="next-step-mark"><span>↗</span></div><div><span className="goal-kicker">A GOOD NEXT STEP</span><h2>{nextStep}</h2></div></section>
      <div className="dashboard-view-row"><div><h2>Your path</h2><p>This goal’s steps, shaped by what you tell us.</p></div><div className="dashboard-path-actions"><div className="view-switch" role="group" aria-label="Plan display"><button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button><button type="button" aria-pressed={view === "tasks"} onClick={() => setView("tasks")}>Steps</button></div><button type="button" className="manage-steps-button" aria-pressed={manageSteps} onClick={() => { setManageSteps((current) => !current); setAddingTask(false); setEditingTaskId(null); setRemoveTarget(null); }}>{manageSteps ? "Done" : "Edit steps"}</button></div></div>
      {manageSteps && <div className="step-editor"><div><strong>Make this path yours</strong><span>Rename, reorder, add, or remove a step.</span></div>{addingTask ? <form className="step-add-form" onSubmit={addStep}><input autoFocus aria-label="New step" placeholder="Add a clear next action…" value={newTaskDraft} onChange={(event) => setNewTaskDraft(event.target.value)} /><button type="submit" disabled={!newTaskDraft.trim()}>Add step</button><button type="button" onClick={() => { setAddingTask(false); setNewTaskDraft(""); }}>Cancel</button></form> : <button type="button" className="manage-steps-button" onClick={() => setAddingTask(true)}>＋ Add a step</button>}</div>}
      {view === "map" ? (
        <section className="goal-map" data-goal-tone={activeTheme.tone} aria-label="Goal map">
          <div className="timeline-start"><span className="timeline-start-dot" /><div><span className="goal-kicker">YOU ARE HERE</span><strong>{completed ? `${completed} step${completed === 1 ? "" : "s"} complete` : "Start with the first step"}</strong></div></div>
          {plan.tasks.length ? <ol className="map-task-path">{plan.tasks.map((task, index) => (
            <li key={task.id} className={task.status === "complete" ? "task-complete" : "task-open"}>
              <button type="button" className="path-marker task-toggle" aria-pressed={task.status === "complete"} aria-label={`${task.status === "complete" ? "Reopen" : "Mark complete"}: ${task.title}`} onClick={() => onToggleTask(plan.id, task.id)}>{task.status === "complete" ? "✓" : String(index + 1).padStart(2, "0")}</button>
              <div className="path-copy"><span>{task.status === "complete" ? `DONE${task.completedBy ? ` · ${task.completedBy.toUpperCase()}` : ""}` : index === 0 || plan.tasks.slice(0, index).every((item) => item.status === "complete") ? "UP NEXT" : "LATER"}</span>{taskLabel(task, index)}</div>
            </li>
          ))}</ol> : <p className="map-awaiting">Keep talking about this goal and its first step will appear here.</p>}
          <div className="map-goal-node map-goal-destination"><span className="map-node-icon"><SparkIcon /></span><div><span className="goal-kicker">THE FUTURE YOU ARE BUILDING</span><strong>{plan.goal}</strong></div></div>
        </section>
      ) : (
        <ol className="task-list" aria-label="Ordered goal steps">{plan.tasks.map((task, index) => (
          <li key={task.id} className={task.status === "complete" ? "task-complete" : "task-open"}>
          <button type="button" className="task-number task-toggle" aria-pressed={task.status === "complete"} aria-label={`${task.status === "complete" ? "Reopen" : "Mark complete"}: ${task.title}`} onClick={() => onToggleTask(plan.id, task.id)}>{task.status === "complete" ? "✓" : String(index + 1).padStart(2, "0")}</button>
          <div className="task-copy">{editingTaskId === task.id ? taskLabel(task, index) : <span className="task-title">{task.title}</span>}{editingTaskId !== task.id && task.expectation && <small>Expect: {task.expectation}</small>}{editingTaskId !== task.id && taskManagement(task, index)}</div>
            <span className="task-state">{task.status === "complete" ? task.completedBy ? `Done · ${task.completedBy}` : "Complete" : "Open"}</span>
          </li>
        ))}</ol>
      )}
      {(plan.motivation?.length || plan.why) && <section className="motivation-panel"><span className="goal-kicker">WHY THIS MATTERS TO YOU</span><ul>{(plan.motivation?.length ? plan.motivation : plan.why ? [plan.why] : []).map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}</ul></section>}
      <div className="dashboard-details">
        {plan.context.length > 0 && <section><span className="goal-kicker">LIFE AROUND IT</span><ul>{plan.context.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>}
        {plan.constraints.length > 0 && <section><span className="goal-kicker">THINGS TO WORK AROUND</span><ul>{plan.constraints.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>}
      </div>
      <p className="dashboard-evidence-note">Check off a step yourself, or tell your companion when you complete it.</p>
    </section>
  );
}

function DashboardEmpty({ hasPlan, onReturn }: { hasPlan: boolean; onReturn: () => void }) {
  return (
    <section className="dashboard-empty">
      <div className="dashboard-heading"><p className="eyebrow">Your life, in view</p><h1>Life dashboard</h1><p>A clear view of what matters, and what comes next.</p></div>
      {hasPlan ? <div className="plan-placeholder">Your saved goal map will appear here.</div> : (
        <div className="empty-map-card">
          <div className="map-art" aria-hidden="true">
            <span className="map-orbit orbit-one" /><span className="map-orbit orbit-two" />
            <span className="map-node node-center"><SparkIcon /></span><span className="map-node node-left" /><span className="map-node node-right" /><span className="map-node node-bottom" />
            <span className="map-line line-left" /><span className="map-line line-right" /><span className="map-line line-down" />
          </div>
          <div className="empty-map-copy"><span className="empty-label">YOUR GOALS, IN ONE PLACE</span><h2>Clarity starts with a conversation.</h2><p>Talk about what you want to change in any part of life. Each clear goal gets its own path and steps here.</p><button className="text-button" onClick={onReturn}>Start with a conversation <span>→</span></button></div>
        </div>
      )}
      <div className="dashboard-footnote"><span className="footnote-mark">✳</span><span>Your map grows with you, one conversation at a time.</span></div>
    </section>
  );
}
