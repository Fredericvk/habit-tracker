import * as store from '../store.js';
import { startOfWeek, endOfWeek, daysInWeek, weekdayName, shortDate, weekNumber } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';

let currentDate = new Date();
let container = null;

export function init() {}

function progressRingSVG(pct, color, size = 80, stroke = 7) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  return `
    <div class="progress-ring-wrap" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-secondary)" stroke-width="${stroke}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
          class="progress-ring__circle" transform="rotate(-90 ${size/2} ${size/2})"/>
      </svg>
      <span class="ring-label">${Math.round(pct)}%</span>
    </div>`;
}

export async function render(el) {
  container = el;
  container.innerHTML = '';

  const ws = startOfWeek(currentDate);
  const we = endOfWeek(currentDate);
  const days = daysInWeek(currentDate);

  const nav = document.createElement('div');
  nav.className = 'date-nav';
  nav.innerHTML = `
    <button class="nav-arrow" id="wk-prev">‹</button>
    <span class="date-label">W${weekNumber(ws)} · ${shortDate(ws)} – ${shortDate(we)}</span>
    <button class="nav-arrow" id="wk-next">›</button>
  `;
  container.appendChild(nav);

  nav.querySelector('#wk-prev').onclick = () => { currentDate.setDate(currentDate.getDate() - 7); render(container); };
  nav.querySelector('#wk-next').onclick = () => { currentDate.setDate(currentDate.getDate() + 7); render(container); };

  const [avgCal, activeDays, cleanDays, totalUnits, alcKcal] = await Promise.all([
    store.avgCaloriesForWeek(ws),
    store.activeDaysForWeek(ws),
    store.cleanWeekdaysForWeek(ws),
    store.totalUnitsForWeek(ws),
    store.totalAlcoholKcalForWeek(ws)
  ]);

  const calGoal = await store.getGoal('calories');
  const exGoal = await store.getGoal('exercise');
  const snGoal = await store.getGoal('snacking');
  const alGoal = await store.getGoal('alcohol');

  const calTarget = calGoal?.target ?? 2300;
  const exTarget = exGoal?.target ?? 7;
  const snTarget = snGoal?.target ?? 5;
  const alTarget = alGoal?.target ?? 17;

  // Calories
  const calPct = calTarget > 0 ? Math.min(100, Math.round((avgCal / calTarget) * 100)) : 0;
  const calCard = document.createElement('div');
  calCard.className = 'glass-card';
  calCard.innerHTML = `
    <div class="card-header">
      <div><div class="card-title">Calories</div><div class="card-subtitle">Avg ${avgCal} / ${calTarget} kcal</div></div>
      <div class="card-icon blue">🔥</div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      ${progressRingSVG(calPct, 'var(--accent-blue)')}
      <div class="text-tertiary" style="font-size:13px">Daily average across the week</div>
    </div>
  `;
  container.appendChild(calCard);

  // Exercise
  const exPct = exTarget > 0 ? Math.min(100, Math.round((activeDays / exTarget) * 100)) : 0;
  const workouts = await store.workoutsInRange(ws, we);
  const exCard = document.createElement('div');
  exCard.className = 'glass-card';

  const dotDays = days.map(d => {
    const hasW = workouts.some(w => new Date(w.date).toDateString() === d.toDateString());
    return `<div class="workout-dot ${hasW ? 'active' : 'inactive'}">${weekdayName(d).charAt(0)}</div>`;
  }).join('');

  exCard.innerHTML = `
    <div class="card-header">
      <div><div class="card-title">Exercise</div><div class="card-subtitle">${activeDays} / ${exTarget} active days</div></div>
      <div class="card-icon green">💪</div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      ${progressRingSVG(exPct, 'var(--accent-green)')}
      <div class="workout-dots">${dotDays}</div>
    </div>
  `;
  container.appendChild(exCard);

  // No Snacking
  const snPct = snTarget > 0 ? Math.min(100, Math.round((cleanDays / snTarget) * 100)) : 0;
  const snCard = document.createElement('div');
  snCard.className = 'glass-card';

  const meals = await store.mealsInRange(ws, we);
  const dayPills = days.slice(0, 5).map(d => {
    const dayMeals = meals.filter(m => new Date(m.date).toDateString() === d.toDateString());
    const snacked = dayMeals.some(m => m.mealType === 'Snack');
    const hasData = dayMeals.length > 0;
    const cls = hasData ? (snacked ? 'snacked' : 'clean') : 'empty';
    return `<div class="day-pill ${cls}">${weekdayName(d).charAt(0)}</div>`;
  }).join('');

  snCard.innerHTML = `
    <div class="card-header">
      <div><div class="card-title">No Snacking</div><div class="card-subtitle">${cleanDays} / ${snTarget} clean weekdays</div></div>
      <div class="card-icon amber">🍎</div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      ${progressRingSVG(snPct, 'var(--accent-amber)')}
      <div class="day-pills" style="flex:1">${dayPills}</div>
    </div>
  `;
  container.appendChild(snCard);

  // Alcohol
  const alPct = alTarget > 0 ? Math.min(100, Math.round((totalUnits / alTarget) * 100)) : 0;
  const drinks = await store.drinksInRange(ws, we);
  const alCard = document.createElement('div');
  alCard.className = 'glass-card';

  const drinkChips = {};
  for (const d of drinks) {
    const t = d.drinkType || 'Other';
    drinkChips[t] = (drinkChips[t] || 0) + (d.quantity || 1);
  }
  const chipsHTML = Object.entries(drinkChips).map(([t, q]) =>
    `<div class="chip purple">${escapeHTML(t)} ×${q}</div>`
  ).join('') || '<span class="text-tertiary">No drinks logged</span>';

  alCard.innerHTML = `
    <div class="card-header">
      <div><div class="card-title">Alcohol</div><div class="card-subtitle">${totalUnits.toFixed(1)} / ${alTarget} units</div></div>
      <div class="card-icon purple">🍺</div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      ${progressRingSVG(alPct, 'var(--accent-purple)')}
      <div class="drink-chips" style="flex:1">${chipsHTML}</div>
    </div>
  `;
  container.appendChild(alCard);

  // Weight
  const weights = await store.weightsInRange(ws, we);
  const wtGoal = await store.getGoal('weight');
  const wtTarget = wtGoal?.target ?? 93.0;
  const latestWt = weights.length > 0 ? weights[weights.length - 1].value : null;
  const wtPct = latestWt != null ? Math.min(100, Math.round((wtTarget / latestWt) * 100)) : 0;

  const wtCard = document.createElement('div');
  wtCard.className = 'glass-card';
  wtCard.innerHTML = `
    <div class="card-header">
      <div><div class="card-title">Weight</div><div class="card-subtitle">${latestWt != null ? latestWt.toFixed(1) + ' kg' : 'No data'} → ${wtTarget} kg</div></div>
      <div class="card-icon blue">⚖️</div>
    </div>
    <div class="progress-bar"><div class="bar-fill blue" style="width:${wtPct}%"></div></div>
  `;
  container.appendChild(wtCard);
}
