# StudyMatch — PRD

## Original problem statement
A collaborative web app for students to create and join virtual study rooms with
shared Pomodoro timer, chat, status indicators, public/private rooms, AI room
recommendations, leaderboards, ambient sounds, and dashboard with streaks.

## Architecture
- Frontend: React 19 + react-router-dom 7 + Tailwind + Shadcn UI primitives,
  custom Neo-Brutalist design (Cabinet Grotesk / Satoshi fonts), recharts for
  charts, sonner for toasts.
- Backend: FastAPI + MongoDB (motor). All routes under `/api`.
- Auth: Google OAuth (session_token cookie + bearer fallback).
- AI: Claude Sonnet 4.5 for room recommendations.

## What's implemented (Feb 2026 — v1)
- Landing page with Google login CTA
- Auth callback flow (session_id exchange, httpOnly cookie + localStorage bearer)
- Dashboard: total hours, today minutes, streak, active rooms count, 7-day chart
- Explore: search + category filter + create room dialog
- Create room: public/private + passcode + tags + max participants
- Room view: shared Pomodoro (host-controlled, syncs via polling), participant
  list with status switcher (studying/break/doubt), room chat (poll-based),
  shared task list, ambient sound player, Focus mode (dark + rain bg)
- Pomodoro auto-logs focus minutes to user streak + study_sessions
- Leaderboard (weekly top focus minutes)
- Profile editor (name/bio/interests)
- AI recommendations widget (Claude Sonnet 4.5)

## Backlog / Next iterations
- P0: WebSocket-based realtime (replace polling) for chat & timer
- P1: Real WebRTC video/audio presence
- P1: Calendar integration (Google Calendar) for scheduled sessions
- P1: Notes sharing within rooms (rich text)
- P2: Badges + achievements visualization
- P2: Mobile PWA install + push notifications
- P2: Email auth as alternative to Google
