# StreakUp — Habit Tracker

A personal iOS habit tracker built to encourage consistency through weekly goals, streak gamification, and a non-judgmental design. StreakUp focuses on three core areas: **exercise**, **food & weight**, and **alcohol** — all tracked on a Monday–Sunday cadence, fully on-device with no accounts required.

---

## Features

### 📊 Three Trackers

| Tracker | What's Tracked | Weekly Goal | Reward |
|---|---|---|---|
| 🏋️ Exercise | Workouts via Strava or manual entry | ≥ 4 workouts/week | Badges |
| 🥗 Food & Weight | Meals (B/L/D), calories, weight, snacking | No snacking Mon–Fri, ≤ 2,300 kcal/day | Weekend Snack Pass 🎉 |
| 🍺 Alcohol | Drinks by type → units + kcal | ≤ 17 units/week | Awareness tracking |

---

### 🗂 Screens

- **Overview (Day / Week / Month)** — Glanceable progress rings and cards for all three trackers. Includes a colour-coded weekly grid, a calendar heatmap, and a weight chart with goal line.
- **Log Screen** — Log food (manual text or on-device AI photo estimate), drinks (with unit/kcal auto-calc), and weight entries.
- **Goals Screen** — View current streaks per tracker, active goals, and unlocked/locked badges.
- **Settings** — Connect Strava, configure notifications, edit goals, toggle appearance, and export/reset data.

---

### 🎮 Gamification

- **Streaks** — Consecutive weeks meeting each goal, tracked independently per category.
- **Weekend Snack Pass** — Go snack-free Mon–Fri to unlock a guilt-free weekend pass, complete with a celebration animation.
- **Badges** — Six tiers per tracker (2 / 4 / 8 / 12 / 26 / 52 weeks), unlocked with animation and haptic feedback.
- **Animations** — Confetti on goal completion, shimmer on Snack Pass unlock, progress ring fills on load.

---

### 🔗 Strava Integration

OAuth2 sync pulls workouts automatically on app open and in the background. Manual entries are always available alongside synced data.

---

### 🤖 Food AI (On-Device)

Uses Apple Vision + Core ML to estimate calories from food photos. No cloud APIs — everything stays on device. Users always confirm or adjust estimates before saving.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Language | Swift 5.9+ |
| UI | SwiftUI (iOS 17+) |
| Storage | SwiftData |
| Architecture | MVVM |
| Charts | Swift Charts |
| Food AI | Apple Vision + Core ML |
| Workouts | Strava OAuth2 |

---

## Design

A clean, glanceable UI built around a deep purple (`#5B4CDB`) primary colour, soft card layouts, and Inter typography. Designed to be **glanceable**, **delightful**, **non-judgmental**, and require **minimal input**.
