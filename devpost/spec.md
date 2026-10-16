---
doc: spec
status: approved
---

# Working concept (name not chosen) — Technical Spec

## How This Works, In Plain Language

The app is a phone-friendly website. It keeps the person's chats and goal plan in that browser, so this first demo does not need accounts or a database. A small server component protects the Google key and checks the shared demo password.

For voice, the browser asks the server for a short-lived, single-use Google connection token. The browser then uses that token to talk to Gemini Live and show the incoming and outgoing transcript. The permanent Google API key stays on the server. Closing the voice window with X stops the live microphone session, returns its transcript to the active chat, and leaves that chat open without summarizing it. The separate end-and-save action sends the transcript and current plan to Gemini Flash. Flash returns a summary and proposed plan updates in a fixed JSON shape. The app checks that shape, saves the summary, and updates the dashboard. A saved chat can be continued later by sending a message. For a task to become complete, the transcript must contain a clear statement from the person; uncertain statements leave it open.

For example, if the existing plan has “Choose a first service to sell” and the person later says “I picked workflow audits as my first service,” the end-of-chat organizer can connect that statement to the task, mark it complete, and show the next step. This is how the app sorts a mixed conversation: it extracts goal, context, constraints, next actions, and completion evidence into named fields, then validates those fields before changing the plan.

## Architecture and Decisions

- **Web app:** Next.js App Router, React, and TypeScript. It serves the phone-first screens and a few small server routes from one project.
- **Runtime:** Node.js 22. The current Google GenAI JavaScript SDK v3 requires Node.js 22 or newer.
- **Google AI:** `@google/genai`; `gemini-3.8-live` for real-time voice and `gemini-3.8-flash` for typed chat and end-of-chat organization.
- **Hosting:** Vercel Hobby for this personal, noncommercial hackathon demo. It supplies HTTPS needed for phone microphone access. The first screen uses our own shared-password gate; we will not use Vercel's paid password-protection add-on.
- **Browser storage:** `localStorage` holds the display name, complete text conversations, summaries, and multiple goal plans. Data stays in that browser and is not synchronized. Clearing the site's browser data removes it. The app does not keep audio recordings.
- **Visuals:** CSS variables and transitions plus small inline SVG illustrations for the goal map and speaking face. One carefully finished visual theme; no extra animation library is needed for the prototype.
- **Voice screen behavior:** First test an active voice session with the phone locked. If the browser or phone suspends it, or making it reliable needs substantial work, use the agreed demo fallback: keep the page open and screen on. Do not claim locked-screen operation until the real-phone test succeeds.

## Core Journey and Component Responsibilities

1. **Access gate:** The first screen asks for the shared demo password. A server route verifies it and sets a signed, `HttpOnly`, `Secure` (in production), `SameSite` session cookie. Page data and every server route require that session.
2. **First-use profile:** Ask for a display name once, save it in the browser, and use it for the greeting. No email or account is required.
3. **Chat workspace:** Start a new chat by default. A compact navigation drawer opens saved chats or the Life Dashboard. Typed messages go to the chat route; transcripts and summaries remain visible in the conversation. Sending another message reopens a previously saved chat.
4. **Voice stage:** After the person taps the microphone button and grants permission, request a live token, connect to Gemini Live over the documented browser WebSocket protocol, show a large animated speaking face, and append both speakers' recognized text to the active chat. X stops voice and returns to that chat without ending or summarizing it. The separate end-and-save action invokes the organizer. Show a useful connection error and offer typed chat if connection fails.
5. **Conversation organizer:** When the person explicitly ends and saves a conversation, send the transcript and current plan to the organizer route. Show the written summary as the latest checkpoint in the chat. Apply the validated plan update and retain the full transcript even if organization fails; offer a retry for the summary/dashboard update. Keep the chat resumable after saving.
6. **Life Dashboard:** Render the same plan as either a visual map or an ordered task list. Show completed versus open work and derive progress from task statuses.
7. **Shared continuity:** Supply the dashboard's goal, why, next step, completed and open tasks, context, constraints, and progress to both typed and voice assistants. For a new chat, add compact context from up to four recent chats, including a saved summary and a few recent exchanges. Do not send all old raw chats by default. At the end-and-save checkpoint, merge new context and task evidence into the same plan while keeping earlier chat history unchanged.

## Data Model and Data Flow

```ts
type Profile = { displayName: string };
type Message = {
  id: string;
  role: "user" | "assistant" | "summary";
  text: string;
  createdAt: string;
};
type Chat = {
  id: string;
  startedAt: string;
  endedAt?: string;
  messages: Message[];
  summary?: string;
};
type GoalPlan = {
  goal: string;
  why?: string;
  context: string[];
  constraints: string[];
  tasks: Array<{
    id: string;
    title: string;
    status: "open" | "complete";
    completionEvidence?: string;
  }>;
  updatedAt: string;
};
```

Persist one versioned app state object in `localStorage`; derive progress from completed tasks divided by all tasks. The browser owns chats and plans. The server owns only environment secrets and short-lived request handling, not a conversation database. Live audio is streamed to Google and played in the browser; only text transcripts are retained. Closing voice appends recognized turns to the open chat without invoking the organizer. At an explicit end-and-save checkpoint, send the current transcript and existing plans to the organizer. Gemini returns the complete revised version of each goal discussed, including the ordered task list, so it can add, rename, reorder, combine, or remove steps as the conversation calls for. The server applies those revisions by goal and task IDs, then validates the response shape. When Gemini marks a step complete, the server checks only that its evidence quote appears in the person's current-chat transcript; it does not require particular words or task-name matching rules. Chats with a saved summary remain resumable.

## Google Service Contracts

### Live voice token: `POST /api/live-token`

- **Caller:** Authenticated browser after a user gesture and microphone permission.
- **Server-to-Google:** Create a one-use ephemeral token for model `models/gemini-3.8-live`, constrained to audio responses and the approved live configuration. Google documents token creation at `POST https://generativelanguage.googleapis.com/v1beta/auth_tokens`, authenticated with the server-only `GEMINI_API_KEY` header. Use the SDK token API when it supports the required constraints; otherwise use this documented REST route.
- **Browser response:** Return only the ephemeral token name and expiry, never the API key. The browser connects over Google's documented Live API WebSocket protocol using the ephemeral token as the `access_token`; it requests audio output plus `inputAudioTranscription` and `outputAudioTranscription`. The server uses `@google/genai` only to provision the constrained, one-use token.
- The live system instruction also includes the full saved dashboard and compact continuity from up to four recent chats, so voice advice follows the same current steps as typed chat.
- **Limits/failure:** Use the token promptly; its default start window is short. Keep a demo conversation within the documented 15-minute audio-only session limit. On token, network, permission, or quota failure, show the connection state and let the person continue by typing.

### Typed chat: `POST /api/chat`

- **Request:** `{ displayName, currentPlan, priorContext, messages }`, containing the active conversation, the current dashboard, and a bounded digest of up to four recent chats. Do not include other chats' full transcripts.
- **Server-to-Google:** `gemini-3.8-flash` through `@google/genai` `generateContent`, with system instructions to be a warm, grounded accountability companion and not invent completed work.
- **Response:** `{ text }` for the assistant message. The browser appends it to the current chat and persists it locally.
- **Failure:** Keep the user's draft/message and show a retryable connection error; do not erase conversation history.

### Organize a finished chat: `POST /api/organize`

- **Request:** `{ transcript, existingPlan }`.
- **Server-to-Google:** `gemini-3.8-flash` `generateContent` with JSON response mode and a response schema for `{ summary, goals[{id, goal, why, context[], constraints[], motivation[], tasks[{id, title, status, expectation, completionEvidence}], nextStep}] }`.
- **Response:** For each goal discussed, Gemini returns its complete revised plan in the intended order. Existing goal/task IDs preserve identity across title edits and reordering; empty IDs create new records. The server validates the response shape and verifies that evidence for a newly completed step is quoted from a user turn in the current conversation. The app does not limit updates to specific words or fixed step templates.
- **Failure:** Save the transcript first. If generation, parsing, or validation fails, retain the chat and show that its summary/dashboard update needs retrying.

Google's official Live API supports audio input/output and transcription configuration. Gemini structured output can constrain the organizer's JSON, but the app still validates it. Check the specific Google AI Studio project's tier and quota before the live test: Free Tier is currently listed at $0 within its limits, but limits vary and Google states free-tier content may be used to improve products. Paid-tier pricing and data terms differ. Never put `GEMINI_API_KEY` in browser code, chat, or Git.

## Access Gate and Configuration

Required server-only settings:

- `GEMINI_API_KEY`: key from the participant's Google AI Studio project.
- `APP_ACCESS_PASSWORD`: shared password for the demo's first screen.
- `APP_SESSION_SECRET`: random signing secret for the session cookie.

Use local `.env.local` for development and Vercel's private environment-variable settings for previews/production. Commit only `.env.example` with empty placeholders. The password gate is a lightweight judge-demo barrier, not individual accounts or production-grade identity security. Use a long random judge password and share it privately with judges.

## Where It Runs and How Someone Tries It

1. Install Node.js 22, then run `npm install` in the app folder.
2. Copy `.env.example` to `.env.local`, then fill the three local settings privately.
3. Run `npm run dev` and open `http://localhost:3000` on the development computer.
4. For the first phone test, deploy a Vercel Preview over HTTPS and open that preview on the phone; microphone access requires HTTPS or localhost. Keep it private through the Vercel account while testing.
5. For judges, deploy the reviewed version to the Vercel production URL, configure the app password in Vercel's private settings, and provide the URL and password through the Devpost submission. The repository is public as required, but secrets and the private learner profile stay out of it.

Vercel Hobby is listed as free for personal, noncommercial use and includes HTTPS. Confirm the Google key's project quota and billing state before live tests; “free hosting” does not itself make Google API use free. This is a single-participant demo, not a commercial service.

## Visual and Interaction Notes

- Make the chat the clear starting point, with a reachable navigation drawer on narrow screens.
- Give voice mode a calm, prominent animated face and readable live captions; use restrained motion and respect `prefers-reduced-motion`.
- Make the goal map understandable at a glance with a clear goal node, ordered steps, task states, and a visible progress indicator; provide the same information in the task list.
- Keep text contrast and touch targets comfortable on a phone. Use smooth CSS transitions for opening views and updating task states; avoid motion that delays basic actions.

## Annotated File Tree

```text
app/
├── AGENTS.md                       # Next.js-generated guidance for this installed version
├── src/app/
│   ├── page.tsx                    # Access gate, then main chat shell
│   ├── layout.tsx                  # App metadata and shared styling
│   ├── globals.css                 # Theme tokens, responsive layout, motion
│   └── api/
│       ├── access/route.ts         # Verify shared password; issue session
│       ├── live-token/route.ts     # Issue constrained ephemeral Google token
│       ├── chat/route.ts           # Typed response using Gemini Flash
│       └── organize/route.ts       # Summary and validated plan extraction
├── src/components/
│   ├── AccessGate.tsx              # First-screen password form
│   ├── ChatShell.tsx               # Navigation, chat, dashboard switching
│   ├── ConversationView.tsx        # Messages, live transcript, composer
│   ├── VoiceStage.tsx              # Speaking face, audio state, captions
│   ├── GoalMap.tsx                  # Visual map view of the goal plan
│   └── TaskList.tsx                 # Ordered accessible plan view
├── src/lib/
│   ├── auth.ts                      # Password/session checks for routes
│   ├── gemini.ts                    # Server-only Google SDK setup
│   ├── storage.ts                   # Versioned browser persistence
│   ├── context.ts                   # Compact plan context for new chats
│   ├── plan-schema.ts               # Runtime schema and safe merge rules
│   └── transcript.ts                # Transcript assembly and clear evidence
├── .env.example                     # Names only; no secrets
├── .gitignore                       # Ignore .env.local and generated files
├── package.json                     # Scripts and pinned dependency ranges
├── package-lock.json                # Reproducible install
├── README.md                        # Setup, configuration, and demo steps
└── devpost/
    ├── scope.md                     # Approved scope
    ├── prd.md                       # Approved product requirements
    └── spec.md                      # This technical blueprint
```

## Traceability to the PRD

| PRD requirement | Technical implementation |
| --- | --- |
| New chat, previous chats, dashboard navigation | `ChatShell` and browser-persisted `Chat[]` |
| Typed conversation | `/api/chat` with Gemini Flash |
| Live voice, transcript, speaking face, connection error | `VoiceStage`, `/api/live-token`, Live API callbacks and fallback state |
| Full transcript and final written summary | Local `Chat.messages`, `/api/organize`, summary message |
| Multiple goals, useful context, ordered tasks, progress | `GoalPlan[]`, schema-validated extraction, selected-goal map and task list |
| Chats share goal and relevant history; saved chats remain resumable | full dashboard context plus compact context from up to four recent chats |
| Clear completion only | transcript evidence check before marking a task complete |
| Phone-first polished interface | responsive layout, touch-friendly controls, smooth reduced-motion-aware CSS |
| Private phone test then password-protected judge demo | HTTPS Vercel Preview, then app-level shared-password gate on production |

## Failures and Fallbacks

- **Wrong password:** Stay on the gate and show a brief error without revealing which setting is wrong.
- **Microphone denied or Live API unavailable:** Explain how to retry and keep typed chat usable.
- **Live connection drops:** Preserve transcript already received; show connection error and offer typed continuation.
- **Organizer fails or returns invalid data:** Keep the complete chat; do not apply partial plan changes; offer a retry.
- **Local storage unavailable/full:** Tell the person saving is not working and do not claim the new data was saved; keep the current screen state where possible.
- **Phone locks during voice:** Record the real device/browser result. If the session pauses or needs substantial engineering, use the agreed foreground-with-screen-on demo path.
- **API quota or billing restriction:** Show a plain connection/quota message; do not retry in a loop. Verify project tier/quota before the demo.

## What We Deliberately Keep Small

Multiple personal goals in one browser profile, text-only saved records, no external Messenger connection, no account system, no cross-device sync, and no server conversation database. The app uses Google Live for voice and Google Flash for text/organization. It asks for permission before microphone use and does not listen outside a session started by the person. This keeps the build focused on proving that messy real-life conversation can become clear, reviewable plans. Cross-chat continuity uses the dashboard and a compact digest of up to four recent chats; it does not upload every old transcript.

## Sharing Links

- Live demo: https://your-space-live-journal.vercel.app (shared app password required).
- Public source repository: pending publication.
- Public demo video: pending recording and upload.

## Useful Unknown to Test Early

**Will a phone browser keep the live voice session working when the device is locked?** Test with the target phone, browser, and earphones during the first build checkpoint. If it fails or takes substantial extra work, keep the phone awake with the app in front for the hackathon demo. The product requirements remain satisfied for the foreground demo, while the limitation is stated honestly.

**Learning check:** After the first organizer response, inspect one example with the participant: point to a sentence in the transcript, identify which plan field it filled, and check why a task was left open or marked complete. This tests the useful unknown of whether the structured extraction is understandable and trustworthy, not just whether the screen looks finished.

## Official Technical References

- [Gemini 3.8 Live model](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live)
- [Gemini Live API capabilities and transcription](https://ai.google.dev/gemini-api/docs/live-api/capabilities)
- [Gemini Live API WebSocket protocol](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket)
- [Gemini Live API ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini API pricing and data use](https://ai.google.dev/gemini-api/docs/pricing)
- [Google GenAI JavaScript SDK](https://github.com/googleapis/js-genai)
- [Next.js installation requirements](https://nextjs.org/docs/app/getting-started/installation)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)

## Revisions

- 2026-10-13: Phone use showed that the voice-window X incorrectly triggered the end-and-save flow and locked the chat. X now only returns voice turns to the same open chat; explicit end-and-save remains a summary checkpoint, and sending a later message reopens that chat. New typed and voice chats receive the saved dashboard plus bounded continuity from recent chats, including unsummarized exchanges, so active goal details can carry forward.

## Decisions and Open Questions

- **Settled:** Google Gemini Live for voice; Gemini Flash for text and organization; browser-local persistence; custom first-screen shared password; Vercel for the personal, noncommercial demo.
- **Settled fallback:** Try locked-phone voice early; if unreliable or too complex, demonstrate foreground voice with the screen on.
- **Verify before testing:** Check the chosen Google AI Studio project's tier, quota, and billing state. The participant's key has not been supplied to the app yet; do not paste it into Git or chat.
- **Participant decision later:** Choose the project name and the judge password. These do not block the technical blueprint.

## Simplification Decisions

- No hosted database or login: browser-local data is enough for one participant and two demonstration chats.
- No paid Vercel password product: a small app-level gate meets the requested first-screen password behavior.
- No audio archive: keeping text transcript proves the conversation history requirement while limiting stored data.
- No background audio promise: real-device evidence decides whether to include it.
- No separate AI vendor for summaries: one provider keeps the prototype easier to configure and explain.
