import * as store from '../store.js';
import { startOfWeek, endOfWeek, daysInWeek, weekdayName, shortDate, weekNumber, startOfDay, isWeekday } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';
import { icon } from '../utils/icons.js';

let currentDate = new Date();
let container = null;

export function init() {}

const WORKOUT_ICONS = { Run: '🏃', Gym: '🏋️', Walk: '🚶', Cycle: '🚴', Swim: '🏊', Yoga: '🧘', HIIT: '🔥' };
const DRINK_ICONS = { Beer: '🍺', Wine: '🍷', Spirit: '🥃', Cocktail: '🍸', Cider: '🍺' };
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export async function render(el) {
  container = el;
  container.innerHTML = '';

  const ws = startOfWeek(currentDate);
  const we = endOfWeek(currentDate);
  const days = daysInWeek(currentDate);

  /* ── Navigation ── */
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

  /* ── Fetch all data in parallel ── */
  const [avgCal, activeDays, cleanDays, totalUnits, alcKcal, meals, workouts, drinks, weights,
    calGoal, exGoal, snGoal, alGoal, wtGoal] = await Promise.all([
    store.avgCaloriesForWeek(ws),
    store.activeDaysForWeek(ws),
    store.cleanWeekdaysForWeek(ws),
    store.totalUnitsForWeek(ws),
    store.totalAlcoholKcalForWeek(ws),
    store.mealsInRange(ws, we),
    store.workoutsInRange(ws, we),
    store.drinksInRange(ws, we),
    store.weightsInRange(ws, we),
    store.getGoal('calories'),
    store.getGoal('exercise'),
    store.getGoal('snacking'),
    store.getGoal('alcohol'),
    store.getGoal('weight')
  ]);

  const calTarget = calGoal?.target ?? 2300;
  const exTarget = exGoal?.target ?? 7;
  const snTarget = snGoal?.target ?? 5;
  const alTarget = alGoal?.target ?? 17;
  const wtTarget = wtGoal?.target ?? 93.0;

  // Helper: match items to a day
  const onDay = (arr, d) => arr.filter(i => new Date(i.date).toDateString() === d.toDateString());

  /* ═══════════════════════════════
     1. CALORIES CARD – vertical daily log
     ═══════════════════════════════ */
  const today = new Date();
  const pastDays = days.filter(d => startOfDay(d) <= startOfDay(today));

  const calRows = pastDays.map(d => {
    const dayMeals = onDay(meals, d).filter(m => m.mealType !== 'Snack');
    const dayCal = dayMeals.reduce((s, m) => s + (m.kcal || 0), 0);
    const colorCls = dayCal === 0 ? 'muted' : dayCal <= calTarget * 0.9 ? 'green' : dayCal <= calTarget ? 'amber' : 'danger';

    const mealList = dayMeals.length > 0
      ? dayMeals.map(m => `<div class="wk-cal-meal"><span class="wk-cal-meal-desc">${escapeHTML(m.description || m.mealType)}</span><span class="wk-cal-meal-kcal">${m.kcal || 0}</span></div>`).join('')
      : '<span class="wk-cal-empty">No meals</span>';

    return `<div class="wk-cal-day">
      <div class="wk-cal-day-label">${weekdayName(d)}</div>
      <div class="wk-cal-day-meals">${mealList}</div>
      <div class="wk-cal-day-total ${colorCls}">${dayCal > 0 ? dayCal : '—'}</div>
    </div>`;
  }).join('');

  appendCard(container, 'wk-cal-card', `
    <div class="wk-card-head">
      <div class="wk-card-icon wk-icon-cal">${icon('flame', 20)}</div>
      <div class="wk-card-info">
        <div class="wk-card-title">Calories</div>
        <div class="wk-card-stat">Avg <strong>${avgCal}</strong> / ${calTarget} kcal</div>
      </div>
    </div>
    <div class="wk-cal-list">${calRows}</div>
  `);

  /* ═══════════════════════════════
     2. EXERCISE CARD – workout log
     ═══════════════════════════════ */
  const exRows = pastDays.map(d => {
    const dayIdx = days.indexOf(d);
    const dw = onDay(workouts, d);
    if (dw.length === 0) {
      return `<div class="wk-ex-day"><span class="wk-ex-label">${DAY_LABELS[dayIdx]}</span><span class="wk-ex-rest">Rest</span></div>`;
    }
    const items = dw.map(w => {
      const wIcon = WORKOUT_ICONS[w.type] || '🏃';
      return `<span class="wk-ex-entry">${wIcon} ${escapeHTML(w.type || 'Workout')}${w.duration ? ' · ' + w.duration + 'm' : ''}</span>`;
    }).join('');
    return `<div class="wk-ex-day wk-ex-active"><span class="wk-ex-label">${DAY_LABELS[dayIdx]}</span><div class="wk-ex-items">${items}</div></div>`;
  }).join('');

  appendCard(container, 'wk-ex-card', `
    <div class="wk-card-head">
      <div class="wk-card-icon wk-icon-ex">${icon('dumbbell', 20)}</div>
      <div class="wk-card-info">
        <div class="wk-card-title">Exercise</div>
        <div class="wk-card-stat"><strong>${activeDays}</strong> / ${exTarget} active days</div>
      </div>
    </div>
    <div class="wk-ex-grid">${exRows}</div>
  `);

  /* ═══════════════════════════════
     3. NO SNACKING CARD – Mon-Fri
     ═══════════════════════════════ */
  const pastWeekdays = pastDays.filter(d => isWeekday(d));
  const snDays = pastWeekdays.map(d => {
    const dayIdx = days.indexOf(d);
    const dayMeals = onDay(meals, d);
    const snackItems = dayMeals.filter(m => m.mealType === 'Snack');
    const hasData = dayMeals.length > 0;
    const isClean = hasData && snackItems.length === 0;
    const snacked = snackItems.length > 0;

    let statusCls = 'wk-sn-empty';
    let statusIcon = '—';
    if (isClean) { statusCls = 'wk-sn-clean'; statusIcon = '✓'; }
    else if (snacked) { statusCls = 'wk-sn-fail'; statusIcon = '✕'; }

    const snackList = snacked ? `<div class="wk-sn-items">${snackItems.map(s => `<span class="wk-sn-item">${escapeHTML(s.description || 'Snack')}</span>`).join('')}</div>` : '';
    return `<div class="wk-sn-day ${statusCls}">
      <span class="wk-sn-label">${DAY_LABELS[dayIdx]}</span>
      <span class="wk-sn-icon">${statusIcon}</span>
      ${snackList}
    </div>`;
  }).join('');

  appendCard(container, 'wk-sn-card', `
    <div class="wk-card-head">
      <div class="wk-card-icon wk-icon-sn">${icon('apple', 20)}</div>
      <div class="wk-card-info">
        <div class="wk-card-title">No Snacking</div>
        <div class="wk-card-stat"><strong>${cleanDays}</strong> / ${snTarget} clean weekdays</div>
      </div>
    </div>
    <div class="wk-sn-grid">${snDays}</div>
  `);

  /* ═══════════════════════════════
     4. ALCOHOL CARD – daily drinks
     ═══════════════════════════════ */
  const drinkChips = {};
  for (const d of drinks) { const t = d.drinkType || 'Other'; drinkChips[t] = (drinkChips[t] || 0) + (d.quantity || 1); }
  const chipsHTML = Object.entries(drinkChips).map(([t, q]) =>
    `<span class="wk-al-chip">${DRINK_ICONS[t] || '🍹'} ${escapeHTML(t)} ×${q}</span>`
  ).join('');

  const alDays = pastDays.map(d => {
    const dayIdx = days.indexOf(d);
    const dd = onDay(drinks, d);
    if (dd.length === 0) {
      return `<div class="wk-al-day wk-al-free"><span class="wk-al-label">${DAY_LABELS[dayIdx]}</span><span class="wk-al-icon">✓</span></div>`;
    }
    const drinkIcons = dd.map(dr => DRINK_ICONS[dr.drinkType] || '🍹').join('');
    const units = dd.reduce((s, dr) => s + (dr.units || 0), 0);
    return `<div class="wk-al-day wk-al-drank"><span class="wk-al-label">${DAY_LABELS[dayIdx]}</span><span class="wk-al-icons">${drinkIcons}</span><span class="wk-al-units">${units.toFixed(1)}u</span></div>`;
  }).join('');

  appendCard(container, 'wk-al-card', `
    <div class="wk-card-head">
      <div class="wk-card-icon wk-icon-al">${icon('beer', 20)}</div>
      <div class="wk-card-info">
        <div class="wk-card-title">Alcohol</div>
        <div class="wk-card-stat"><strong>${totalUnits.toFixed(1)}</strong> / ${alTarget} units · ${alcKcal} kcal</div>
      </div>
    </div>
    ${chipsHTML ? `<div class="wk-al-chips">${chipsHTML}</div>` : ''}
    <div class="wk-al-grid">${alDays}</div>
  `);

  /* ═══════════════════════════════
     5. WEIGHT CARD – dot chart
     ═══════════════════════════════ */
  const prevWs = new Date(ws); prevWs.setDate(prevWs.getDate() - 7);
  const prevWeights = await store.weightsInRange(prevWs, new Date(ws.getTime() - 1));
  const prevAvg = prevWeights.length > 0 ? prevWeights.reduce((s, w) => s + w.value, 0) / prevWeights.length : null;
  const currAvg = weights.length > 0 ? weights.reduce((s, w) => s + w.value, 0) / weights.length : null;
  const trend = (prevAvg != null && currAvg != null) ? currAvg - prevAvg : null;
  const latestWt = weights.length > 0 ? weights[weights.length - 1].value : null;

  // Build SVG sparkline
  let sparkSVG = '';
  if (weights.length > 0) {
    const allW = weights.map(w => w.value);
    const minW = Math.min(...allW, wtTarget) - 0.5;
    const maxW = Math.max(...allW, wtTarget) + 0.5;
    const range = maxW - minW || 1;
    const svgW = 280, svgH = 60, pad = 8;
    const plotW = svgW - pad * 2, plotH = svgH - pad * 2;

    const pts = weights.map((w, idx) => {
      const x = pad + (weights.length === 1 ? plotW / 2 : (idx / (weights.length - 1)) * plotW);
      const y = pad + plotH - ((w.value - minW) / range) * plotH;
      return { x, y, v: w.value };
    });

    const targetY = pad + plotH - ((wtTarget - minW) / range) * plotH;
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--accent-blue)"/><text x="${p.x}" y="${p.y - 8}" text-anchor="middle" class="wk-wt-dot-label">${p.v.toFixed(1)}</text>`).join('');

    sparkSVG = `<svg class="wk-wt-spark" viewBox="0 0 ${svgW} ${svgH}">
      <line x1="${pad}" y1="${targetY}" x2="${svgW - pad}" y2="${targetY}" stroke="var(--accent-green)" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>
      <path d="${pathD}" fill="none" stroke="var(--accent-blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
  }

  const trendHTML = trend != null
    ? `<span class="wk-wt-trend ${trend <= 0 ? 'wk-wt-down' : 'wk-wt-up'}">${trend <= 0 ? '↓' : '↑'} ${Math.abs(trend).toFixed(1)} kg</span>`
    : '';

  appendCard(container, 'wk-wt-card', `
    <div class="wk-card-head">
      <div class="wk-card-icon wk-icon-wt">${icon('scale', 20)}</div>
      <div class="wk-card-info">
        <div class="wk-card-title">Weight ${trendHTML}</div>
        <div class="wk-card-stat">${latestWt != null ? latestWt.toFixed(1) + ' kg' : 'No data'} → ${wtTarget} kg goal</div>
      </div>
    </div>
    ${sparkSVG || '<p class="text-tertiary" style="padding:12px 0;text-align:center">No weight entries this week</p>'}
  `);
}

function appendCard(parent, cls, html) {
  const card = document.createElement('div');
  card.className = `glass-card ${cls}`;
  card.innerHTML = html;
  parent.appendChild(card);
}
