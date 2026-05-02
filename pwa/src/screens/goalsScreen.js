import * as store from '../store.js';
import { weeksBetween, startOfWeek, endOfWeek, shortDate, weekNumber } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';
import { icon } from '../utils/icons.js';

const GOAL_ICONS = {
  calories: { svg: () => icon('flame', 18), tint: 'var(--tint-purple)' },
  exercise: { svg: () => icon('dumbbell', 18), tint: 'var(--tint-green)' },
  snacking: { svg: () => icon('candy', 18), tint: 'var(--tint-amber)' },
  alcohol: { svg: () => icon('beer', 18), tint: 'var(--tint-amber)' },
  weight: { svg: () => icon('scale', 18), tint: 'var(--tint-blue)' },
};

let container = null;

export async function render(el) {
  container = el;
  container.innerHTML = '';

  const goals = await store.getGoals();
  if (goals.length === 0) {
    container.innerHTML = '<p class="text-tertiary" style="padding:20px;text-align:center">No goals set yet.</p>';
    return;
  }

  for (const goal of goals) {
    if (goal.type === 'weight') {
      await renderWeightGraph(goal);
      continue;
    }

    const card = document.createElement('div');
    card.className = 'goal-card';

    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);
    const weeks = weeksBetween(startDate, endDate);
    const currentWeek = startOfWeek(new Date());

    let successCount = 0;
    const bars = [];

    for (const wk of weeks) {
      const isCurrent = wk.getTime() === currentWeek.getTime();
      const isPast = wk < currentWeek;

      if (isPast || isCurrent) {
        const met = await isGoalMet(goal, wk);
        if (met) successCount++;
        bars.push(isCurrent ? 'current' : (met ? 'success' : 'fail'));
      } else {
        bars.push('');
      }
    }

    const weeksRemaining = weeks.filter(w => w > currentWeek).length;
    const currentVal = await getCurrentValue(goal, currentWeek);

    // Build progress display based on type
    let progressHTML = '';
    if (goal.type === 'calories') {
      const dpw = goal.daysPerWeek || 5;
      const dt = goal.dailyTarget || goal.target || 2300;
      const val = typeof currentVal === 'number' ? currentVal : 0;
      const pct = Math.min(100, Math.round((val / dpw) * 100));
      const color = val >= dpw ? 'var(--accent-green)' : 'var(--accent-blue)';
      progressHTML = `
        <div class="goal-progress-row">
          <span class="goal-progress-label">${val} / ${dpw} days on target</span>
          <div class="goal-mini-bar"><div class="goal-mini-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>`;
    } else if (goal.type === 'exercise') {
      const wpw = goal.workoutsPerWeek || 4;
      const wlpw = goal.walksPerWeek || 3;
      const wkVal = currentVal?.workouts ?? 0;
      const wlVal = currentVal?.walks ?? 0;
      const wkPct = Math.min(100, Math.round((wkVal / wpw) * 100));
      const wlPct = Math.min(100, Math.round((wlVal / wlpw) * 100));
      const wkColor = wkVal >= wpw ? 'var(--accent-green)' : 'var(--accent-blue)';
      const wlColor = wlVal >= wlpw ? 'var(--accent-green)' : 'var(--accent-blue)';
      progressHTML = `
        <div class="goal-progress-row">
          <span class="goal-progress-label">${wkVal}/${wpw} workouts</span>
          <div class="goal-mini-bar"><div class="goal-mini-bar-fill" style="width:${wkPct}%;background:${wkColor}"></div></div>
        </div>
        <div class="goal-progress-row">
          <span class="goal-progress-label">${wlVal}/${wlpw} walks</span>
          <div class="goal-mini-bar"><div class="goal-mini-bar-fill" style="width:${wlPct}%;background:${wlColor}"></div></div>
        </div>`;
    } else {
      const val = typeof currentVal === 'number' ? currentVal : 0;
      const target = goal.target || 0;
      progressHTML = `
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px">
          <span style="font-size:24px;font-weight:800">${formatValue(val, goal)}</span>
          <span style="font-size:14px;color:var(--text-secondary)">/ ${formatValue(target, goal)} ${escapeHTML(goal.unit || '')}</span>
        </div>`;
    }

    card.innerHTML = `
      <div class="goal-header">
        <div class="goal-icon" style="background:${GOAL_ICONS[goal.type]?.tint || 'var(--tint-purple)'}">${GOAL_ICONS[goal.type]?.svg() || escapeHTML(goal.icon || '🎯')}</div>
        <div class="goal-info">
          <div class="goal-title">${escapeHTML(goal.title)}</div>
          <div class="goal-subtitle">${escapeHTML(goalSubtitle(goal))}</div>
        </div>
        <button class="goal-edit-btn" data-goal-id="${goal.id}">Edit</button>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">
        ${shortDate(startDate)} – ${shortDate(endDate)}
      </div>
      ${progressHTML}
      <div class="goal-timeline">${bars.map(b => `<div class="tl-bar ${b}"></div>`).join('')}</div>
      <div class="goal-meta">
        <div class="meta-item">
          <div class="meta-value">${successCount}</div>
          <div class="meta-label">Weeks hit</div>
        </div>
        <div class="meta-item">
          <div class="meta-value">${weeksRemaining}</div>
          <div class="meta-label">Weeks left</div>
        </div>
      </div>
    `;

    container.appendChild(card);
    card.querySelector('.goal-edit-btn').onclick = () => openGoalEdit(goal);
  }
}

async function renderWeightGraph(goal) {
  const card = document.createElement('div');
  card.className = 'goal-card';

  const allWeights = await store.getWeights();
  const sorted = allWeights.sort((a, b) => a.date - b.date);

  const current = sorted.length > 0 ? sorted[sorted.length - 1].value : null;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const oldEntry = sorted.find(w => w.date >= thirtyDaysAgo) || sorted[0];
  const trend = current && oldEntry ? current - oldEntry.value : null;

  let graphHTML = '<p class="text-tertiary" style="text-align:center;padding:20px 0">No weight data yet</p>';

  if (sorted.length >= 2) {
    const W = 320, H = 200, PAD_L = 36, PAD_R = 12, PAD_T = 20, PAD_B = 28;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const vals = sorted.map(w => w.value);
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    if (goal.target) { minV = Math.min(minV, goal.target); maxV = Math.max(maxV, goal.target); }
    const range = maxV - minV || 1;
    minV -= range * 0.1;
    maxV += range * 0.1;
    const vRange = maxV - minV;

    const minDate = sorted[0].date;
    const maxDate = sorted[sorted.length - 1].date;
    const dRange = maxDate - minDate || 1;

    const x = d => PAD_L + ((d - minDate) / dRange) * plotW;
    const y = v => PAD_T + plotH - ((v - minV) / vRange) * plotH;

    const points = sorted.map(w => `${x(w.date).toFixed(1)},${y(w.value).toFixed(1)}`);
    const polyline = points.join(' ');

    const dots = sorted.map(w =>
      `<circle cx="${x(w.date).toFixed(1)}" cy="${y(w.value).toFixed(1)}" r="3" class="wt-graph-dot"/>`
    ).join('');

    let targetLine = '';
    if (goal.target) {
      const ty = y(goal.target);
      targetLine = `<line x1="${PAD_L}" y1="${ty.toFixed(1)}" x2="${W - PAD_R}" y2="${ty.toFixed(1)}" class="wt-graph-target"/>
        <text x="${W - PAD_R - 2}" y="${(ty - 4).toFixed(1)}" class="wt-graph-value" text-anchor="end">${goal.target.toFixed(1)}</text>`;
    }

    // Y-axis labels (5 ticks)
    let yLabels = '';
    for (let i = 0; i <= 4; i++) {
      const v = minV + (vRange * i / 4);
      const yy = y(v);
      yLabels += `<text x="${PAD_L - 4}" y="${(yy + 3).toFixed(1)}" class="wt-graph-label" text-anchor="end">${v.toFixed(0)}</text>`;
    }

    // X-axis labels (first, middle, last)
    const xIdxs = [0, Math.floor(sorted.length / 2), sorted.length - 1];
    let xLabels = '';
    for (const idx of xIdxs) {
      const w = sorted[idx];
      const d = new Date(w.date);
      xLabels += `<text x="${x(w.date).toFixed(1)}" y="${(H - 4).toFixed(1)}" class="wt-graph-label" text-anchor="middle">${shortDate(d)}</text>`;
    }

    graphHTML = `
      <div class="wt-graph">
        <svg class="wt-graph-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${yLabels}
          ${xLabels}
          ${targetLine}
          <polyline points="${polyline}" class="wt-graph-line"/>
          ${dots}
        </svg>
      </div>`;
  } else if (sorted.length === 1) {
    graphHTML = `<p style="text-align:center;padding:20px 0;font-size:36px;font-weight:800">${sorted[0].value.toFixed(1)} <span style="font-size:16px;color:var(--text-secondary)">kg</span></p>`;
  }

  let statsHTML = '';
  if (current != null) {
    const trendStr = trend != null ? `<span style="font-size:13px;font-weight:600;color:${trend <= 0 ? 'var(--accent-green)' : 'var(--danger)'}">${trend > 0 ? '+' : ''}${trend.toFixed(1)} kg (30d)</span>` : '';
    const targetStr = goal.target ? `<span style="font-size:13px;color:var(--text-secondary)">Target: ${goal.target.toFixed(1)} kg</span>` : '';
    statsHTML = `
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
        <span style="font-size:24px;font-weight:800">${current.toFixed(1)}</span>
        <span style="font-size:14px;color:var(--text-secondary)">kg</span>
        ${trendStr}
        ${targetStr}
      </div>`;
  }

  card.innerHTML = `
    <div class="goal-header">
      <div class="goal-icon" style="background:${GOAL_ICONS.weight.tint}">${GOAL_ICONS.weight.svg()}</div>
      <div class="goal-info">
        <div class="goal-title">${escapeHTML(goal.title)}</div>
        <div class="goal-subtitle">Weight history</div>
      </div>
      <button class="goal-edit-btn" data-goal-id="${goal.id}">Edit</button>
    </div>
    ${statsHTML}
    ${graphHTML}
  `;

  container.appendChild(card);
  card.querySelector('.goal-edit-btn').onclick = () => openGoalEdit(goal);
}

function goalSubtitle(goal) {
  if (goal.type === 'calories') {
    const dpw = goal.daysPerWeek || 5;
    const dt = goal.dailyTarget || goal.target || 2300;
    return `${dpw} of 7 days ≤ ${Number(dt).toLocaleString()} kcal`;
  }
  if (goal.type === 'exercise') {
    const wpw = goal.workoutsPerWeek || 4;
    const wlpw = goal.walksPerWeek || 3;
    const dur = goal.walkMinDuration || 30;
    return `${wpw} workouts + ${wlpw} walks (≥${dur}min)`;
  }
  if (goal.comparison === 'lte') return `≤ ${goal.target} ${goal.unit}`;
  if (goal.comparison === 'gte') return `≥ ${goal.target} ${goal.unit}`;
  return `${goal.target} ${goal.unit}`;
}

function formatValue(val, goal) {
  if (goal.type === 'weight') return val != null ? Number(val).toFixed(1) : '—';
  return val != null ? Math.round(val) : '—';
}

async function getCurrentValue(goal, weekStart) {
  switch (goal.type) {
    case 'calories': {
      const dt = goal.dailyTarget || goal.target || 2300;
      return store.daysUnderCalorieTarget(weekStart, dt);
    }
    case 'exercise': {
      const wk = await store.workoutDaysForWeek(weekStart);
      const walks = await store.walkDaysForWeek(weekStart, goal.walkMinDuration || 30);
      return { workouts: wk, walks };
    }
    case 'snacking': return store.cleanWeekdaysForWeek(weekStart);
    case 'alcohol': return store.totalUnitsForWeek(weekStart);
    case 'weight': {
      const ws = await store.weightsInRange(weekStart, endOfWeek(weekStart));
      return ws.length > 0 ? ws[ws.length - 1].value : null;
    }
    default: return null;
  }
}

async function isGoalMet(goal, weekStart) {
  switch (goal.type) {
    case 'calories': {
      const dt = goal.dailyTarget || goal.target || 2300;
      const dpw = goal.daysPerWeek || 5;
      const count = await store.daysUnderCalorieTarget(weekStart, dt);
      return count >= dpw;
    }
    case 'exercise': {
      const wk = await store.workoutDaysForWeek(weekStart);
      const walks = await store.walkDaysForWeek(weekStart, goal.walkMinDuration || 30);
      return wk >= (goal.workoutsPerWeek || 4) && walks >= (goal.walksPerWeek || 3);
    }
    case 'snacking': {
      const val = await store.cleanWeekdaysForWeek(weekStart);
      return val >= (goal.target || 5);
    }
    case 'alcohol': {
      const val = await store.totalUnitsForWeek(weekStart);
      return val <= (goal.target || 17);
    }
    default: return false;
  }
}

function openGoalEdit(goal) {
  const existing = document.querySelector('#goal-edit-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'goal-edit-overlay';
  overlay.className = 'overlay open';

  let fieldsHTML = '';
  if (goal.type === 'calories') {
    const dpw = goal.daysPerWeek || 5;
    const dt = goal.dailyTarget || goal.target || 2300;
    fieldsHTML = `
      <div class="input-group">
        <label>Days per week on target</label>
        <div class="stepper" style="width:100%;justify-content:center">
          <button id="ge-dpw-minus">−</button>
          <span class="stepper-value" id="ge-dpw">${dpw}</span>
          <button id="ge-dpw-plus">+</button>
        </div>
      </div>
      <div class="input-group">
        <label>Daily calorie target (kcal)</label>
        <div class="stepper" style="width:100%;justify-content:center">
          <button id="ge-dt-minus">−</button>
          <span class="stepper-value" id="ge-dt">${dt}</span>
          <button id="ge-dt-plus">+</button>
        </div>
      </div>`;
  } else if (goal.type === 'exercise') {
    const wpw = goal.workoutsPerWeek || 4;
    const wlpw = goal.walksPerWeek || 3;
    const wmd = goal.walkMinDuration || 30;
    fieldsHTML = `
      <div class="input-group">
        <label>Workouts per week</label>
        <div class="stepper" style="width:100%;justify-content:center">
          <button id="ge-wpw-minus">−</button>
          <span class="stepper-value" id="ge-wpw">${wpw}</span>
          <button id="ge-wpw-plus">+</button>
        </div>
      </div>
      <div class="input-group">
        <label>Walks per week</label>
        <div class="stepper" style="width:100%;justify-content:center">
          <button id="ge-wlpw-minus">−</button>
          <span class="stepper-value" id="ge-wlpw">${wlpw}</span>
          <button id="ge-wlpw-plus">+</button>
        </div>
      </div>
      <div class="input-group">
        <label>Min walk duration (min)</label>
        <div class="stepper" style="width:100%;justify-content:center">
          <button id="ge-wmd-minus">−</button>
          <span class="stepper-value" id="ge-wmd">${wmd}</span>
          <button id="ge-wmd-plus">+</button>
        </div>
      </div>`;
  } else if (goal.type === 'weight') {
    fieldsHTML = `
      <div class="input-group">
        <label>Target weight</label>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="stepper" style="flex:1">
            <button id="ge-minus">−</button>
            <span class="stepper-value" id="ge-target">${(goal.target || 0).toFixed(1)}</span>
            <button id="ge-plus">+</button>
          </div>
          <span style="font-size:13px;color:var(--text-secondary)">kg</span>
        </div>
      </div>`;
  } else {
    fieldsHTML = `
      <div class="input-group">
        <label>Target</label>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="stepper" style="flex:1">
            <button id="ge-minus">−</button>
            <span class="stepper-value" id="ge-target">${goal.target}</span>
            <button id="ge-plus">+</button>
          </div>
          <span style="font-size:13px;color:var(--text-secondary)">${escapeHTML(goal.unit || '')}</span>
        </div>
      </div>`;
  }

  overlay.innerHTML = `
    <div class="overlay-panel">
      <header class="overlay-header">
        <h2>Edit ${escapeHTML(goal.title)}</h2>
        <button class="icon-btn" id="close-goal-edit" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </header>
      <div class="overlay-body">
        ${fieldsHTML}
        <div class="input-group">
          <label>Start date</label>
          <input class="input-field" type="date" id="ge-start" value="${dateToInput(goal.startDate)}" />
        </div>
        <div class="input-group">
          <label>End date</label>
          <input class="input-field" type="date" id="ge-end" value="${dateToInput(goal.endDate)}" />
        </div>
        <div style="display:flex;gap:12px;margin-top:16px">
          <button class="btn btn-secondary" id="ge-cancel" style="flex:1">Cancel</button>
          <button class="btn btn-primary" id="ge-save" style="flex:1">Save</button>
        </div>
      </div>
    </div>
  `;

  document.querySelector('.app').appendChild(overlay);

  // State for edit values
  const state = {};

  if (goal.type === 'calories') {
    state.daysPerWeek = goal.daysPerWeek || 5;
    state.dailyTarget = goal.dailyTarget || goal.target || 2300;
    overlay.querySelector('#ge-dpw-minus').onclick = () => {
      state.daysPerWeek = Math.max(1, state.daysPerWeek - 1);
      overlay.querySelector('#ge-dpw').textContent = state.daysPerWeek;
    };
    overlay.querySelector('#ge-dpw-plus').onclick = () => {
      state.daysPerWeek = Math.min(7, state.daysPerWeek + 1);
      overlay.querySelector('#ge-dpw').textContent = state.daysPerWeek;
    };
    overlay.querySelector('#ge-dt-minus').onclick = () => {
      state.dailyTarget = Math.max(100, state.dailyTarget - 100);
      overlay.querySelector('#ge-dt').textContent = state.dailyTarget;
    };
    overlay.querySelector('#ge-dt-plus').onclick = () => {
      state.dailyTarget = state.dailyTarget + 100;
      overlay.querySelector('#ge-dt').textContent = state.dailyTarget;
    };
  } else if (goal.type === 'exercise') {
    state.workoutsPerWeek = goal.workoutsPerWeek || 4;
    state.walksPerWeek = goal.walksPerWeek || 3;
    state.walkMinDuration = goal.walkMinDuration || 30;
    overlay.querySelector('#ge-wpw-minus').onclick = () => {
      state.workoutsPerWeek = Math.max(0, state.workoutsPerWeek - 1);
      overlay.querySelector('#ge-wpw').textContent = state.workoutsPerWeek;
    };
    overlay.querySelector('#ge-wpw-plus').onclick = () => {
      state.workoutsPerWeek = Math.min(7, state.workoutsPerWeek + 1);
      overlay.querySelector('#ge-wpw').textContent = state.workoutsPerWeek;
    };
    overlay.querySelector('#ge-wlpw-minus').onclick = () => {
      state.walksPerWeek = Math.max(0, state.walksPerWeek - 1);
      overlay.querySelector('#ge-wlpw').textContent = state.walksPerWeek;
    };
    overlay.querySelector('#ge-wlpw-plus').onclick = () => {
      state.walksPerWeek = Math.min(7, state.walksPerWeek + 1);
      overlay.querySelector('#ge-wlpw').textContent = state.walksPerWeek;
    };
    overlay.querySelector('#ge-wmd-minus').onclick = () => {
      state.walkMinDuration = Math.max(5, state.walkMinDuration - 5);
      overlay.querySelector('#ge-wmd').textContent = state.walkMinDuration;
    };
    overlay.querySelector('#ge-wmd-plus').onclick = () => {
      state.walkMinDuration = Math.min(300, state.walkMinDuration + 5);
      overlay.querySelector('#ge-wmd').textContent = state.walkMinDuration;
    };
  } else {
    state.target = goal.target || 0;
    const step = goal.type === 'weight' ? 0.5 : 1;
    const minusBtn = overlay.querySelector('#ge-minus');
    const plusBtn = overlay.querySelector('#ge-plus');
    if (minusBtn) {
      minusBtn.onclick = () => {
        state.target = Math.max(0, state.target - step);
        overlay.querySelector('#ge-target').textContent = goal.type === 'weight' ? state.target.toFixed(1) : state.target;
      };
    }
    if (plusBtn) {
      plusBtn.onclick = () => {
        state.target += step;
        overlay.querySelector('#ge-target').textContent = goal.type === 'weight' ? state.target.toFixed(1) : state.target;
      };
    }
  }

  const close = () => overlay.remove();
  overlay.querySelector('#close-goal-edit').onclick = close;
  overlay.querySelector('#ge-cancel').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#ge-save').onclick = async () => {
    const changes = {
      startDate: new Date(overlay.querySelector('#ge-start').value).getTime(),
      endDate: new Date(overlay.querySelector('#ge-end').value).getTime()
    };

    if (goal.type === 'calories') {
      changes.daysPerWeek = state.daysPerWeek;
      changes.dailyTarget = state.dailyTarget;
    } else if (goal.type === 'exercise') {
      changes.workoutsPerWeek = state.workoutsPerWeek;
      changes.walksPerWeek = state.walksPerWeek;
      changes.walkMinDuration = state.walkMinDuration;
    } else {
      changes.target = state.target;
    }

    await store.updateGoal(goal.id, changes);
    close();
    const t = document.getElementById('toast');
    t.textContent = '✓ Goal updated';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
    render(container);
  };
}

function dateToInput(ts) {
  const d = new Date(ts);
  return d.toISOString().split('T')[0];
}
