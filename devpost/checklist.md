---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. You can enter the app and keep a typed conversation**
  Becomes usable: The app starts behind the shared password screen, asks for a display name, opens a new chat, lets the person send a message, and keeps chats in the browser after refresh. Earlier chats and the dashboard can be reached from the phone-friendly navigation.
  Why now: This bootstraps the real app while creating the saved conversation path that every later feature uses. A usable chat shell lets us catch navigation and phone layout issues before connecting AI.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Architecture and Decisions`, `spec.md > Core Journey and Component Responsibilities`, `spec.md > Data Model and Data Flow`, `spec.md > Access Gate and Configuration`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Visual and Interaction Notes`, `spec.md > Annotated File Tree`
  Build: Scaffold the Next.js app as part of this slice. Add the shared-password session gate, first-use name, responsive chat/navigation shell, typed-message display, and versioned localStorage for chats. Keep the initial view visually polished and motion restrained. Do not add API secrets to the repo.
  Verify (mechanical): Run `npm run build`; run the app with `npm run dev`; confirm the gate rejects a wrong password, accepts the configured password, a typed message appears, a second chat can be created, and both remain after a browser refresh.
  Learner check: Open the app, enter the demo password and your name, send one message, refresh, then reopen that chat from history. Tell me what feels clear or awkward on the phone-sized layout.
  Commit: `Build protected chat shell with local history`

- [x] **2. A conversation turns into a saved goal plan**
  Becomes usable: A typed conversation gets an AI reply; ending it produces a readable summary and one goal plan with context, constraints, ordered tasks, and progress. The person can switch between the visual map and task list. A second chat can update the same plan, and only clearly reported task completion changes progress.
  Why now: This is the central idea of the project: useful meaning from a mixed conversation becomes something visible and actionable. We validate it before investing in live voice, and can use learner feedback to shape that voice experience.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Conversation`, `prd.md > Life Dashboard and Continuing Context`, `prd.md > Product Decisions`
  Spec ref: `spec.md > Core Journey and Component Responsibilities`, `spec.md > Data Model and Data Flow`, `spec.md > Google Service Contracts`, `spec.md > Failures and Fallbacks`, `spec.md > Traceability to the PRD`, `spec.md > Useful Unknown to Test Early`
  Build: Connect typed chat to Gemini Flash; add the organizer route with constrained JSON output and runtime validation; preserve the full conversation and append its summary at the end; merge validated plan updates; render the map and ordered task view; carry only compact plan context into later chats. Preserve open task status unless clear transcript evidence supports completion.
  Verify (mechanical): Run `npm run build`; run the app with configured Google credentials; complete two chats using the approved side-business demo scenario; confirm the first creates a plan, the second updates that plan, both transcripts and summaries remain, and an ambiguous completion statement leaves the task open.
  Learner check: Read one transcript sentence beside the dashboard and trace how it became a goal, context item, or task. Then tell me whether the map makes the next action obvious.
  Commit: `Turn conversations into a validated goal plan`

- [>] **3. You can talk hands-free and see the conversation become a plan**
  Becomes usable: The person can dismiss the voice window and continue in the same chat without a summary; explicitly ending and saving creates a summary checkpoint, and the chat can still be resumed later. Typed and voice chats both use the saved dashboard and compact context from recent chats. A connection problem leaves typed chat available.
  Why now: Voice depends on the saved conversation and organizer from the earlier slices, so one tested path can handle typed and spoken chats. This is also where we test the important phone-lock uncertainty on the real device.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Conversation`, `prd.md > States and Boundaries`, `prd.md > Product Decisions`
  Spec ref: `spec.md > Architecture and Decisions`, `spec.md > Core Journey and Component Responsibilities`, `spec.md > Google Service Contracts`, `spec.md > Failures and Fallbacks`, `spec.md > Useful Unknown to Test Early`, `spec.md > Visual and Interaction Notes`
  Build: Implemented the server-issued one-use Gemini Live token with `@google/genai`; the browser connects through Google's documented Live API WebSocket protocol to avoid a client SDK startup error. The X now returns voice turns to the same open chat without organizing them; the separate end-and-save action creates a summary checkpoint. Saved chats can be resumed. Typed and live voice prompts receive the dashboard and a bounded digest of four recent chats. Microphone permission, connection errors, and typed fallback remain supported.
  Verify (mechanical): `npm run build`; inspect the X handler to confirm it only appends turns and closes voice; inspect the end handler to confirm it invokes the organizer; inspect the chat endpoint to confirm goal, next step, task progress, and prior-chat context enter the prompt. Then confirm Vercel production reaches Ready and its home route returns HTTP 200.
  Learner check: On the phone, start voice in a chat, share a personal goal and a detail you plan to provide, then press X. Confirm the transcript is in the same chat, no summary was added, and you can type the follow-up detail there. Start a different chat and ask about the goal and detail from before; check that the answer also reflects the dashboard's current next step and tasks. Finally, end and save a session, then send another message in that same saved chat.
  Commit: `Add live voice with transcript and planning fallback`

## Hands-on Checkpoints

- [x] Early usable behavior explored — the learner entered a name, sent “hey,” and refreshed. The no-reply state was expected in slice 1; the phone HTTP preview's UUID crash was found and fixed before continuing.
- [x] Goal-plan traceability — the two linked goal conversations produced the shared dashboard plan; the map and ordered steps were checked.
- [x] Goal visual refinement — the owner reviewed the new category colors and icons on the Life Dashboard and confirmed it looks nicer and better.
- [x] Phone exploration and feedback — voice worked, including with the phone locked; X unexpectedly ended and summarized the chat, while other chats lacked enough dashboard and conversation context.
- [x] Repeat phone continuity check — voice X and same-chat typed continuation passed; a follow-up browser pass confirmed a new chat recalls the active goal/dashboard and a summarized chat continues in place.

## Final Review

- [x] Phone voice X behavior — owner confirmed X returns to the same chat and a typed follow-up works.
- [x] Cross-chat and dashboard continuity — a new chat recalled the active goal and current dashboard context
- [x] Saved-chat continuation — a summarized chat accepted a new message and continued in place
- [x] Final review complete — feedback resolved; the learner confirmed the app is working and ready for submission preparation

## Code Tour and App Map

- [x] Learning activity complete — traced a saved conversation through `finishConversation`, `mergePlans`, and `saveAppState`.
- [x] Optional edit and transfer reflection addressed — no code edit was needed; the value of observable cross-chat checks was already captured in the learner's feedback.
- [x] `devpost/app-map.html` generated from finished code, checked, and opened in Codex, including a project-grounded practice to reuse

Activity and evidence: The learner confirmed on the phone that voice works, including with the screen locked, and reported three continuity problems: X finalized the chat, new chats lacked prior details, and voice advice did not reflect the dashboard clearly. This revision separates voice dismissal from end-and-save and provides the dashboard plus recent-chat context to both typed and voice assistants. On 2026-10-14, the owner confirmed that X dismissal and same-chat typed follow-up work. A follow-up browser pass then confirmed that a new chat recalled the active goal/dashboard and that a summarized chat continued in place. The learner later confirmed the app is working. The guided source route traced `ChatShell.tsx > finishConversation`, `api/organize/route.ts > mergePlan/mergePlans`, and `storage.ts > saveAppState` to show how a saved conversation becomes goal updates and persists in this browser.
Route and stops: Completed with the app map visible: `ChatShell.tsx > finishConversation` → `api/organize/route.ts > mergePlan/mergePlans` → `storage.ts > saveAppState`. `context.ts` remains available as a reference route for the bounded memory sent to later chats.
Edit outcome: Not applicable; no code edit was needed for this walkthrough.
Reflection: Already covered by the learner's feedback identifying cross-chat recall and dashboard continuity as observable checks.
Activity mode: Guided source walkthrough using the app map and Codex editor.

## Revisions

- 2026-10-15 ship preparation: clarified that the judge demo password belongs in Devpost's testing instructions for a password-protected site; no credential value is stored in the repository.
- 2026-10-15 ship preparation: aligned scope, PRD, and spec with the previously approved multiple-goal dashboard; added factual local setup instructions and the verified live-demo URL to the technical docs. `npm run build` passed and the Vercel page returned HTTP 200 behind the app password gate.
- 2026-10-14 visual refinement: after the owner asked for more visual cues, added restrained category colors and small icons to goal selection, active-goal progress, and the map destination. `npm run build` passed; the owner reviewed it and confirmed it looks nicer and better.
- Kept Next.js 16's generated root `AGENTS.md` and checked its installed-version guidance; explicitly make the password-gated home route dynamic so build-time rendering cannot freeze the logged-out view.
- Added a phone HTTP UUID fallback after the learner's first-device check revealed `crypto.randomUUID()` was unavailable on the LAN origin.
- Gemini typed replies, end-of-chat summaries, plan merging, map/steps views, and conservative completion checks were verified with a greeting and two linked goal conversations. Added per-chat deletion and Gemini Live voice with server-issued ephemeral tokens, live captions, and transcript-to-summary handoff. The production build passes; voice remains at the PC learner check before phone validation.
- The client `@google/genai` Live connection displayed `Cannot access 'A' before initialization` on the voice screen. Replaced the browser transport with Google's documented Live API WebSocket protocol while retaining server-side SDK token provisioning. Google then rejected `responseModalities` at the wrong setup level, so it now sits under `generationConfig`; the browser also decodes text and binary server frames and shows close reasons. Verified a token-authenticated Live setup, generated spoken response, and visible browser greeting. The person's spoken transcript, save, summary, and plan update still need the PC learner check.
- Phone feedback on 2026-10-13: pressing X unexpectedly summarized and ended the chat, making follow-up stats hard to add; new chats did not carry enough context; voice guidance did not make the dashboard's next steps visible. Revising the same voice/continuity slice to keep X as a dismiss action, allow saved-chat continuation, and supply dashboard plus bounded recent-chat context to typed and voice assistants. Phone retest remains open.
