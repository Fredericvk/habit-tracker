# Habit Tracker — Product Specification v2.0

> Personal habit tracker PWA. Track exercise, food/weight, and alcohol on a weekly cadence with gamification rewards. Cross-device sync via Dexie Cloud, Strava integration via Azure Functions.

---

## 1. Overview

| Tracker | What's tracked | Weekly Goal | Reward |
|---------|---------------|-------------|--------|
| 🏋️ Exercise | Workouts via Strava auto-sync or manual | ≥ 4 workouts | Badges |
| 🥗 Food & Weight | Meals (B/L/D/Snack), calories, weight | No snacking Mon–Fri, ≤ 2,300 kcal/day | Weekend Snack Pass 🎉 |
| 🍺 Alcohol | Drinks by type → units + kcal | ≤ 17 units/week | Awareness tracking |

**Week = Monday → Sunday.** Single user, offline-first with cross-device sync.

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vanilla JS (ES modules) + Vite |
| Styling | Custom CSS (glass morphism, gradients) |
| Storage | Dexie.js (IndexedDB) + Dexie Cloud |
| API | Azure Functions v4 (Node.js 20, ESM) |
| Hosting | Azure Static Web Apps (free tier) |
| Workouts | Strava OAuth2 via serverless functions |
| PWA | Service worker, manifest, offline support |
| Font | Inter (Google Fonts) |

---

## 3. Data Model

### Workouts
`@id` (auto) · `date` timestamp · `type` (Run/Gym/Walk/Cycle/Swim/HIIT) · `duration` min · `kcal` Int · `distance` meters · `source` (manual/strava) · `stravaId` String?

### Meals
`@id` (auto) · `date` timestamp · `mealType` (Breakfast/Lunch/Dinner/Snack) · `description` String · `kcal` Int

### Drinks
`@id` (auto) · `date` timestamp · `drinkType` String · `quantity` Int · `units` Double · `kcal` Int

### Weight
`@id` (auto) · `date` timestamp · `weight` Double (kg)

### Goals
`@id` (auto) · `type` String · `value` number

### Strava Tokens
`@id` (auto) · `accessToken` · `refreshToken` · `expiresAt` · `athleteId` · `lastSync`

**Drink unit values (UK):**

| Type | Units | Kcal |
|------|-------|------|
| Beer (pint) | 2.3 | 182 |
| Wine (175ml) | 2.1 | 158 |
| Spirit (single) | 1.0 | 61 |
| Cocktail | 2.0 | 180 |
| Cider (pint) | 2.6 | 210 |

---

## 4. Navigation

**Tab bar:** Log | **Overview** (center FAB) | Goals

Overview is the default/home screen with a floating purple FAB button. Settings accessible via gear icon in header.

---

## 5. Screens

### 5.1 Overview — Day View

- Donut chart for daily calories vs target
- Meal breakdown by type (Breakfast, Lunch, Dinner) with per-item kcal
- Exercise card with workout list (type, distance, duration, kcal)
- Snack + Alcohol summary half-cards
- Strava badge (⚡) shown on synced workouts

### 5.2 Overview — Week View

- Week navigation (‹ › arrows) with date range
- Stacked bar chart for daily calories by meal type
- Exercise card with per-day workout icons and kcal
- Snack-free days tracker with goal progress
- Alcohol units card with daily breakdown
- Weight card with trend

### 5.3 Overview — Month View

- Month navigation (‹ ›) with filter chips (All/Calories/Exercise/Snacks/Alcohol)
- Calendar heatmap — colour-coded days (green/amber/red)
- Monthly stats: avg calories, exercise count, snack-free weeks, alcohol total
- Tap day → shows day detail

### 5.4 Log Screen

Segmented control: **Meal** | **Snack** | **Drink** | **Workout** | **Weight**

- Date navigation (‹ Today ›)
- Each section renders independently (no full-page refresh on tab switch)
- Today's entries shown below form with delete (✕) buttons
- Strava-synced workouts show ⚡ badge and cannot be manually added as duplicates

### 5.5 Goals Screen

- Current streaks per tracker with flame icons and tier labels
- Active goal cards with progress bars
- Badge grid with unlocked/locked state and tier progression
- Goal editing (workout count, alcohol limit, calorie target, weight goal)

### 5.6 Settings (Overlay)

- Cross-device sync status
- Clear all data
- About (version)

---

## 6. Strava Integration

1. OAuth2 flow: Settings → Connect → Strava authorize → callback → tokens stored in Dexie
2. Sync on app open: fetch activities since last sync (minimum 7-day lookback)
3. Fetch detailed activity data for accurate calories when summary lacks them
4. Map Strava sport types → app types:
   - Run/TrailRun/VirtualRun → Run
   - Ride/MountainBikeRide/GravelRide/VirtualRide → Cycle
   - Swim → Swim
   - WeightTraining/CrossFit → Gym
   - Walk/Hike → Walk
   - HIIT/Workout → HIIT
5. Store distance (meters) for distance-based activities
6. Deduplication: by `stravaId` index + fallback by date/type/duration
7. Token refresh handled server-side when expired
8. All API calls via Azure Functions (secrets never exposed to client)

---

## 7. Gamification

**Streaks:** Consecutive weeks meeting goal, per tracker. Current week = in progress until Sunday.

**Weekend Snack Pass:** Mon–Fri zero snacks → Saturday unlocks pass with celebration animation. Weekend snacks don't break streak.

**Badges:** 6 tiers (2/4/8/12/26/52 weeks) per tracker. Badge unlock animation.

**Animations:** Confetti on goal met, shimmer on Snack Pass unlock, progress ring fill on screen load.

---

## 8. Visual Design

| Token | Value |
|-------|-------|
| Primary | `#5B4CDB` (deep purple/indigo) |
| Secondary | `#FFD166` (warm gold) |
| Background | `#F7F8FA` (off-white) |
| Cards | Glass morphism with blur + translucency |
| Success | `#10B981` (teal-green) |
| Warning | `#F59E0B` (amber) |
| Danger | `#EF4444` (red) |
| Text primary | `#1F2937` |
| Text secondary | `#6B7280` |

**Font:** Inter (400/500/600/700/800) via Google Fonts.
**Card radius:** 20px. **Button radius:** 50px (pill). **Tab bar:** frosted glass with floating purple FAB.
**Segmented controls:** pill chips, active = purple fill + white text.

**Principles:** Glanceable · Delightful · Non-judgmental · Minimal input

---

## 9. Deployment & Infrastructure

| Component | Service |
|-----------|---------|
| Frontend hosting | Azure Static Web Apps (free tier) |
| API (serverless) | Azure Functions (bundled with SWA) |
| Database/sync | Dexie Cloud |
| CI/CD | GitHub Actions (auto-deploy on push to main) |
| Secrets | Azure app settings (encrypted at rest) |

**Production URL:** https://mango-bay-04f757203.7.azurestaticapps.net

---

## 10. Future Enhancements

- Food AI (photo-based calorie estimation)
- Push notifications (morning/evening reminders)
- Disconnect Strava flow (UI button)
- Manual sync button + last synced indicator
- Dark mode
- Data export (CSV/JSON)
