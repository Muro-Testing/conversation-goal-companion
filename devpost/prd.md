---
doc: prd
status: approved
---

# Working concept (name not chosen) — Product Requirements

A phone-first voice and text companion that turns conversations about a personal goal into a saved, visible plan.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey

1. The person opens the app to a new chat. A left-side navigation area gives access to earlier chats and the Life Dashboard. On a phone, these areas remain reachable from the chat screen.
2. The person can type in the chat, or tap the voice button at the bottom right. Voice mode shows a large speaking face and begins a spoken conversation. The assistant opens with a friendly greeting using the person's name, such as “Hey, [name], how's it going?”
3. The person talks about a goal alongside the real-life context around it. The conversation appears as a live transcript.
4. The X on the voice window closes voice and returns to the same chat without ending it or creating a summary. The spoken transcript stays in that chat so the person can continue by typing or starting voice again. The separate “End conversation & save” action creates a summary and updates the dashboard. A saved chat can be continued later by sending another message.
5. The person opens the Life Dashboard to see the goal and the useful context, constraints, ordered steps, tasks, and progress pulled from the conversation. They can view the plan as a visual map or an ordered task view.
6. In every chat, typed and voice conversations can use the saved dashboard, including its goal, next step, task status, and progress. A new chat also receives compact context from up to four recent chats, including their summaries and recent exchanges when useful. If the person clearly says they completed a task, the plan marks it complete; the summary names that change and dashboard progress updates. If completion is unclear, the task stays open. Earlier chats stay in history.

Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## Screens and Layout

- **Chat:** Opens to a new conversation. The conversation is the main area; the left-side navigation provides access to saved chats and the Life Dashboard. The person can type or start voice mode with a bottom-right button.
- **Voice mode:** A large speaking face takes focus while the assistant and person talk. A live transcript is visible during the session. The X closes the voice window and returns the transcript to the active chat; the separate end-and-save button creates a summary.
- **Life Dashboard:** Shows multiple saved goals. The person selects one to view as a visual map or ordered task list, with clear progress and editable steps.
- **Saved chat:** Opening an earlier chat shows its conversation and latest written summary. Sending a message continues that same chat.

Source: `scope.md > Inspiration & Identity`, `scope.md > The POC Boundary`.

## Look and Feel

Aim for a polished, clear, high-quality feel inspired by the refinement of major consumer technology brands, while keeping the app's own identity. Use smooth, considered motion and interactions. The dashboard should use color, shapes, and concise labels to make the plan understandable at a glance. The learner described the visual direction as “very transparent”; its exact visual treatment can be decided during implementation. One polished visual mode is enough for the demo; light, dark, and colorful mode switching is not a POC requirement.

Source: `scope.md > Inspiration & Identity` and the PRD visual-direction discussion.

## Features and Behavior

### Conversation

- A person can send typed messages in a new chat.
- A person can tap the bottom-right voice button to enter voice mode. The app shows a large speaking face and starts the spoken exchange.
- The assistant starts a new conversation with a friendly, personal greeting that uses the person's name.
- During voice chat, the person can see the conversation transcript appear live.
- When the person ends a conversation, the app keeps the full conversation in chat history and displays a written summary as the final text in that chat.
- Closing the voice window with X returns to the active chat without summarizing or marking the chat ended; the person can continue there by text or voice.
- A saved chat remains resumable. Sending a message reopens it without removing its existing transcript or summary.
- The summary captures the useful outcome of the conversation, so the person can see what was understood without losing access to the full exchange.
- The summary identifies any task completion the person clearly reported. Unclear statements do not mark a task complete.

**Acceptance criteria**

- [ ] From a new chat, a person can send a typed message and see it in the conversation.
- [ ] Tapping the voice button opens the speaking-face view and starts a spoken conversation.
- [ ] During voice mode, spoken conversation text appears in the transcript while the session is in progress.
- [ ] Ending the session leaves the complete transcript in that chat and adds a readable written summary as the final chat text.
- [ ] Closing voice with X adds the recognized turns to the active chat, creates no summary, and leaves the composer ready for a follow-up message.
- [ ] Sending a message after a saved summary continues the same chat and receives a reply.
- [ ] Reopening the saved chat shows both the complete transcript and its summary.
- [ ] When a person clearly reports completing a task in conversation, the final summary names it and the dashboard marks that task complete; an unclear statement leaves the task open.

Source: `scope.md > The Core Loop`, `scope.md > The POC Boundary`, and the PRD conversation discussion.

### Life Dashboard and Continuing Context

- The dashboard presents the demo goal with useful context and constraints, ordered steps, tasks, and a visible progress state.
- The person can switch between a visual map and an ordered task view of the same plan.
- A later conversation can use relevant context from the earlier conversation and update the same goal plan.
- Typed and voice assistants both receive the saved dashboard's goal, next step, completed and open tasks, life context, constraints, and progress.
- A new chat receives bounded continuity from up to four recent chats, including unsummarized recent exchanges, so details can carry forward before a summary is created.
- A clear completion statement in a later conversation marks its matching task complete and updates visible progress.
- Chat history remains available when the dashboard is updated.

**Acceptance criteria**

- [ ] After the first demo conversation, the dashboard shows the side-business goal, relevant context or constraints, ordered steps, tasks, and a progress state.
- [ ] Switching between map and task views shows the same underlying goal and steps in both views.
- [ ] After a second conversation adds information, the dashboard visibly reflects the update to the existing goal plan.
- [ ] A task reported as complete in a later conversation is marked complete and reflected in dashboard progress.
- [ ] Both conversations remain accessible in chat history after the second conversation updates the plan.
- [ ] A new chat can correctly refer to a relevant detail from an earlier chat and use the current dashboard step without asking the person to repeat it.

Source: `scope.md > What "Working" Looks Like`, `scope.md > The POC Boundary`.

## States and Boundaries

- **First use:** The demo focuses on one person and one side-business goal. The assistant greets the person by name.
- **During a conversation:** The transcript appears live. Closing voice with X keeps the recognized turns in the current chat without creating a summary.
- **After a conversation:** An explicit end-and-save action adds a written summary checkpoint and updates the dashboard. The chat remains available to continue later.
- **Task progress:** A task is marked complete only when the person clearly says in a conversation that it is done. The summary shows the update; unclear statements leave the task open.
- **Voice connection error:** If voice cannot connect, the app shows a connection error.
- **Empty history:** Before any conversation has been saved, the chat history has no earlier chats to open. The first new chat remains available.
- **Scope boundary:** The demo's main story follows two conversations about one goal, while the dashboard can keep multiple goals found in different conversations. It does not listen outside a conversation the person starts.

Source: `scope.md > The Core Loop`, `scope.md > The POC Boundary`, and the PRD conversation discussion.

## Product Decisions

- Start on a new chat, with earlier chats and the Life Dashboard available from the left-side navigation.
- Let the person choose between typed chat and voice. Voice starts from a bottom-right button and focuses the screen on a large speaking face.
- Greet the person by name in a friendly, conversational way.
- At the end of a chat, show a written conversation summary while retaining the full conversation in chat history.
- Keep the X as a voice-window dismiss action; only the separate end-and-save action creates a summary. Keep saved chats resumable.
- Give typed and voice assistants the dashboard's current goal, next step, progress, tasks, and relevant continuity from recent chats.
- Update task completion and dashboard progress from clear completion statements in conversation; show the update in the end-of-chat summary and leave unclear cases open.
- Prioritize one polished visual mode and smooth motion for the demo; mode switching is not important for the first version.
- Use the parent's side-business goal as the representative two-conversation demo.
- Test whether voice continues when the phone is locked. If it is unreliable or requires substantial extra work, keep the demo voice session in the foreground with the screen on and defer locked-screen support.

## What We're Building

- A phone-first new-chat screen with typed and voice conversation.
- A voice mode with a large speaking face, live transcript, and a visible connection error if voice cannot connect.
- Saved full transcripts and written end-of-chat summaries.
- A Life Dashboard that can retain multiple goals and show the selected goal as a visual map or ordered task view.
- Relevant context carried across chats, with the dashboard and recent conversation details guiding both typed and voice replies.
- Saved history containing both demo conversations.

## Deferred From the POC

- External Messenger connections, accounts, and cross-device sync, because the proof can be shown inside one app for one person.
- Custom diagram or theme editing and light/dark/colorful mode switching, because the first demo needs one polished view.
- A guarantee of voice operation while the phone is locked or the app is in the background; feasibility must be checked in the technical plan before promising it.

## Possible Later Enhancements

Add options to compare or restore dashboard versions, connect external messaging services, and support accounts and cross-device sync.

## Non-Goals

- Importing or monitoring conversations from external Messenger apps.
- Listening continuously outside a conversation the person started.
- Supporting every type of life goal in the first demo.
- Letting people build their own diagrams or visual themes in the first demo.

Source: `scope.md > Later`, `scope.md > Explicitly Cut`.

## Open Questions

- Can voice conversation work reliably with the phone locked or the app in the background? **Test early in `5-build`; if unreliable or complex, use the agreed foreground-with-screen-on demo limitation and defer background support.**
- The project name has not been chosen. **Participant-authored; can be chosen separately from product behavior.**
