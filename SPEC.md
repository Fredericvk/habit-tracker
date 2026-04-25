# StreakUp — Product Specification

> Personal iOS habit tracker for Frederic. Three trackers — exercise, eating, alcohol — with weekly goals, streak gamification, and a "weekend snack pass" reward system.

---

## 1. Product Vision

A beautiful, no-nonsense iOS app to track three areas of life on a **weekly cadence**:

| Tracker        | What's logged                            | Weekly Goal                    | Reward                              |
|----------------|------------------------------------------|--------------------------------|--------------------------------------|
| 🏋️ Exercise    | Workouts (auto-synced from Strava)       | ≥ 4 workouts per week          | In-app kudos / badges               |
| 🥗 Eating      | Meals + snack compliance                 | No snacking Mon–Fri            | Unlock "Weekend Snack Pass" 🎉       |
| 🍺 Alcohol     | Drinks by type → alcohol units           | ≤ 17 units per week            | Awareness only (no reward needed)   |

**Week runs Monday → Sunday.**

---

## 2. User Profile

- **Single user** — personal use only, no accounts, no cloud sync.
- **Usage pattern:** morning reminder notification + evening logging session.
- **Data storage:** fully on-device using SwiftData.

---

## 3. Tech Stack

| Layer          | Choice                                    |
|----------------|-------------------------------------------|
| Language       | Swift 5.9+                                |
| UI Framework   | SwiftUI (target iOS 17+)                  |
| Persistence    | SwiftData                                 |
| Architecture   | MVVM                                      |
| Charts         | Swift Charts framework                    |
| Notifications  | UserNotifications framework               |
| Food AI        | Apple Vision + Core ML (on-device)        |
| Workout Sync   | Strava API (OAuth2 → poll activities)     |
| Animations     | SwiftUI animations + custom particle FX   |

---

## 4. Data Model

### 4.1 Exercise

**WorkoutEntry**
| Field       | Type     | Notes                                     |
|-------------|----------|-------------------------------------------|
| id          | UUID     | Primary key                               |
| date        | Date     | Day of workout                            |
| type        | String   | "Run", "Gym", "Gym Class", or custom      |
| duration    | Int      | Minutes                                   |
| kcalBurned  | Int?     | Optional, from Strava                     |
| source      | Enum     | `.strava` or `.manual`                    |
| stravaId    | String?  | Strava activity ID (dedup)                |

Predefined workout types: **Running, Gym, Gym Class**. User can add custom types.

### 4.2 Eating

**MealEntry**
| Field         | Type     | Notes                                    |
|---------------|----------|------------------------------------------|
| id            | UUID     | Primary key                              |
| date          | Date     | Date/time of meal                        |
| description   | String   | Text description of what was eaten       |
| photo         | Data?    | Optional photo (stored as JPEG data)     |
| estimatedKcal | Int      | AI-estimated calories                    |
| isHealthy     | Bool     | AI-classified healthy/unhealthy          |

**SnackEntry**
| Field    | Type  | Notes                                         |
|----------|-------|-----------------------------------------------|
| id       | UUID  | Primary key                                   |
| date     | Date  | When the snack was consumed                   |
| name     | String | What was snacked on (crisps, chocolate, etc.) |

> **Key rule:** Snacking Mon–Fri = streak broken for that week. Snacking Sat–Sun is fine (it's the reward).

### 4.3 Alcohol

**DrinkEntry**
| Field     | Type   | Notes                                       |
|-----------|--------|---------------------------------------------|
| id        | UUID   | Primary key                                 |
| date      | Date   | When consumed                               |
| drinkType | Enum   | Beer, Wine, Cocktail, Spirit, Cider, Other  |
| quantity  | Int    | Number of that drink                        |
| units     | Double | Auto-calculated alcohol units               |

**Standard unit values (UK):**
| Drink Type | Default Units |
|------------|---------------|
| Beer (pint)| 2.3           |
| Wine (glass, 175ml) | 2.1  |
| Spirit (single shot) | 1.0 |
| Cocktail   | 2.0           |
| Cider (pint)| 2.6          |

User picks drink type + quantity → units auto-calculated.

### 4.4 Streaks & Badges

**WeekResult** (computed, not stored — derived from entries)
| Field           | Type  | Notes                                  |
|-----------------|-------|----------------------------------------|
| weekStart       | Date  | Monday of the week                     |
| exerciseGoalMet | Bool  | ≥ 4 workouts that week                 |
| eatingGoalMet   | Bool  | No snacks logged Mon–Fri               |
| drinkingGoalMet | Bool  | ≤ 17 units that week                   |

**Streak** = consecutive weeks where goal is met (per tracker).

**Badge**
| Field           | Type    | Notes                                 |
|-----------------|---------|---------------------------------------|
| id              | UUID    | Primary key                           |
| tracker         | Enum    | exercise / eating / drinking          |
| name            | String  | e.g. "Iron Will"                      |
| description     | String  | e.g. "4 week exercise streak"         |
| weeksRequired   | Int     | Streak length to unlock               |
| icon            | String  | SF Symbol name                        |
| unlockedAt      | Date?   | Nil until earned                      |

**Badge tiers per tracker:**
| Weeks | Exercise Badge      | Eating Badge          | Drinking Badge        |
|-------|--------------------|-----------------------|-----------------------|
| 2     | Getting Started 🌱 | Clean Eater 🥬        | Mindful Drinker 🧘   |
| 4     | Consistent 💪       | Willpower 🧱          | In Control 🎯         |
| 8     | Machine 🤖          | Iron Stomach 🛡️       | Clear Headed 🧠       |
| 12    | Beast Mode 🔥       | Master of Cravings 👑 | Quarter Year Clean 🏆|
| 26    | Half Year Hero 🦸   | Snack Slayer 🗡️       | Half Year Hero 🦸     |
| 52    | Year of Iron 🏆     | Year of Discipline 💎 | Year of Clarity 💎    |

---

## 5. Screens & Navigation

### Tab bar: **This Week** | **Log** | **History** | **Settings**

---

### 5.1 This Week (Home Screen)

The primary screen. Shows the current week (Mon → Sun) at a glance.

**Layout:**
- **Header:** "Week of Apr 21" + day indicators (Mon–Sun, today highlighted)
- **Three tracker cards** stacked vertically:

**🏋️ Exercise Card**
- Progress ring: X / 4 workouts
- List of workouts logged this week (type + duration)
- Status: "2 more to go" or "Goal reached! 🎉"
- If Strava is connected: auto-populated entries shown with Strava icon

**🥗 Eating Card**
- Mon–Fri day pills: green ✅ (clean) / red ❌ (snacked) / grey ○ (upcoming)
- If all Mon–Fri are green: "Weekend Snack Pass UNLOCKED! 🎉" with celebration animation
- If it's the weekend and pass is unlocked: festive snack emoji display
- Meals logged today (tap to expand)

**🍺 Alcohol Card**
- Progress bar: X / 17 units used
- Drinks logged this week as small chips (🍺 x3, 🍷 x2, etc.)
- Color shifts from green → amber → red as approaching/exceeding 17

---

### 5.2 Log Screen

Quick-entry screen for logging new data. Three sections accessible via a segmented control or swipe.

**Log Workout (manual):**
- Workout type picker (Run / Gym / Gym Class / + Custom)
- Duration (minute picker)
- Kcal (optional, number pad)
- "Save" button

**Log Meal:**
- Text field: "What did you eat?"
- Camera button → take photo
- On submit: on-device AI estimates kcal + healthy/unhealthy tag
- User can override the AI estimate before saving

**Log Snack:**
- Quick entry: "What did you snack on?"
- Shows a warning if it's a weekday: "This will break your eating streak this week"
- One-tap confirm

**Log Drinks:**
- Quick picker grid: Beer 🍺 | Wine 🍷 | Spirit 🥃 | Cocktail 🍹 | Cider 🍏 | Other
- Tap drink type → quantity stepper (1, 2, 3…)
- Shows running unit total for the session + week
- "Add" button (can add multiple types in one session)

---

### 5.3 History Screen

Two sub-views via segmented control: **Weeks** | **Months**

**Weekly View:**
- Scrollable list of past weeks (newest first)
- Each week shows: 3 tracker icons with ✅/❌ status + streak count
- Tap to expand: full breakdown of that week's entries
- Current streak badges shown at top

**Monthly View:**
- Calendar grid with color-coded weeks
- Summary stats for the month:
  - Exercise: X/4 weeks goal met, total workouts, total kcal burned
  - Eating: X/4 weeks snack-free, total meals logged, avg kcal/day
  - Alcohol: X/4 weeks under 17 units, total units, avg units/week
- Trend arrows (↑ improving, ↓ declining, → steady) vs previous month

**Badges section (accessible from History):**
- Grid of all badges: unlocked ones vibrant, locked ones greyed with "X weeks to go"
- Tap unlocked badge → details + date earned

---

### 5.4 Settings Screen

- **Strava:** Connect / disconnect Strava account (OAuth2 flow)
- **Notifications:**
  - Morning reminder (configurable time, default 8:00 AM)
  - Evening logging reminder (configurable time, default 9:00 PM)
  - Toggle per notification
- **Goals** (editable):
  - Workouts per week (default: 4)
  - Max alcohol units per week (default: 17)
  - Snack-free weekdays (this is fixed: Mon–Fri, not configurable)
- **Drink Units:** customize unit values per drink type
- **Appearance:** light / dark / system
- **Data:** Export as JSON / Reset all data (with confirmation)

---

## 6. Strava Integration

### Flow:
1. User taps "Connect Strava" in Settings
2. OAuth2 web flow opens → user authorizes StreakUp
3. App stores access token + refresh token in Keychain
4. On each app open (+ background fetch if enabled): pull new activities since last sync
5. New activities → create WorkoutEntry with `source = .strava`
6. Deduplication via `stravaId` — never double-count

### Data pulled per activity:
- Type → mapped to workout type (Run → Running, WeightTraining → Gym, etc.)
- Duration (moving time)
- Calories

### Edge cases:
- If Strava is disconnected, manual entries still work as normal
- User can manually add workouts even when Strava is connected
- If a Strava activity is deleted, keep the local entry (don't auto-delete)

---

## 7. On-Device Food AI

### Meal logging with AI estimation:
1. User enters text description ("grilled chicken with rice and salad") and/or takes a photo
2. App uses Core ML model to:
   - Estimate total calories
   - Classify as healthy or unhealthy
3. Results shown to user as editable suggestion (kcal + healthy/unhealthy tag)
4. User confirms or adjusts before saving

### Model approach:
- Use Apple's **CreateML** to train a food classification model, or bundle a pre-trained food recognition model (e.g., Food101-based)
- For calorie estimation from text: embed a lookup table of common foods + portions as a fallback
- For photo: use Vision framework to identify food items → map to calorie estimates

### Limitations (be transparent to user):
- "Estimates are approximate — feel free to adjust"
- Show confidence level if available

---

## 8. Gamification Details

### 8.1 Weekly Streaks
- Streak = number of **consecutive weeks** where the weekly goal is met
- Streaks are calculated **per tracker** independently
- A streak breaks when a week ends without meeting the goal
- Current week is always "in progress" (not counted toward streak until Sunday ends)

### 8.2 Weekend Snack Pass
- The signature reward mechanic
- If Mon–Fri has zero snack entries → Saturday morning: celebration animation + "Weekend Snack Pass Unlocked!"
- Visual flair: the eating card transforms with party theme
- Snacks logged on Sat/Sun don't affect the streak

### 8.3 Exercise Kudos
- When 4th workout of the week is logged: celebratory animation + "Goal Crushed! 💪"
- Streak milestones (2, 4, 8, 12, 26, 52 weeks): badge unlock animation

### 8.4 Alcohol Awareness
- No reward system — purely informational tracking
- End of week: if under 17 units, subtle green checkmark
- If over: amber/red indicator (no shaming, just awareness)
- Badge unlocks still apply for consecutive weeks under the limit

### 8.5 Animations
- **Goal met:** confetti burst + haptic feedback
- **Badge unlocked:** badge flies in with glow effect + celebratory sound (optional)
- **Snack Pass unlocked:** eating card does a party shimmer effect
- **Weekly recap:** gentle progress bar fills on screen load

---

## 9. Notifications

| Notification         | Default Time | Content                                      |
|----------------------|-------------|-----------------------------------------------|
| Morning reminder     | 8:00 AM     | "Good morning! You need X more workouts this week" |
| Evening log reminder | 9:00 PM     | "Don't forget to log your meals and drinks today" |
| Snack Pass unlock    | Saturday 9 AM | "🎉 Clean week! Your Weekend Snack Pass is unlocked!" |
| Weekly recap         | Sunday 9 PM | "Here's how your week went: 🏋️✅ 🥗✅ 🍺✅"        |

---

## 10. Visual Design

### Color Palette
- **Background:** Deep navy / near-black (#0A0E1A)
- **Cards:** Glassmorphism — frosted glass with subtle white border
- **Exercise accent:** Electric blue (#4A90FF)
- **Eating accent:** Fresh green (#34C759)
- **Alcohol accent:** Warm amber (#FF9F0A)
- **Danger/over limit:** Soft red (#FF453A)
- **Success:** Bright green (#30D158)

### Typography
- SF Pro Display (headers), SF Pro Text (body)
- Large, bold weekly progress numbers
- Clean, minimal information density

### Design Principles
1. **Glanceable** — open app, instantly know where you stand this week
2. **Delightful** — every goal completion feels rewarding (animation + haptic)
3. **Non-judgmental** — red indicators for awareness, never shaming language
4. **Minimal input** — Strava auto-syncs, drink picker is 2 taps, meals are quick text

---

## 11. Implementation Phases

### Phase 1: Foundation
- Xcode project setup (SwiftUI + SwiftData)
- Data models (WorkoutEntry, MealEntry, SnackEntry, DrinkEntry, Badge)
- MVVM architecture scaffolding
- Tab bar navigation shell

### Phase 2: Core Tracking
- "This Week" home screen with 3 tracker cards
- Log screen (manual workout, meal, snack, drinks)
- Drink unit auto-calculation
- Weekly goal computation + streak logic

### Phase 3: Strava Integration
- OAuth2 flow for Strava
- Activity sync + deduplication
- Workout type mapping
- Background refresh

### Phase 4: Food AI
- Core ML food recognition model integration
- Photo capture + text-based calorie estimation
- Healthy/unhealthy classification
- User override UI

### Phase 5: Gamification & Animations
- Badge system with unlock logic
- Weekend Snack Pass mechanic
- Confetti / celebration animations
- Haptic feedback on milestones

### Phase 6: History & Stats
- Weekly history view with expansion
- Monthly summary with trend arrows
- Swift Charts integration
- Badge gallery

### Phase 7: Notifications & Settings
- Morning + evening reminders
- Snack Pass + weekly recap notifications
- Settings screen (goals, Strava, appearance, data)
- Final polish & edge cases
