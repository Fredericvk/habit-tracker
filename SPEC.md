# StreakUp — Product Specification

> Personal iOS habit tracker. Track exercise, food/weight, and alcohol on a weekly cadence with gamification rewards.

---

## 1. Overview

| Tracker | What's tracked | Weekly Goal | Reward |
|---------|---------------|-------------|--------|
| 🏋️ Exercise | Workouts via Strava | ≥ 4 workouts | Badges |
| 🥗 Food & Weight | Meals (B/L/D), calories, weight, snacking | No snacking Mon–Fri, ≤ 2,300 kcal/day | Weekend Snack Pass 🎉 |
| 🍺 Alcohol | Drinks by type → units + kcal | ≤ 17 units/week | Awareness tracking |

**Week = Monday → Sunday.** Single user, on-device only, no accounts.

---

## 2. User Profile

- Male, 31, 96.5 kg, very active (marathon runner)
- Daily calorie target: 2,300 kcal
- Weight goal: 93.0 kg by July 2026
- VO2 Max: 55.6 → 60 (target)

---

## 3. Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Swift 5.9+ |
| UI | SwiftUI (iOS 17+) |
| Storage | SwiftData |
| Architecture | MVVM |
| Charts | Swift Charts |
| Food AI | Apple Vision + Core ML (on-device only) |
| Workouts | Strava OAuth2 sync |
| Font | Inter (+ system fallbacks) |

---

## 4. Data Model

### WorkoutEntry
`id` UUID · `date` Date · `type` String (Run/Gym/Gym Class/custom) · `duration` Int (min) · `kcalBurned` Int? · `source` Enum (.strava/.manual) · `stravaId` String?

### MealEntry
`id` UUID · `date` Date · `mealType` Enum (breakfast/lunch/dinner/snack) · `description` String · `photo` Data? · `estimatedKcal` Int · `inputMethod` Enum (.manual/.photo)

### WeightEntry
`id` UUID · `date` Date · `weight` Double (kg)

### DrinkEntry
`id` UUID · `date` Date · `drinkType` Enum · `quantity` Int · `units` Double · `kcal` Int

**Drink unit values (UK):**

| Type | Units | Kcal |
|------|-------|------|
| Beer (pint) | 2.3 | 182 |
| Wine (175ml) | 2.1 | 158 |
| Spirit (single) | 1.0 | 61 |
| Cocktail | 2.0 | 180 |
| Cider (pint) | 2.6 | 210 |

### WeekResult (computed)
`weekStart` Date · `exerciseGoalMet` Bool · `eatingGoalMet` Bool · `drinkingGoalMet` Bool

### Badge
`id` UUID · `tracker` Enum · `name` String · `weeksRequired` Int · `icon` String · `unlockedAt` Date?

**Badge tiers:** 2, 4, 8, 12, 26, 52 weeks per tracker.

---

## 5. Navigation

**Tab bar:** Log | **Overview** (center FAB) | Goals | Settings

Overview is the default/home screen with a floating purple FAB button.

---

## 6. Screens

### 6.1 Overview — Day Tab (default)

Header: "Today — Friday, Apr 25"

Four cards with donut progress rings:

1. **Calories & Weight** — ring shows daily kcal consumed vs 2,300 target. Below: meals grouped by B/L/D with items + kcal. Snacks row shows clean/not. Week average shown inline.
2. **Exercise** — ring shows weekly workout count (e.g. 3/4). Today's activity or "Rest day — 30 min walk needed". Weekly workout dots (emoji per type).
3. **No Snacking** — ring shows weekdays clean (e.g. 4/5). Mon–Fri day pills with ✅/○ status. Snack Pass preview toggle.
4. **Alcohol** — ring shows weekly units consumed (e.g. 11.3/17). Weekly kcal from alcohol. Drink chips breakdown.

### 6.2 Overview — Week Tab

- **Week navigation** (‹ › arrows) with date range
- **Color-coded grid**: 7 columns (Mon–Sun), rows for Cal/Exercise/Snacking/Alcohol/Rating
  - Green = good, amber = OK, red = bad, grey = future
- **Donut progress cards** (same 4 categories as Day, but showing weekly totals/averages)
- **Weight chart** — line chart with weekly data points, goal line at 93 kg, progress bar

### 6.3 Overview — Month Tab

- **Month navigation** (‹ ›) with month/year
- **Calendar heatmap** — color-coded days (green/amber/red). Tap day → switches to Day tab.
- **Monthly stats** — exercise weeks met, snack-free weeks, alcohol avg, calorie avg, weight trend. Each with trend arrow (↑/→/↓).

### 6.4 Log Screen

Segmented control: **Food** | **Drink** | **Weight**

**Food:**
- Date navigation (‹ Today ›)
- Meal type selector: Breakfast / Lunch / Dinner (pill buttons)
- Input method toggle: Manual / Photo
  - Manual: text description + calorie input
  - Photo: camera button → on-device AI estimates kcal
- "Log Meal" button

**Drink:**
- Date navigation
- Drink grid: 6 cards (Beer 🍺, Wine 🍷, Spirit 🥃, Cocktail 🍹, Cider 🍏, Other 🥤) with unit + kcal info
- Quantity stepper (−/+) with "drinks" label
- Session total display
- "Add Drinks" button

**Weight:**
- Date navigation
- Weight input (kg, one decimal)
- "Save Weight" button

### 6.5 Goals Screen

- **Current streaks** per tracker with flame icons
- **Active goals** as cards (exercise target, snack-free weeks, alcohol limit)
- **Badges** section with unlocked/locked state

### 6.6 Settings Screen

- Strava connection toggle
- Notification preferences (morning/evening reminders, toggles)
- Goal editing (workout count, alcohol limit, calorie target, weight goal)
- Appearance (light/dark/system)
- Data export/reset
- About (version)

---

## 7. Strava Integration

1. OAuth2 flow from Settings → authorize → store tokens in Keychain
2. Sync on app open + background fetch: pull activities since last sync
3. Map Strava types → workout types. Dedup via `stravaId`.
4. Manual entries always work alongside Strava.

---

## 8. Food AI

- On-device only (Core ML + Apple Vision). No cloud APIs.
- Photo input: identify food → estimate kcal
- Text input: lookup table fallback for common foods
- User always confirms/adjusts estimate before saving
- Show "Estimates are approximate" disclaimer

---

## 9. Gamification

**Streaks:** Consecutive weeks meeting goal, per tracker. Current week = in progress until Sunday.

**Weekend Snack Pass:** Mon–Fri zero snacks → Saturday unlocks pass with celebration animation. Weekend snacks don't break streak.

**Badges:** 6 tiers (2/4/8/12/26/52 weeks) per tracker. Badge unlock animation + haptic.

**Animations:** Confetti on goal met, shimmer on Snack Pass unlock, progress ring fill on screen load.

---

## 10. Visual Design

| Token | Value |
|-------|-------|
| Primary | `#5B4CDB` (deep purple/indigo) |
| Secondary | `#FFD166` (warm gold) |
| Background | `#F7F8FA` (off-white) |
| Cards | `#FFFFFF` with soft shadow |
| Success | `#10B981` (teal-green) |
| Warning | `#F59E0B` (amber) |
| Danger | `#EF4444` (red) |
| Text primary | `#1F2937` |
| Text secondary | `#6B7280` |
| Tints | Purple `#EDE9FF`, Blue `#EBF5FF`, Green `#ECFDF5`, Amber `#FFFBEB` |

**Font:** Inter (Google Fonts) + system fallbacks.
**Card radius:** 20px. **Button radius:** 50px (pill). **Tab bar:** frosted glass with floating purple FAB.
**Segmented controls:** pill chips, active = purple fill + white text, full-width equal sizing.

**Principles:** Glanceable · Delightful · Non-judgmental · Minimal input

---

## 11. Implementation Phases

1. **Foundation** — Xcode project, SwiftData models, MVVM scaffold, tab bar shell
2. **Core Tracking** — Overview Day/Week/Month, Log screen (food/drink/weight), goal computation, streak logic
3. **Strava** — OAuth2, activity sync, dedup, background refresh
4. **Food AI** — Core ML integration, photo + text estimation, user override
5. **Gamification** — Badges, Snack Pass, confetti/haptics, streak animations
6. **Polish** — Notifications, settings, data export, edge cases, final design pass
