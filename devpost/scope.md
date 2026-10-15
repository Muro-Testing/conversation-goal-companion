---
doc: scope
status: approved
---

# Working concept (name not chosen)

A phone-first voice companion that turns everyday conversations about goals into a clear visual plan, then carries useful context into later chats.

## The Unique Kernel
The person can talk naturally about mixed parts of life, while the app remembers what matters and reshapes it into a living visual map of goals, steps, tasks, and progress. Later conversations can update that same map, so the person can see what changed and what to do next.

## Who It's For
For the first demo: a parent managing family responsibilities who wants to build a side business for extra income and could use a patient, reliable way to talk through the goal and stay accountable. This is a representative example, not the only person the broader idea could help. The person may otherwise keep thoughts in separate chats, notes, or in their head.

## The Core Loop
The person opens a chat on their phone and talks naturally with the assistant through earphones. The conversation appears as a live transcript and is saved when they end it. The app sorts useful details from the conversation into the Life Dashboard. In a later chat, it brings forward relevant context and updates the same goal plan. The person returns to see progress and choose a next step.

## Inspiration & Identity
The spoken exchange should feel natural and hands-free, inspired by familiar voice conversations with ChatGPT. The app has its own identity and two clear areas: Chats and Life Dashboard. The dashboard should make progress easy to understand through a polished visual map, color coding, shapes, concise labels, and an alternate ordered task view. The visual should help the person see the whole goal and the next action at a glance.

## Why This Matters to the Learner
The project aims to help people gain clarity from conversations and turn it into visible progress toward their goals, including people who may lack a regular accountability partner.

## What "Working" Looks Like
A short phone demo shows a parent talking through a side-business goal in one voice chat. The transcript appears live and the session is saved. The dashboard then shows the goal, meaningful context and constraints, ordered steps, tasks, and progress. A second chat adds new information and visibly updates the same plan, while the first conversation remains in history. The person can switch between the visual map and a clear task view to understand the plan.

The compelling moment is when a messy conversation that mixed family responsibilities, worries, and a business goal becomes a plan the person can see, and a later conversation updates it without making them start over.

## The POC Boundary
- One person and multiple personal goals, with one representative side-business goal as the main demo thread.
- A phone-first app with separate Chats and Life Dashboard areas.
- Two voice conversations with spoken assistant replies, live transcription, and saving when the person ends a session.
- Basic saved-chat history for those conversations.
- Organize the mixed conversation into a goal, useful context, ordered steps, tasks, and a visible progress state.
- Keep multiple goals from different conversations in the Life Dashboard, with one selected goal shown at a time.
- Let the second conversation use relevant saved context and update the same goal plan.
- Show the same plan in a visual map and a simpler task view.
- Verify during technical planning whether the phone can remain in a pocket with the app in the background or screen locked; do not promise that behavior until the chosen platform supports it reliably.

## Later
- Additional goal areas such as fitness, family routines, or learning.
- More visual styles and a history to compare or restore different dashboard versions.
- Connections to external Messenger services.
- Multiple users, accounts, and long-term cross-device sync.

## Explicitly Cut
- Importing or monitoring conversations from external Messenger apps in this proof of concept; the person talks with the assistant in the app's own chat.
- Always-on listening outside a conversation the person starts.
- A general-purpose life planner that supports every goal type at launch.
- A full editor for creating custom diagrams or visual themes.

## Open Technical Question
The desired experience is hands-free through earphones with the phone in a pocket. The technical plan must check what the selected app platform can reliably do while the phone is locked or the app is in the background. If it cannot support that in the hackathon demo, we must agree on a clearly stated demo limitation before building.

