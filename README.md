# Development Setup

This repository contains a phone-first Next.js app for typed and live-voice conversations, saved transcripts, and editable goal plans. Chats and plans are stored in the current browser. The server uses Google Gemini for chat replies, voice sessions, and conversation organization.

## Requirements

- Node.js 22 or newer
- A Google Gemini API key
- Git

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Fill in the three settings in `.env.local`:
   - `GEMINI_API_KEY`: Google AI Studio API key.
   - `APP_ACCESS_PASSWORD`: password for the first screen.
   - `APP_SESSION_SECRET`: random secret used to sign the session cookie.
4. Start the app with `npm run dev`.
5. Open `http://localhost:3000`.

Keep `.env.local` private. Do not put API keys, passwords, or session secrets into source files, screenshots, or the public repository.

## Try the main flow

Enter the app password and a display name, then use typed chat or start a voice session. End and save a conversation to create a summary and update the Life Dashboard. The dashboard supports multiple goals and editable tasks. A later chat receives the saved dashboard and a compact selection of recent chat context.

The browser keeps transcripts and plans in its own local storage. They are not synchronized between devices. Clearing this site's browser data removes them. Audio is not saved by this app. Live voice requires microphone permission and an HTTPS page when accessed from a phone.

## Configuration and hosting

The app expects the three server-side settings above in local `.env.local` and in the hosting provider's private environment settings. Never expose `GEMINI_API_KEY` to client-side code. Google API quota, billing, and data terms depend on the Google AI Studio project and its tier.

The current demo is hosted at [your-space-live-journal.vercel.app](https://your-space-live-journal.vercel.app). The first-screen password is a shared demo gate, not an individual account. Devpost's rules require login credentials in the testing instructions when a project is password-protected, so provide the demo password in the submission's judge instructions. Keep the password, Gemini key, and session secret out of the public repository.

## Project documents

- [`devpost/scope.md`](devpost/scope.md): project boundary and core idea.
- [`devpost/prd.md`](devpost/prd.md): user journey and behavior.
- [`devpost/spec.md`](devpost/spec.md): architecture and service details.
- [`devpost/checklist.md`](devpost/checklist.md): build and review record.
- [`devpost/app-map.html`](devpost/app-map.html): offline code route and project map.

See the project documents for the full build configuration and decisions.
