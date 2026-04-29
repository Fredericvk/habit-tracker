import * as store from '../store.js';
import { startOfDay, endOfDay, formatDate } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';
import { icon } from '../utils/icons.js';

let currentDate = new Date();
let container = null;

export function init() {}

export function setDate(date) {
  currentDate = new Date(date);
}

const MEAL_ICONS = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snack: '🍿', Other: '🍽️' };
const MEAL_COLORS = { Breakfast: 'var(--accent-amber)', Lunch: 'var(--accent-blue)', Dinner: 'var(--accent-purple)', Snack: 'var(--danger)', Other: 'var(--text-tertiary)' };
const WORKOUT_ICONS = { Run: '🏃', Gym: '🏋️', Walk: '🚶', Cycle: '🚴', Swim: '🏊', Yoga: '🧘', HIIT: '🔥' };
const DRINK_ICONS = { Beer: '🍺', Wine: '🍷', Spirit: '🥃', Cocktail: '🍸', Cider: '🍺' };

function donutSVG(pct, color, size = 100, stroke = 9) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  return `<svg width="${size}" height="${size}" class="dy-donut">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-secondary)" stroke-width="${stroke}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
      transform="rotate(-90 ${size/2} ${size/2})" class="dy-donut-ring"/>
  </svg>`;
}

export async function render(el) {
  container = el;
  container.innerHTML = '';

  /* ── Navigation ── */
  const nav = document.createElement('div');
  nav.className = 'date-nav';
  nav.innerHTML = `
    <button class="nav-arrow" id="day-prev">‹</button>
    <span class="date-label" id="day-label">${formatDate(currentDate)}</span>
    <button class="nav-arrow" id="day-next">›</button>
  `;
  container.appendChild(nav);
  nav.querySelector('#day-prev').onclick = () => { currentDate.setDate(currentDate.getDate() - 1); render(container); };
  nav.querySelector('#day-next').onclick = () => { currentDate.setDate(currentDate.getDate() + 1); render(container); };

  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);

  /* ── Fetch data ── */
  const [meals, workouts, drinks, weights, totalCal, calGoal, exGoal, alGoal, wtGoal] = await Promise.all([
    store.mealsInRange(dayStart, dayEnd),
    store.workoutsInRange(dayStart, dayEnd),
    store.drinksInRange(dayStart, dayEnd),
    store.weightsInRange(dayStart, dayEnd),
    store.totalCaloriesForDay(currentDate),
    store.getGoal('calories'),
    store.getGoal('exercise'),
    store.getGoal('alcohol'),
    store.getGoal('weight')
  ]);

  const calTarget = calGoal?.target ?? 2300;
  const alTarget = alGoal?.target ?? 17;
  const wtTarget = wtGoal?.target ?? 93.0;

  const hasSnack = meals.some(m => m.mealType === 'Snack');
  const totalUnits = drinks.reduce((s, d) => s + (d.units || 0), 0);
  const totalAlcKcal = drinks.reduce((s, d) => s + (d.kcal || 0), 0);
  const todayWeight = weights.length > 0 ? weights[weights.length - 1] : null;

  /* ══════════════════════════════
     DAILY SUMMARY BADGES
     ══════════════════════════════ */
  const badges = [
    { label: 'Calories', ok: totalCal > 0 && totalCal <= calTarget, na: totalCal === 0 },
    { label: 'Exercise', ok: workouts.length > 0, na: false },
    { label: 'No Snacks', ok: !hasSnack && meals.length > 0, na: meals.length === 0 },
    { label: 'No Alcohol', ok: totalUnits === 0, na: false },
  ];
  const badgesHTML = badges.map(b => {
    const cls = b.na ? 'dy-badge-na' : b.ok ? 'dy-badge-ok' : 'dy-badge-fail';
    const badgeIcon = b.na ? '—' : b.ok ? icon('check', 16) : icon('xCircle', 16);
    return `<div class="dy-badge ${cls}"><span class="dy-badge-icon">${badgeIcon}</span><span class="dy-badge-label">${b.label}</span></div>`;
  }).join('');
  const badgeRow = document.createElement('div');
  badgeRow.className = 'dy-badge-row';
  badgeRow.innerHTML = badgesHTML;
  container.appendChild(badgeRow);

  /* ══════════════════════════════
     1. CALORIES CARD – donut + meals + snacks + drinks
     ══════════════════════════════ */
  const snackItems = meals.filter(m => m.mealType === 'Snack');
  const snackKcal = snackItems.reduce((s, m) => s + (m.kcal || 0), 0);
  const allCal = totalCal + totalAlcKcal;
  const calPct = calTarget > 0 ? Math.min(100, Math.round((allCal / calTarget) * 100)) : 0;
  const remaining = Math.max(0, calTarget - allCal);
  const calColor = allCal <= calTarget ? 'var(--accent-purple)' : 'var(--danger)';

  const groups = {};
  for (const m of meals) { const t = m.mealType || 'Other'; (groups[t] = groups[t] || []).push(m); }

  let mealsHTML = '';
  // Meals (non-snack)
  for (const [type, items] of Object.entries(groups)) {
    if (type === 'Snack') continue;
    const typeKcal = items.reduce((s, m) => s + (m.kcal || 0), 0);
    mealsHTML += `<div class="dy-meal-group">
      <div class="dy-meal-type"><span class="dy-meal-type-icon">${MEAL_ICONS[type] || '🍽️'}</span>${type}<span class="dy-meal-type-kcal">${typeKcal} kcal</span></div>`;
    for (const item of items) {
      mealsHTML += `<div class="dy-meal-item">
        <span class="dy-meal-desc">${escapeHTML(item.description || 'Meal')}</span>
        <span class="dy-meal-kcal">${item.kcal || 0}</span>
        <button class="delete-btn" data-meal-id="${item.id}">✕</button>
      </div>`;
    }
    mealsHTML += `</div>`;
  }
  // Snacks section
  if (snackItems.length > 0) {
    mealsHTML += `<div class="dy-meal-group dy-meal-group-snack">
      <div class="dy-meal-type"><span class="dy-meal-type-icon">🍿</span>Snacks<span class="dy-meal-type-kcal dy-kcal-danger">${snackKcal} kcal</span></div>`;
    for (const s of snackItems) {
      mealsHTML += `<div class="dy-meal-item dy-meal-item-snack">
        <span class="dy-meal-desc">${escapeHTML(s.description || 'Snack')}</span>
        <span class="dy-meal-kcal dy-kcal-danger">${s.kcal || 0}</span>
        <button class="delete-btn" data-meal-id="${s.id}">✕</button>
      </div>`;
    }
    mealsHTML += `</div>`;
  }
  // Drinks section
  if (drinks.length > 0) {
    mealsHTML += `<div class="dy-meal-group dy-meal-group-drink">
      <div class="dy-meal-type"><span class="dy-meal-type-icon">🍺</span>Drinks<span class="dy-meal-type-kcal dy-kcal-purple">${totalAlcKcal} kcal</span></div>`;
    for (const d of drinks) {
      const dIcon = DRINK_ICONS[d.drinkType] || '🍹';
      mealsHTML += `<div class="dy-meal-item dy-meal-item-drink">
        <span class="dy-meal-desc">${dIcon} ${escapeHTML(d.drinkType || 'Drink')} ×${d.quantity || 1}</span>
        <span class="dy-meal-kcal dy-kcal-purple">${d.kcal || 0}</span>
        <button class="delete-btn" data-drink-id="${d.id}">✕</button>
      </div>`;
    }
    mealsHTML += `</div>`;
  }

  const calCard = document.createElement('div');
  calCard.className = `glass-card dy-cal-card ${allCal > 0 && allCal <= calTarget ? 'dy-card-glow-purple' : allCal > calTarget ? 'dy-card-glow-red' : ''}`;
  calCard.innerHTML = `
    <div class="wk-card-head">
      <div class="wk-card-icon wk-icon-cal">${icon('flame', 20)}</div>
      <div class="wk-card-info">
        <div class="wk-card-title">Calories</div>
        <div class="wk-card-stat">${allCal} / ${calTarget} kcal</div>
      </div>
    </div>
    <div class="dy-cal-hero">
      <div class="dy-donut-wrap">
        ${donutSVG(calPct, calColor)}
        <div class="dy-donut-center">
          <span class="dy-donut-number">${allCal}</span>
          <span class="dy-donut-unit">kcal</span>
        </div>
      </div>
      <div class="dy-cal-meta">
        <div class="dy-cal-target">Target: ${calTarget} kcal</div>
        <div class="dy-cal-remaining ${allCal > calTarget ? 'dy-over' : ''}">${allCal > calTarget ? `${allCal - calTarget} over` : `${remaining} left`}</div>
      </div>
    </div>
    <div class="dy-meals-list">
      ${mealsHTML || '<p class="text-tertiary" style="padding:12px 0;text-align:center">No meals logged today</p>'}
    </div>
  `;
  container.appendChild(calCard);

  // Delete handlers for meals/snacks
  calCard.querySelectorAll('.delete-btn[data-meal-id]').forEach(btn => {
    btn.onclick = async () => { await store.deleteMeal(Number(btn.dataset.mealId)); render(container); };
  });
  // Delete handlers for drinks
  calCard.querySelectorAll('.delete-btn[data-drink-id]').forEach(btn => {
    btn.onclick = async () => { await store.deleteDrink(Number(btn.dataset.drinkId)); render(container); };
  });

  /* ══════════════════════════════
     2. EXERCISE CARD
     ══════════════════════════════ */
  // Estimated calories per minute by workout type
  const CAL_PER_MIN = { Run: 10, Gym: 8, Walk: 4, Cycle: 9, Swim: 11, Yoga: 4, HIIT: 12 };

  const exCard = document.createElement('div');
  exCard.className = `glass-card dy-ex-card ${workouts.length > 0 ? 'dy-card-glow-green' : ''}`;
  if (workouts.length > 0) {
    const totalDur = workouts.reduce((s, w) => s + (w.duration || 0), 0);
    const totalBurned = workouts.reduce((s, w) => s + (w.duration || 0) * (CAL_PER_MIN[w.type] || 7), 0);
    const workoutList = workouts.map(w => {
      const wIcon = WORKOUT_ICONS[w.type] || '🏃';
      const burned = (w.duration || 0) * (CAL_PER_MIN[w.type] || 7);
      return `<div class="dy-ex-item">
        <span class="dy-ex-icon">${wIcon}</span>
        <div class="dy-ex-detail">
          <span class="dy-ex-type">${escapeHTML(w.type || 'Workout')}</span>
          <span class="dy-ex-dur">${w.duration ? `${w.duration} min` : ''}${burned ? ` · ~${burned} kcal` : ''}</span>
        </div>
      </div>`;
    }).join('');
    exCard.innerHTML = `
      <div class="wk-card-head">
        <div class="wk-card-icon wk-icon-ex">${icon('dumbbell', 20)}</div>
        <div class="wk-card-info">
          <div class="wk-card-title">Exercise</div>
          <div class="wk-card-stat">${workouts.length} workout${workouts.length > 1 ? 's' : ''} · ${totalDur} min · ~${totalBurned} kcal</div>
        </div>
      </div>
      <div class="dy-ex-list">${workoutList}</div>
    `;
  } else {
    exCard.innerHTML = `
      <div class="wk-card-head">
        <div class="wk-card-icon wk-icon-ex">${icon('dumbbell', 20)}</div>
        <div class="wk-card-info">
          <div class="wk-card-title">Exercise</div>
          <div class="wk-card-stat">No workouts today</div>
        </div>
      </div>
      <div class="dy-ex-empty">
        <span class="dy-ex-empty-icon">🛋️</span>
        <span class="dy-ex-empty-msg">Rest day — recharge for tomorrow!</span>
      </div>
    `;
  }
  container.appendChild(exCard);

  /* ══════════════════════════════
     3 & 4. SNACK STATUS + ALCOHOL STATUS — half-width side by side
     ══════════════════════════════ */
  const halfRow = document.createElement('div');
  halfRow.className = 'dy-half-row';

  // Snack status card
  const snClean = !hasSnack && meals.length > 0;
  const snNA = meals.length === 0;
  const snCard = document.createElement('div');
  snCard.className = `glass-card dy-half-card ${snClean ? 'dy-half-ok' : hasSnack ? 'dy-half-warn' : ''}`;
  if (snClean) {
    snCard.innerHTML = `
      <div class="dy-half-head"><span class="dy-half-head-icon dy-hicon-snack">🍫</span><span class="dy-half-head-title">Snacks</span></div>
      <span class="dy-half-icon">✨</span>
      <span class="dy-half-title">No Snacks</span>
      <span class="dy-half-sub">Clean day!</span>`;
  } else if (hasSnack) {
    snCard.innerHTML = `
      <div class="dy-half-head"><span class="dy-half-head-icon dy-hicon-snack">🍫</span><span class="dy-half-head-title">Snacks</span></div>
      <span class="dy-half-icon">🍿</span>
      <span class="dy-half-title">Snacked</span>
      <span class="dy-half-sub">${snackItems.length} snack${snackItems.length > 1 ? 's' : ''} · ${snackKcal} kcal</span>`;
  } else {
    snCard.innerHTML = `
      <div class="dy-half-head"><span class="dy-half-head-icon dy-hicon-snack">🍫</span><span class="dy-half-head-title">Snacks</span></div>
      <span class="dy-half-icon">📝</span>
      <span class="dy-half-title">Snacks</span>
      <span class="dy-half-sub">No data yet</span>`;
  }

  // Alcohol status card
  const alcFree = totalUnits === 0;
  const alcCard = document.createElement('div');
  alcCard.className = `glass-card dy-half-card ${alcFree ? 'dy-half-ok-alc' : 'dy-half-warn-alc'}`;
  if (alcFree) {
    alcCard.innerHTML = `
      <div class="dy-half-head"><span class="dy-half-head-icon dy-hicon-alc">${icon('beer', 16)}</span><span class="dy-half-head-title">Alcohol</span></div>
      <span class="dy-half-icon">✨</span>
      <span class="dy-half-title">No Drinks</span>
      <span class="dy-half-sub">Great choice!</span>`;
  } else {
    alcCard.innerHTML = `
      <div class="dy-half-head"><span class="dy-half-head-icon dy-hicon-alc">${icon('beer', 16)}</span><span class="dy-half-head-title">Alcohol</span></div>
      <span class="dy-half-icon">🍺</span>
      <span class="dy-half-title">${totalUnits.toFixed(1)} Units</span>
      <span class="dy-half-sub">${drinks.length} drink${drinks.length > 1 ? 's' : ''}</span>`;
  }

  halfRow.appendChild(snCard);
  halfRow.appendChild(alcCard);
  container.appendChild(halfRow);

  /* ══════════════════════════════
     5. WEIGHT CARD (if logged)
     ══════════════════════════════ */
  if (todayWeight) {
    // Find previous entry for delta
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 30);
    const recentWeights = await store.weightsInRange(prevDay, new Date(dayStart.getTime() - 1));
    const prevEntry = recentWeights.length > 0 ? recentWeights[recentWeights.length - 1] : null;
    const delta = prevEntry ? todayWeight.value - prevEntry.value : null;
    const distToGoal = todayWeight.value - wtTarget;

    // Mini trend — last 7 entries
    const allRecent = [...recentWeights.slice(-6), todayWeight];
    let trendSVG = '';
    if (allRecent.length >= 2) {
      const vals = allRecent.map(w => w.value);
      const mn = Math.min(...vals, wtTarget) - 0.3;
      const mx = Math.max(...vals, wtTarget) + 0.3;
      const rng = mx - mn || 1;
      const sw = 220, sh = 40, pd = 6;
      const pw = sw - pd * 2, ph = sh - pd * 2;
      const tgtY = pd + ph - ((wtTarget - mn) / rng) * ph;
      const pts = allRecent.map((w, i) => {
        const x = pd + (i / (allRecent.length - 1)) * pw;
        const y = pd + ph - ((w.value - mn) / rng) * ph;
        return `${x},${y}`;
      });
      trendSVG = `<svg class="dy-wt-trend" viewBox="0 0 ${sw} ${sh}">
        <line x1="${pd}" y1="${tgtY}" x2="${sw - pd}" y2="${tgtY}" stroke="var(--accent-green)" stroke-width="1" stroke-dasharray="3,2" opacity="0.5"/>
        <polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${allRecent.map((w, i) => { const x = pd + (i / (allRecent.length - 1)) * pw; const y = pd + ph - ((w.value - mn) / rng) * ph; return `<circle cx="${x}" cy="${y}" r="3" fill="var(--accent-blue)"/>`; }).join('')}
      </svg>`;
    }

    const wtCard = document.createElement('div');
    wtCard.className = 'glass-card dy-wt-card';
    wtCard.innerHTML = `
      <div class="dy-wt-hero">
        <div class="dy-wt-big">${todayWeight.value.toFixed(1)}<span class="dy-wt-unit">kg</span></div>
        <div class="dy-wt-deltas">
          ${delta != null ? `<span class="dy-wt-delta ${delta <= 0 ? 'dy-wt-down' : 'dy-wt-up'}">${delta <= 0 ? '↓' : '↑'} ${Math.abs(delta).toFixed(1)} kg from last</span>` : ''}
          <span class="dy-wt-goal-dist">${Math.abs(distToGoal).toFixed(1)} kg ${distToGoal > 0 ? 'above' : 'below'} goal</span>
        </div>
      </div>
      ${trendSVG}
    `;
    container.appendChild(wtCard);
  }
}
