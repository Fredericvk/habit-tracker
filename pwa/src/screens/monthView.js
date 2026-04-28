import * as store from '../store.js';
import { startOfMonth, endOfMonth, startOfWeek, monthYear, weekNumber, weekdayName, isSameDay, daysInWeek, shortDate } from '../dateHelper.js';

let currentDate = new Date();
let container = null;

export function init() {}

export async function render(el) {
  container = el;
  container.innerHTML = '';

  const ms = startOfMonth(currentDate);
  const me = endOfMonth(currentDate);

  const nav = document.createElement('div');
  nav.className = 'date-nav';
  nav.innerHTML = `
    <button class="nav-arrow" id="mo-prev">‹</button>
    <span class="date-label">${monthYear(currentDate)}</span>
    <button class="nav-arrow" id="mo-next">›</button>
  `;
  container.appendChild(nav);

  nav.querySelector('#mo-prev').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); render(container); };
  nav.querySelector('#mo-next').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); render(container); };

  // Build mini calendar
  const calCard = document.createElement('div');
  calCard.className = 'glass-card';

  const meals = await store.mealsInRange(ms, me);
  const workouts = await store.workoutsInRange(ms, me);
  const today = new Date();

  // Calendar header
  const headers = ['Wk', 'M', 'T', 'W', 'T', 'F', 'S', 'S'];
  let calHTML = '<div class="mini-calendar">';
  calHTML += headers.map(h => `<div class="mc-header">${h}</div>`).join('');

  // Find first Monday on or before the 1st
  const firstDay = new Date(ms);
  const dow = firstDay.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  firstDay.setDate(firstDay.getDate() + offset);

  const calDate = new Date(firstDay);
  while (calDate <= me || calDate.getDay() !== 1) {
    if (calDate.getDay() === 1) {
      const wn = weekNumber(calDate);
      const wkStart = new Date(calDate);
      calHTML += `<div class="mc-wk" data-wk="${wkStart.toISOString()}">W${wn}</div>`;
    }

    const inMonth = calDate.getMonth() === ms.getMonth();
    const isToday = isSameDay(calDate, today);
    const dayMeals = meals.filter(m => isSameDay(new Date(m.date), calDate));
    const dayWorkouts = workouts.filter(w => isSameDay(new Date(w.date), calDate));

    let dotColor = '';
    if (inMonth && (dayMeals.length > 0 || dayWorkouts.length > 0)) {
      const hasSnack = dayMeals.some(m => m.mealType === 'Snack');
      dotColor = hasSnack ? 'amber' : (dayWorkouts.length > 0 ? 'green' : 'green');
    }

    calHTML += `<div class="mc-day ${isToday ? 'today' : ''} ${!inMonth ? 'empty' : ''}">
      ${inMonth ? calDate.getDate() : ''}
      ${dotColor ? `<span class="mc-dot ${dotColor}"></span>` : ''}
    </div>`;

    calDate.setDate(calDate.getDate() + 1);
    if (calDate > me && calDate.getDay() !== 1) {
      // fill rest of the week
    }
    if (calDate > me && calDate.getDay() === 1) break;
  }
  calHTML += '</div>';
  calCard.innerHTML = calHTML;
  container.appendChild(calCard);

  // Week detail overlay setup
  calCard.querySelectorAll('.mc-wk').forEach(wkEl => {
    wkEl.onclick = () => openWeekDetail(new Date(wkEl.dataset.wk));
  });

  // Month summary
  const summaryCard = document.createElement('div');
  summaryCard.className = 'glass-card';
  const totalMeals = meals.length;
  const totalWorkouts = workouts.length;
  summaryCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Month Summary</div>
    </div>
    <div style="display:flex;gap:12px">
      <div class="meta-item" style="flex:1;padding:12px;border-radius:12px;background:var(--bg-tertiary);text-align:center">
        <div class="meta-value">${totalMeals}</div>
        <div class="meta-label">Meals logged</div>
      </div>
      <div class="meta-item" style="flex:1;padding:12px;border-radius:12px;background:var(--bg-tertiary);text-align:center">
        <div class="meta-value">${totalWorkouts}</div>
        <div class="meta-label">Workouts</div>
      </div>
    </div>
  `;
  container.appendChild(summaryCard);
}

async function openWeekDetail(weekStart) {
  const existing = document.querySelector('#week-detail-overlay');
  if (existing) existing.remove();

  const days = daysInWeek(weekStart);
  const meals = await store.mealsInRange(weekStart, days[6]);
  const workouts = await store.workoutsInRange(weekStart, days[6]);
  const drinks = await store.drinksInRange(weekStart, days[6]);

  const overlay = document.createElement('div');
  overlay.id = 'week-detail-overlay';
  overlay.className = 'overlay open';

  const dayHeaders = days.map(d => `<div class="wg-header">${weekdayName(d)}</div>`).join('');

  const rows = ['Calories', 'Exercise', 'Snacking', 'Alcohol'];
  let gridHTML = `<div class="week-grid"><div class="wg-header"></div>${dayHeaders}`;

  for (const row of rows) {
    gridHTML += `<div class="wg-label">${row}</div>`;
    for (const d of days) {
      const dayMeals = meals.filter(m => isSameDay(new Date(m.date), d));
      const dayW = workouts.filter(w => isSameDay(new Date(w.date), d));
      const dayD = drinks.filter(dr => isSameDay(new Date(dr.date), d));

      let cls = 'muted';
      let val = '—';
      if (row === 'Calories') {
        const kcal = dayMeals.reduce((s, m) => s + (m.kcal || 0), 0);
        if (kcal > 0) { val = Math.round(kcal / 100) + ''; cls = kcal <= 2300 ? 'green' : 'red'; }
      } else if (row === 'Exercise') {
        if (dayW.length > 0) { val = '✓'; cls = 'green'; }
      } else if (row === 'Snacking') {
        const has = dayMeals.some(m => m.mealType === 'Snack');
        if (dayMeals.length > 0) { val = has ? '✕' : '✓'; cls = has ? 'red' : 'green'; }
      } else if (row === 'Alcohol') {
        const units = dayD.reduce((s, dr) => s + (dr.units || 0), 0);
        if (units > 0) { val = units.toFixed(1); cls = 'amber'; }
      }
      gridHTML += `<div class="wg-cell ${cls}">${val}</div>`;
    }
  }
  gridHTML += '</div>';

  overlay.innerHTML = `
    <div class="overlay-panel">
      <header class="overlay-header">
        <h2>W${weekNumber(weekStart)} · ${shortDate(weekStart)}</h2>
        <button class="icon-btn" id="close-wk-detail" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </header>
      <div class="overlay-body">${gridHTML}</div>
    </div>
  `;

  document.querySelector('.app').appendChild(overlay);
  overlay.querySelector('#close-wk-detail').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
