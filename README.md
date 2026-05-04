# Habit Tracker v2.0

A personal habit tracker PWA for tracking **exercise**, **food & weight**, and **alcohol** on a weekly cadence with streak gamification. Built as a Progressive Web App with cross-device sync.

**Live:** [mango-bay-04f757203.7.azurestaticapps.net](https://mango-bay-04f757203.7.azurestaticapps.net)

---

## Features

### 📊 Three Trackers

| Tracker | What's Tracked | Weekly Goal | Reward |
|---|---|---|---|
| 🏋️ Exercise | Workouts via Strava auto-sync or manual entry | ≥ 4 workouts/week | Badges |
| 🥗 Food & Weight | Meals (B/L/D/Snack), calories, weight | No snacking Mon–Fri, ≤ 2,300 kcal/day | Weekend Snack Pass 🎉 |
| 🍺 Alcohol | Drinks by type → units + kcal | ≤ 17 units/week | Awareness tracking |

---

### 🗂 Screens

- **Overview (Day / Week / Month)** — Donut progress rings, colour-coded weekly grids, calendar heatmaps, and stat cards for all three trackers.
- **Log Screen** — Segmented control for Meal / Snack / Drink / Workout / Weight logging with date navigation.
- **Goals Screen** — Current streaks per tracker, active goals, and unlocked/locked badges with tier progression.

---

### 🔗 Strava Integration

- OAuth2 flow via Azure Functions API
- Automatic sync on app open — pulls activities with accurate calories and distance
- Maps Strava sport types → app workout types (Run, Cycle, Swim, Gym, Walk, HIIT)
- Deduplication by Strava activity ID + date/type/duration fallback
- Shows Strava badge (⚡) on synced workouts

---

### 🎮 Gamification

- **Streaks** — Consecutive weeks meeting each goal, tracked independently per category
- **Weekend Snack Pass** — Go snack-free Mon–Fri to unlock a guilt-free weekend pass
- **Badges** — Six tiers per tracker (2 / 4 / 8 / 12 / 26 / 52 weeks)
- **Animations** — Confetti on goal completion, shimmer effects, progress ring fills

---

### 🔄 Cross-Device Sync

Powered by Dexie Cloud — data syncs across all devices in real-time. Works offline-first with automatic conflict resolution.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JS + Vite |
| UI | Custom CSS (glass morphism, Inter font) |
| Storage | Dexie.js (IndexedDB) + Dexie Cloud |
| API | Azure Functions v4 (Node.js, ESM) |
| Hosting | Azure Static Web Apps |
| Workouts | Strava OAuth2 via serverless API |
| PWA | Service worker with network-first HTML, cache-first assets |

---

## Architecture

```
pwa/              → Vite PWA (static frontend)
├── src/
│   ├── app.js          → Entry point, routing, Strava callback
│   ├── db.js           → Dexie schema + Dexie Cloud config
│   ├── store.js        → Data layer CRUD functions
│   ├── screens/        → Day/Week/Month views, Log, Goals
│   └── utils/          → Strava sync module
├── index.html
├── style.css
├── sw.js               → Service worker
└── manifest.json

api/              → Azure Functions (serverless API)
├── src/functions/
│   ├── strava-auth.js      → OAuth redirect
│   ├── strava-callback.js  → Token exchange
│   └── strava-sync.js      → Activity fetch + mapping
└── host.json

staticwebapp.config.json  → Azure SWA routing + CSP
```

---

## Local Development

```bash
# Prerequisites: Node 20 (use fnm), Azure Functions Core Tools, SWA CLI

# Install dependencies
cd pwa && npm install
cd ../api && npm install

# Run full stack locally
swa start http://localhost:5173 --api-location api --run "cd pwa && npx vite --port 5173"

# App available at http://localhost:4280
```

Requires `api/local.settings.json` with `STRAVA_CLIENT_SECRET` for local Strava testing.

---

## Deployment

Automatic via GitHub Actions on push to `main`. Azure Static Web Apps builds the Vite app and deploys both the frontend and API functions.

**Required Azure app settings:**
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `APP_URL`

---

## Design

A clean, glanceable UI built around deep purple (`#5B4CDB`), glass-morphism cards, and Inter typography. Designed to be **glanceable**, **delightful**, **non-judgmental**, and require **minimal input**.
