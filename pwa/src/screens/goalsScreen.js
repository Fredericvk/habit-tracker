import * as store from '../store.js';
import { weeksBetween, startOfWeek, endOfWeek, shortDate, weekNumber } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';

let container = null;

export function init() {}

export async function render(el) {
  container = el;
  container.innerHTML = '';

  const goals = await store.getGoals();
  if (goals.length === 0) {
    container.innerHTML = '<p class="text-tertiary" style="padding:20px;text-align:center">No goals set yet.</p>';
    return;
  }

  for (const goal of goals) {
    const card = document.createElement('div');
    card.className = 'goal-card';

    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);
    const weeks = weeksBetween(startDate, endDate);
    const currentWeek = startOfWeek(new Date());

    // Calculate progress for each week
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

    card.innerHTML = `
      <div class="goal-header">
        <div class="goal-icon" style="background:var(--tint-purple)">${escapeHTML(goal.icon || '🎯')}</div>
        <div class="goal-info">
          <div class="goal-title">${escapeHTML(goal.title)}</div>
          <div class="goal-subtitle">${escapeHTML(goalSubtitle(goal))}</div>
        </div>
        <button class="goal-edit-btn" data-goal-id="${goal.id}">Edit</button>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">
        ${shortDate(startDate)} – ${shortDate(endDate)}
      </div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px">
        <span style="font-size:24px;font-weight:800">${formatValue(currentVal, goal)}</span>
        <span style="font-size:14px;color:var(--text-secondary)">/ ${formatValue(goal.target, goal)} ${goal.unit}</span>
      </div>
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

    // Edit button
    card.querySelector('.goal-edit-btn').onclick = () => openGoalEdit(goal);
  }
}

function goalSubtitle(goal) {
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
    case 'calories': return store.avgCaloriesForWeek(weekStart);
    case 'exercise': return store.activeDaysForWeek(weekStart);
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
  const val = await getCurrentValue(goal, weekStart);
  if (val == null) return false;
  if (goal.comparison === 'lte') return val <= goal.target;
  if (goal.comparison === 'gte') return val >= goal.target;
  return val === goal.target;
}

function openGoalEdit(goal) {
  const existing = document.querySelector('#goal-edit-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'goal-edit-overlay';
  overlay.className = 'overlay open';

  overlay.innerHTML = `
    <div class="overlay-panel">
      <header class="overlay-header">
        <h2>Edit ${goal.title}</h2>
        <button class="icon-btn" id="close-goal-edit" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </header>
      <div class="overlay-body">
        <div class="input-group">
          <label>Target</label>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="stepper" style="flex:1">
              <button id="ge-minus">−</button>
              <span class="stepper-value" id="ge-target">${goal.type === 'weight' ? goal.target.toFixed(1) : goal.target}</span>
              <button id="ge-plus">+</button>
            </div>
            <span style="font-size:13px;color:var(--text-secondary)">${goal.unit}</span>
          </div>
        </div>
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

  let targetVal = goal.target;
  const step = goal.type === 'weight' ? 0.5 : (goal.type === 'calories' ? 100 : 1);

  overlay.querySelector('#ge-minus').onclick = () => {
    targetVal = Math.max(0, targetVal - step);
    overlay.querySelector('#ge-target').textContent = goal.type === 'weight' ? targetVal.toFixed(1) : targetVal;
  };
  overlay.querySelector('#ge-plus').onclick = () => {
    targetVal += step;
    overlay.querySelector('#ge-target').textContent = goal.type === 'weight' ? targetVal.toFixed(1) : targetVal;
  };

  const close = () => overlay.remove();
  overlay.querySelector('#close-goal-edit').onclick = close;
  overlay.querySelector('#ge-cancel').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#ge-save').onclick = async () => {
    await store.updateGoal(goal.id, {
      target: targetVal,
      startDate: new Date(overlay.querySelector('#ge-start').value).getTime(),
      endDate: new Date(overlay.querySelector('#ge-end').value).getTime()
    });
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
