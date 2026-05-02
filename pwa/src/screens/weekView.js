import * as store from '../store.js';
import { startOfWeek, endOfWeek, daysInWeek, weekdayName, shortDate, weekNumber, startOfDay } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';
import { icon } from '../utils/icons.js';

let currentDate = new Date();
let container = null;

const WORKOUT_ICONS = { Run: '🏃', Gym: '🏋️', Walk: '🚶', Cycle: '🚴', Swim: '🏊', Yoga: '🧘', HIIT: '🔥' };
const DRINK_ICONS = { Beer: '🍺', Wine: '🍷', Spirit: '🥃', Cocktail: '🍸', Cider: '🍺' };
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SNACK_EMOJIS = { Cookie: '🍪', Chocolate: '🍫', Nuts: '🥜', Crisps: '🥨', Candy: '🍬' };
function snackEmoji(desc) {
  for (const [key, emoji] of Object.entries(SNACK_EMOJIS)) {
    if (desc && desc.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🍿';
}

function progressRing(current, target, color, size = 80) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const done = current >= target;
  const ringColor = done ? 'var(--accent-green)' : color;
  const label = done ? '✓' : `${current}/${target}`;
  const sub = done ? 'complete' : `${target - current} to go`;
  return `<div class="wk-progress-ring" style="--ring-size:${size}px">
    <svg width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-secondary)" stroke-width="7"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="7"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
        transform="rotate(-90 ${size/2} ${size/2})"/>
    </svg>
    <span class="wk-ring-label">${label}<span class="wk-ring-sub">${sub}</span></span>
  </div>`;
}

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

  const calTarget = calGoal?.dailyTarget ?? calGoal?.target ?? 2300;
  const exWorkoutsTarget = exGoal?.workoutsPerWeek ?? 3;
  const exWalksTarget = exGoal?.walksPerWeek ?? 2;
  const exTotalTarget = exWorkoutsTarget + exWalksTarget;
  const snTarget = snGoal?.target ?? 5;
  const alTarget = alGoal?.target ?? 17;
  const wtTarget = wtGoal?.target ?? 93.0;

  // Helper: match items to a day
  const onDay = (arr, d) => arr.filter(i => new Date(i.date).toDateString() === d.toDateString());

  /* ═══════════════════════════════
     1. CALORIES CARD – matrix: rows = category, cols = weekdays
     ═══════════════════════════════ */
  const today = new Date();
  const CAT_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'];

  // Build matrix data: [category][dayIndex] = kcal
  const matrix = CAT_LABELS.map(() => days.map(() => 0));
  const dayTotals = days.map(() => 0);

  days.forEach((d, di) => {
    const dayMeals = onDay(meals, d);
    const dayDrinks = onDay(drinks, d);
    for (const m of dayMeals) {
      if (m.mealType === 'Breakfast') matrix[0][di] += (m.kcal || 0);
      else if (m.mealType === 'Lunch') matrix[1][di] += (m.kcal || 0);
      else if (m.mealType === 'Dinner') matrix[2][di] += (m.kcal || 0);
      else if (m.mealType === 'Snack') matrix[3][di] += (m.kcal || 0);
      else matrix[2][di] += (m.kcal || 0); // Other → Dinner
    }
    for (const dr of dayDrinks) {
      matrix[4][di] += (dr.kcal || 0);
    }
    dayTotals[di] = matrix.reduce((s, row) => s + row[di], 0);
  });

  const CAT_ICONS = ['🌅', '☀️', '🌙', '🍫', '🍺'];

  // Header row — clickable days
  let matrixHTML = `<div class="wk-cal-matrix">
    <div class="wk-cal-row wk-cal-header">
      <div class="wk-cal-cell wk-cal-label"></div>
      ${days.map((d, i) => {
        const isFuture = startOfDay(d) > startOfDay(today);
        return `<div class="wk-cal-cell wk-cal-day-head ${isFuture ? 'muted' : 'wk-cal-day-tap'}" data-day-idx="${i}">${DAY_LABELS[i]}</div>`;
      }).join('')}
    </div>`;

  // Category rows — clickable to expand chart
  CAT_LABELS.forEach((cat, ci) => {
    const rowValues = days.map((d, di) => startOfDay(d) > startOfDay(today) ? null : matrix[ci][di]);
    matrixHTML += `<div class="wk-cal-row wk-cal-row-tap" data-row-idx="${ci}" data-row-values='${JSON.stringify(rowValues)}'>
      <div class="wk-cal-cell wk-cal-label"><span class="wk-cal-cat-icon">${CAT_ICONS[ci]}</span>${cat}</div>
      ${days.map((d, di) => {
        const isFuture = startOfDay(d) > startOfDay(today);
        const val = matrix[ci][di];
        return `<div class="wk-cal-cell ${isFuture ? 'muted' : val > 0 ? '' : 'wk-cal-zero'}">${isFuture ? '—' : val || '–'}</div>`;
      }).join('')}
    </div>
    <div class="wk-cal-chart-slot" id="wk-chart-row-${ci}"></div>`;
  });

  // Total row — clickable to expand chart
  const totalValues = days.map((d, di) => startOfDay(d) > startOfDay(today) ? null : dayTotals[di]);
  matrixHTML += `<div class="wk-cal-row wk-cal-total-row wk-cal-row-tap" data-row-idx="total" data-row-values='${JSON.stringify(totalValues)}'>
    <div class="wk-cal-cell wk-cal-label"><strong>Total</strong></div>
    ${days.map((d, di) => {
      const isFuture = startOfDay(d) > startOfDay(today);
      const total = dayTotals[di];
      const cls = isFuture ? 'muted' : total === 0 ? 'wk-cal-zero' : total <= calTarget ? 'green' : 'danger';
      return `<div class="wk-cal-cell wk-cal-total ${cls}">${isFuture ? '—' : total || '–'}</div>`;
    }).join('')}
  </div>
  <div class="wk-cal-chart-slot" id="wk-chart-row-total"></div>`;
  matrixHTML += `</div>`;

  appendCard(container, 'wk-cal-card', `
    <div class="wk-card-head">
      <div class="wk-card-icon wk-icon-cal">${icon('flame', 20)}</div>
      <div class="wk-card-info">
        <div class="wk-card-title">Calories</div>
        <div class="wk-card-stat">Avg <strong>${avgCal}</strong> / ${calTarget} kcal</div>
      </div>
    </div>
    ${matrixHTML}
  `);

  // Day header tap → navigate to that day
  container.querySelectorAll('.wk-cal-day-tap').forEach(cell => {
    cell.style.cursor = 'pointer';
    cell.onclick = () => {
      const di = Number(cell.dataset.dayIdx);
      document.dispatchEvent(new CustomEvent('navigateToDay', { detail: { date: days[di] } }));
    };
  });

  // Row tap → toggle inline line chart
  container.querySelectorAll('.wk-cal-row-tap').forEach(row => {
    row.style.cursor = 'pointer';
    row.onclick = () => {
      const idx = row.dataset.rowIdx;
      const slot = document.getElementById(`wk-chart-row-${idx}`);
      if (!slot) return;
      if (slot.classList.contains('wk-chart-open')) {
        slot.classList.remove('wk-chart-open');
        slot.innerHTML = '';
        return;
      }
      container.querySelectorAll('.wk-cal-chart-slot.wk-chart-open').forEach(s => { s.classList.remove('wk-chart-open'); s.innerHTML = ''; });

      const values = JSON.parse(row.dataset.rowValues);
      const nonNull = values.filter(v => v !== null && v > 0);
      const avg = nonNull.length > 0 ? Math.round(nonNull.reduce((s, v) => s + v, 0) / nonNull.length) : 0;
      const maxVal = Math.max(...nonNull, avg, 1);

      // SVG line chart — x positions align with the 7 grid columns
      const svgW = 300, svgH = 70, padT = 14, padB = 4;
      const leftOff = (100 / svgW) * svgW; // label column offset ≈ first third
      const plotLeft = 100, plotRight = svgW - 8;
      const plotW = plotRight - plotLeft;
      const plotH = svgH - padT - padB;

      const points = values.map((v, i) => {
        const x = plotLeft + (plotW / 6) * i; // 7 points across 6 gaps
        if (v === null || v === 0) return null;
        const y = padT + plotH - (v / maxVal) * plotH;
        return { x, y, v };
      });

      // Average line y
      const avgY = padT + plotH - (avg / maxVal) * plotH;

      // Build SVG path from valid points
      const validPts = points.filter(p => p !== null);
      const pathD = validPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const dots = validPts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--accent-purple)"/><text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1) - 8}" text-anchor="middle" class="wk-chart-dot-label">${p.v}</text>`).join('');

      slot.innerHTML = `<svg class="wk-chart-svg" viewBox="0 0 ${svgW} ${svgH}">
        <line x1="${plotLeft}" y1="${avgY.toFixed(1)}" x2="${plotRight}" y2="${avgY.toFixed(1)}" stroke="var(--accent-amber)" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.8"/>
        <text x="${plotRight}" y="${avgY.toFixed(1) - 5}" text-anchor="end" class="wk-chart-avg-text">avg ${avg}</text>
        ${pathD ? `<path d="${pathD}" fill="none" stroke="var(--accent-purple)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        ${dots}
      </svg>`;
      slot.classList.add('wk-chart-open');
    };
  });

  /* ═══════════════════════════════
     2. EXERCISE CARD – horizontal weekdays with icon, name, kcal
     ═══════════════════════════════ */
  const CAL_PER_MIN = { Run: 10, Gym: 8, Walk: 4, Cycle: 9, Swim: 11, Yoga: 4, HIIT: 12 };

  const exDays = days.map((d, di) => {
    const isFuture = startOfDay(d) > startOfDay(today);
    if (isFuture) {
      return `<div class="wk-ex-day-col"><span class="wk-ex-day-label">${DAY_LABELS[di]}</span><span class="wk-ex-day-icon muted">—</span></div>`;
    }
    const dw = onDay(workouts, d);
    if (dw.length === 0) {
      return `<div class="wk-ex-day-col wk-ex-rest"><span class="wk-ex-day-label">${DAY_LABELS[di]}</span><span class="wk-ex-day-icon">🛋️</span><span class="wk-ex-day-name">Rest</span></div>`;
    }
    // Show first workout (stack if multiple)
    const items = dw.map(w => {
      const wIcon = WORKOUT_ICONS[w.type] || '🏃';
      const burned = (w.duration || 0) * (CAL_PER_MIN[w.type] || 7);
      return `<span class="wk-ex-day-icon">${wIcon}</span><span class="wk-ex-day-name">${w.type}</span><span class="wk-ex-day-kcal">~${burned}</span>`;
    }).join('');
    return `<div class="wk-ex-day-col wk-ex-active"><span class="wk-ex-day-label">${DAY_LABELS[di]}</span>${items}</div>`;
  }).join('');

  // Count workouts (non-Walk) and walks separately
  const walkTypes = ['Walk'];
  const workoutCount = workouts.filter(w => !walkTypes.includes(w.type)).length;
  const walkCount = workouts.filter(w => walkTypes.includes(w.type)).length;
  const workoutsRemaining = Math.max(0, exWorkoutsTarget - workoutCount);
  const walksRemaining = Math.max(0, exWalksTarget - walkCount);

  // Days remaining in the week (including today)
  const daysRemaining = days.filter(d => startOfDay(d) >= startOfDay(today)).length;

  appendCard(container, 'wk-ex-card', `
    <div class="wk-card-head-ring">
      ${progressRing(activeDays, exTotalTarget, 'var(--accent-green)')}
      <div class="wk-card-info">
        <div class="wk-card-title"><span class="wk-card-icon wk-icon-ex">${icon('dumbbell', 14)}</span> Exercise</div>
        <div class="wk-card-remaining">${workoutsRemaining} workout${workoutsRemaining !== 1 ? 's' : ''} · ${walksRemaining} walk${walksRemaining !== 1 ? 's' : ''} remaining</div>
        <div class="wk-card-remaining">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left this week</div>
      </div>
    </div>
    <hr class="wk-divider"/>
    <div class="wk-ex-days-row">${exDays}</div>
  `);

  /* ═══════════════════════════════
     3. NO SNACKING CARD – all 7 days
     ═══════════════════════════════ */
  const snDays = days.map(d => {
    const dayIdx = days.indexOf(d);
    const dayMeals = onDay(meals, d);
    const snackItems = dayMeals.filter(m => m.mealType === 'Snack');
    const snacked = snackItems.length > 0;
    const isPast = startOfDay(d) <= startOfDay(new Date());

    let statusCls = 'wk-sn-empty';
    let statusContent = '—';
    if (snacked) {
      statusCls = 'wk-sn-fail';
      statusContent = snackItems.map(s => snackEmoji(s.description)).join('<br>');
    } else if (isPast) { statusCls = 'wk-sn-clean'; statusContent = '✓'; }

    return `<div class="wk-sn-day ${statusCls}">
      <span class="wk-sn-label">${DAY_LABELS[dayIdx]}</span>
      <span class="wk-sn-icon">${statusContent}</span>
    </div>`;
  }).join('');

  appendCard(container, 'wk-sn-card', `
    <div class="wk-card-head-ring">
      ${progressRing(cleanDays, snTarget, 'var(--danger)')}
      <div class="wk-card-info">
        <div class="wk-card-title"><span class="wk-card-icon wk-icon-sn">${icon('candy', 14)}</span> No Snacking</div>
        <div class="wk-card-remaining">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining</div>
      </div>
    </div>
    <hr class="wk-divider"/>
    <div class="wk-sn-grid">${snDays}</div>
  `);

  /* ═══════════════════════════════
     4. ALCOHOL CARD – daily drinks
     ═══════════════════════════════ */
  const alDays = days.map(d => {
    const dayIdx = days.indexOf(d);
    const isFuture = startOfDay(d) > startOfDay(today);
    if (isFuture) {
      return `<div class="wk-al-day"><span class="wk-al-label">${DAY_LABELS[dayIdx]}</span><span class="wk-al-icon muted">—</span></div>`;
    }
    const dd = onDay(drinks, d);
    if (dd.length === 0) {
      return `<div class="wk-al-day wk-al-free"><span class="wk-al-label">${DAY_LABELS[dayIdx]}</span><span class="wk-al-icon">✓</span></div>`;
    }
    const drinkEmojis = dd.map(dr => DRINK_ICONS[dr.drinkType] || '🍹').join('<br>');
    const units = dd.reduce((s, dr) => s + (dr.units || 0), 0);
    return `<div class="wk-al-day wk-al-drank"><span class="wk-al-label">${DAY_LABELS[dayIdx]}</span><span class="wk-al-icons">${drinkEmojis}</span><span class="wk-al-units">${units.toFixed(1)}u</span></div>`;
  }).join('');

  // Alcohol progress: units remaining under budget
  const alUnitsRemaining = Math.max(0, alTarget - totalUnits);
  const alUsed = Math.min(totalUnits, alTarget);
  const alRingHtml = (() => {
    const size = 80, r = (size - 8) / 2, c = 2 * Math.PI * r;
    const pct = alTarget > 0 ? Math.min(100, Math.round((alUsed / alTarget) * 100)) : 0;
    const offset = c - (pct / 100) * c;
    const over = totalUnits > alTarget;
    const ringColor = over ? 'var(--danger)' : 'var(--accent-amber)';
    const label = over ? '⚠️' : `${alUnitsRemaining.toFixed(0)}`;
    const sub = over ? 'over' : 'units left';
    return `<div class="wk-progress-ring" style="--ring-size:${size}px">
      <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-secondary)" stroke-width="7"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="7"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 ${size/2} ${size/2})"/>
      </svg>
      <span class="wk-ring-label">${label}<span class="wk-ring-sub">${sub}</span></span>
    </div>`;
  })();

  appendCard(container, 'wk-al-card', `
    <div class="wk-card-head-ring">
      ${alRingHtml}
      <div class="wk-card-info">
        <div class="wk-card-title"><span class="wk-card-icon wk-icon-al">${icon('beer', 14)}</span> Alcohol</div>
        <div class="wk-card-remaining">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining</div>
      </div>
    </div>
    <hr class="wk-divider"/>
    <div class="wk-al-grid">${alDays}</div>
  `);

  /* ═══════════════════════════════
     5. WEIGHT CARD – bar chart
     ═══════════════════════════════ */
  const latestWt = weights.length > 0 ? weights[weights.length - 1].value : null;

  // Collect weight values for each day
  const wtVals = days.map((d, di) => {
    const isFuture = startOfDay(d) > startOfDay(today);
    if (isFuture) return null;
    const dw = onDay(weights, d);
    return dw.length > 0 ? dw[dw.length - 1].value : null;
  });

  // Build bar chart SVG
  const wtBarChart = (() => {
    const w = 300, h = 120, padL = 35, padR = 10, padT = 10, padB = 24;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const vals = wtVals.filter(v => v != null);
    if (vals.length === 0) return '<div class="wk-wt-empty">No weight data this week</div>';

    const minV = Math.min(...vals, wtTarget) - 1;
    const maxV = Math.max(...vals, wtTarget) + 1;
    const range = maxV - minV || 1;
    const barW = plotW / 7 * 0.6;
    const gap = plotW / 7;

    let bars = '';
    wtVals.forEach((v, i) => {
      const x = padL + gap * i + (gap - barW) / 2;
      if (v != null) {
        const barH = ((v - minV) / range) * plotH;
        const y = padT + plotH - barH;
        const color = v <= wtTarget ? 'var(--accent-green)' : 'var(--danger)';
        bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="${color}" opacity="0.8"/>`;
        bars += `<text x="${x + barW/2}" y="${y - 4}" text-anchor="middle" font-size="9" fill="var(--text-primary)" font-weight="600">${v.toFixed(1)}</text>`;
      }
      bars += `<text x="${x + barW/2}" y="${h - 4}" text-anchor="middle" font-size="10" fill="var(--text-secondary)">${DAY_LABELS[i]}</text>`;
    });

    // Goal line
    const goalY = padT + plotH - ((wtTarget - minV) / range) * plotH;
    bars += `<line x1="${padL}" y1="${goalY}" x2="${w - padR}" y2="${goalY}" stroke="var(--accent-blue)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>`;
    bars += `<text x="${padL - 4}" y="${goalY + 3}" text-anchor="end" font-size="9" fill="var(--accent-blue)">${wtTarget}</text>`;

    return `<svg class="wk-wt-barchart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${bars}</svg>`;
  })();

  appendCard(container, 'wk-wt-card', `
    <div class="wk-card-head">
      <div class="wk-card-icon wk-icon-wt">${icon('scale', 20)}</div>
      <div class="wk-card-info">
        <div class="wk-card-title">Weight</div>
        <div class="wk-card-stat">${latestWt != null ? latestWt.toFixed(1) + ' kg' : 'No data'} → ${wtTarget} kg goal</div>
      </div>
    </div>
    <div class="wk-wt-chart-wrap">${wtBarChart}</div>
  `);
}

function appendCard(parent, cls, html) {
  const card = document.createElement('div');
  card.className = `glass-card ${cls}`;
  card.innerHTML = html;
  parent.appendChild(card);
}
