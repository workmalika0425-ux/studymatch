# StudyMatch

> A cozy, focused virtual library that fits in your browser.
> Students create and join real-time study rooms, share a Pomodoro timer,
> chat, set a status, knock out a shared task list, and stay accountable
> with streaks and a weekly leaderboard.

---

## Table of contents
1. [Overview](#overview)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Environment variables](#environment-variables)
6. [Local setup](#local-setup)
7. [Running the app](#running-the-app)
8. [API reference](#api-reference)
9. [Frontend routes](#frontend-routes)
10. [Design system](#design-system)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Roadmap](#roadmap)

---

## Overview

StudyMatch replicates the experience of a quiet library or a group study
session — online. A student logs in with Google, browses public study rooms by
subject / exam / skill / goal, joins one (or creates their own), and starts a
shared Pomodoro. While studying, learners broadcast their status (Studying,
On break, Asking doubt), drop messages in the room chat, tick off shared goals,
and play ambient sounds. Every focus block is automatically logged to a study
streak, and the weekly top focused learners show up on a leaderboard.

An AI study coach (Claude Sonnet 4.5) recommends rooms that match a learner's
interests and goals.

---

## Features

**Core**
- Google sign-in (one click)
- Public & private study rooms with passcode protection
- Room discovery with text search and category filters
- Room categories: Subject / Exam / Skill / Goal
- Shared, host-controlled Pomodoro timer (Focus 25 / Break 5 / Long 15)
- Per-participant status indicators (Studying / On break / Asking doubt)
- Live room chat with smooth polling
- Shared task list per room (add / toggle / delete)
- Focus mode (dim everything except timer + tasks, rainy ambient bg)
- Ambient sounds player (Gentle rain / Lofi / Forest)
- Automatic study minutes logging from completed Pomodoros
- Daily study streak tracking

**Dashboard & social**
- Personal dashboard: total hours, today's minutes, streak, active rooms
- 7-day focus chart (recharts)
- Weekly leaderboard (top focused learners + streaks)
- Editable profile (name, bio, interests)

**AI**
- AI study coach: recommends 2-3 rooms based on interests and goal + a tip
- Uses Claude Sonnet 4.5 via `emergentintegrations`

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS, Shadcn UI, Recharts, Sonner, Lucide React, Axios |
| Build | Create React App + CRACO (path alias `@/*` → `src/*`) |
| Design | Custom Neo-Brutalist theme — pastel cards, 2px black borders, offset shadows, Cabinet Grotesk / Satoshi fonts |
| Backend | FastAPI, Motor (async MongoDB driver), httpx, Pydantic v2 |
| Database | MongoDB |
| Auth | Google OAuth via Emergent-managed flow (httpOnly cookie + Bearer token fallback) |
| AI | Claude Sonnet 4.5 via `emergentintegrations` library |
| Hosting (dev) | Supervisor-managed services in Kubernetes pod |

---

## Project structure

```
/app
├── backend/
│   ├── server.py              # FastAPI app, all /api routes
│   ├── requirements.txt
│   └── .env                   # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, CORS_ORIGINS
├── frontend/
│   ├── package.json
│   ├── craco.config.js        # Path alias + dev server config
│   ├── tailwind.config.js
│   ├── public/index.html
│   └── src/
│       ├── App.js             # Router + AuthProvider + Sonner toaster
│       ├── App.css
│       ├── index.css          # Neo-brutalist utilities + fonts
│       ├── index.js
│       ├── lib/api.js         # Axios instance (Bearer fallback + cookies)
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── AuthCallback.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── Navbar.jsx
│       │   ├── RoomCard.jsx
│       │   ├── CreateRoomDialog.jsx
│       │   ├── PomodoroTimer.jsx
│       │   ├── ChatPanel.jsx
│       │   ├── ParticipantList.jsx
│       │   ├── TaskList.jsx
│       │   ├── AmbientPlayer.jsx
│       │   ├── AIRecommendations.jsx
│       │   └── ui/            # Shadcn primitives
│       └── pages/
│           ├── Landing.jsx
│           ├── Dashboard.jsx
│           ├── Explore.jsx
│           ├── RoomView.jsx
│           ├── Leaderboard.jsx
│           └── Profile.jsx
├── memory/
│   ├── PRD.md
│   └── test_credentials.md
├── auth_testing.md
└── README.md
```

---

## Environment variables

### `backend/.env`

| Variable | Purpose |
|---|---|
| `MONGO_URL` | Mongo connection string (e.g. `mongodb://localhost:27017`) |
| `DB_NAME` | Mongo database name |
| `CORS_ORIGINS` | Comma-separated allowed origins (use `*` for dev) |
| `EMERGENT_LLM_KEY` | Universal key for Claude Sonnet 4.5 (used by `emergentintegrations`) |

### `frontend/.env`

| Variable | Purpose |
|---|---|
| `REACT_APP_BACKEND_URL` | Public URL of the backend (frontend prepends `/api`) |

> ⚠️ Do not hardcode the backend URL inside the source — always read from `process.env.REACT_APP_BACKEND_URL`.

---

## Local setup

### Prerequisites
- Python 3.11+
- Node 18+
- Yarn 1.x (do **not** use npm)
- MongoDB running locally (or a remote Mongo URI)

### Install backend
```bash
cd /app/backend
pip install -r requirements.txt
```

### Install frontend
```bash
cd /app/frontend
yarn install
```

---

## Running the app

This template runs both services via **Supervisor** in development. Both have
hot reload enabled.

```bash
# Restart services after .env or dependency changes
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# View logs
tail -n 100 /var/log/supervisor/backend.*.log
tail -n 100 /var/log/supervisor/frontend.*.log
```

- Frontend dev server → http://localhost:3000
- Backend → http://localhost:8001 (always behind the Kubernetes ingress at `/api`)

---

## API reference

All routes are prefixed with `/api`. Authenticated routes accept either an
`httpOnly` cookie `session_token` or `Authorization: Bearer <session_token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/session` | Exchange OAuth `session_id` → set session cookie + return user |
| `GET`  | `/auth/me` | Get current authenticated user |
| `POST` | `/auth/logout` | Clear session cookie + delete session |

### Users
| Method | Path | Description |
|---|---|---|
| `PUT` | `/users/me` | Update profile (`name`, `bio`, `interests[]`) |

### Rooms
| Method | Path | Description |
|---|---|---|
| `GET`    | `/rooms` | List rooms (`subject`, `category`, `q`, `show_private`) |
| `POST`   | `/rooms` | Create a room |
| `GET`    | `/rooms/{id}` | Get room (or `{requires_passcode:true}` for private) |
| `POST`   | `/rooms/{id}/join` | Join (with optional `{passcode}`) |
| `POST`   | `/rooms/{id}/leave` | Leave |
| `PUT`    | `/rooms/{id}/status` | Update my participant status (`studying`/`break`/`doubt`) |

### Pomodoro (host-only)
| Method | Path | Description |
|---|---|---|
| `POST` | `/rooms/{id}/pomodoro` | Body: `{action: "start"|"pause"|"reset"|"skip", mode?, duration_seconds?}` |

### Chat
| Method | Path | Description |
|---|---|---|
| `GET`  | `/rooms/{id}/messages?after=<iso>` | List messages, optional cursor |
| `POST` | `/rooms/{id}/messages` | Post a message `{text}` |

### Tasks
| Method | Path | Description |
|---|---|---|
| `GET`    | `/rooms/{id}/tasks` | List tasks |
| `POST`   | `/rooms/{id}/tasks` | Create task `{title}` |
| `PATCH`  | `/rooms/{id}/tasks/{taskId}` | Update task `{completed?, title?}` |
| `DELETE` | `/rooms/{id}/tasks/{taskId}` | Delete task |

### Sessions / stats / AI
| Method | Path | Description |
|---|---|---|
| `POST` | `/sessions/log` | Log study minutes `{minutes, room_id?}` (auto-called by timer) |
| `GET`  | `/dashboard` | Stats: total/today minutes, streak, 7-day chart, recent rooms |
| `GET`  | `/leaderboard` | Top focused learners this week (public) |
| `POST` | `/ai/recommend` | Body `{interests?, goal?}` → recommendations + tip |

### Quick API smoke test
```bash
API_URL=$(grep REACT_APP_BACKEND_URL frontend/.env | cut -d '=' -f2)
curl -s "$API_URL/api/"
# → {"app":"StudyMatch","ok":true}  (or similar)
```

---

## Frontend routes

| Path | Page | Auth required |
|---|---|---|
| `/` | Landing | No |
| `/dashboard` | Dashboard with stats + recent rooms + AI widget | Yes |
| `/explore` | Browse + filter rooms, create | Yes |
| `/rooms/:roomId` | In-room view: timer, chat, tasks, participants, focus mode | Yes |
| `/leaderboard` | Weekly top focused learners | Yes |
| `/profile` | Edit profile + interests | Yes |
| `#session_id=...` | Auth callback (transparent) | — |

---

## Design system

- **Theme**: Light, neo-brutalist with pastel accents (yellow, mint, pink, lavender)
- **Background**: `#FFFDF8` cream with subtle dotted paper pattern
- **Fonts**:
  - Headings → Cabinet Grotesk (FontShare)
  - Body → Satoshi
  - Mono → JetBrains Mono
- **Cards**: 2px solid black border, `4px 4px 0 0 #000` offset shadow, `rounded-xl`
- **Buttons**: Animated press effect (`translate(2px, 2px)` + smaller shadow on hover)
- **Icons**: `lucide-react` with `strokeWidth={2.5}` or `3`
- **All interactive elements expose `data-testid`** for testing

---

## Testing

A full backend regression suite is at `backend/tests/backend_test.py`
(generated by the testing agent). Highlights:

- Auth (cookie + Bearer)
- Rooms CRUD + private/passcode flow
- Pomodoro lifecycle + host enforcement
- Chat + tasks
- Sessions log + streak math
- Dashboard, leaderboard, AI recommendations

Run:
```bash
cd /app/backend
pytest -q
```

For UI tests, see `auth_testing.md` for the synthetic session pattern used
by Playwright.

---

## Deployment

**Recommended:** Use the platform's native deploy (handles backend, frontend,
and MongoDB in one shot).

**Hybrid alternatives**
- **Frontend → Vercel / Netlify / Cloudflare Pages**
  Set `REACT_APP_BACKEND_URL` to your backend URL.
- **Backend → Railway / Render / Fly.io / DigitalOcean**
  Provide `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `EMERGENT_LLM_KEY`.
- **MongoDB → MongoDB Atlas** (free tier works fine for MVP).

> Vercel cannot host the FastAPI server itself (long-running). Use it for the
> frontend only and pair it with a backend host.

---

## Roadmap

- [ ] Replace polling with WebSockets for chat & timer
- [ ] Real WebRTC video/audio presence
- [ ] Notes sharing inside rooms (rich text, persisted per room)
- [ ] Google Calendar integration for scheduled sessions
- [ ] Achievements / badges showcase
- [ ] Weekly digest email ("your streak, top room, 3 picks for next week")
- [ ] Mobile PWA install + push notifications

---

## License

Personal / academic project. All trademarks belong to their respective owners.
