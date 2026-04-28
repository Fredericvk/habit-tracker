import * as store from '../store.js';
import { startOfDay, endOfDay, formatDate, shortDate, isSameDay, daysInWeek, startOfWeek } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';

let currentDate = new Date();
let container = null;

export function init() {}

export async function render(el) {
  container = el;
  container.innerHTML = '';

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

  const [meals, workouts, drinks, totalCal] = await Promise.all([
    store.mealsInRange(dayStart, dayEnd),
    store.workoutsInRange(dayStart, dayEnd),
    store.drinksInRange(dayStart, dayEnd),
    store.totalCaloriesForDay(currentDate)
  ]);

  const goal = await store.getGoal('calories');
  const calTarget = goal?.target ?? 2300;

  // Calories card
  const calCard = document.createElement('div');
  calCard.className = 'glass-card';
  const pct = Math.min(100, Math.round((totalCal / calTarget) * 100));
  const barColor = totalCal <= calTarget ? 'green' : 'danger';

  const groups = {};
  for (const m of meals) {
    const type = m.mealType || 'Other';
    (groups[type] = groups[type] || []).push(m);
  }

  let mealsHTML = '';
  for (const [type, items] of Object.entries(groups)) {
    mealsHTML += `<div class="meal-group"><div class="meal-group-title">${type}</div>`;
    for (const item of items) {
      mealsHTML += `
        <div class="meal-item">
          <span class="meal-desc">${escapeHTML(item.description || 'Meal')}</span>
          <span class="meal-kcal">${item.kcal || 0} kcal</span>
          <button class="delete-btn" data-meal-id="${item.id}">✕</button>
        </div>`;
    }
    mealsHTML += `</div>`;
  }

  calCard.innerHTML = `
    <div class="card-header">
      <div><div class="card-title">Calories</div><div class="card-subtitle">${totalCal} / ${calTarget} kcal</div></div>
      <div class="card-icon blue">🔥</div>
    </div>
    <div class="progress-bar"><div class="bar-fill ${barColor}" style="width:${pct}%"></div></div>
    ${mealsHTML || '<p class="text-tertiary" style="padding:8px 0">No meals logged today</p>'}
  `;
  container.appendChild(calCard);

  // Delete handlers
  calCard.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async () => {
      await store.deleteMeal(Number(btn.dataset.mealId));
      render(container);
    };
  });

  // Exercise card
  const exCard = document.createElement('div');
  exCard.className = 'glass-card';
  exCard.innerHTML = `
    <div class="card-header">
      <div><div class="card-title">Exercise</div><div class="card-subtitle">${workouts.length} workout${workouts.length !== 1 ? 's' : ''} today</div></div>
      <div class="card-icon green">💪</div>
    </div>
    ${workouts.length > 0
      ? workouts.map(w => `<div class="chip green" style="margin:2px">${escapeHTML(w.type || 'Workout')} ${w.duration ? '— ' + w.duration + ' min' : ''}</div>`).join('')
      : '<p class="text-tertiary" style="padding:8px 0">No workouts today</p>'}
  `;
  container.appendChild(exCard);

  // Side-by-side: No Snacking + Alcohol
  const row = document.createElement('div');
  row.className = 'card-row';

  const hasSnack = meals.some(m => m.mealType === 'Snack');
  const snackCard = document.createElement('div');
  snackCard.className = 'glass-card';
  snackCard.innerHTML = `
    <div class="card-icon amber" style="margin-bottom:8px">🍎</div>
    <div class="card-title" style="font-size:14px">No Snacking</div>
    <div class="chip ${hasSnack ? 'danger' : 'green'}" style="margin-top:8px">${hasSnack ? 'Snacked' : 'Clean ✓'}</div>
  `;

  const totalUnits = drinks.reduce((s, d) => s + (d.units || 0), 0);
  const alcCard = document.createElement('div');
  alcCard.className = 'glass-card';
  alcCard.innerHTML = `
    <div class="card-icon purple" style="margin-bottom:8px">🍺</div>
    <div class="card-title" style="font-size:14px">Alcohol</div>
    <div class="chip ${totalUnits > 0 ? 'amber' : 'green'}" style="margin-top:8px">${totalUnits > 0 ? totalUnits.toFixed(1) + ' units' : 'None ✓'}</div>
  `;

  row.appendChild(snackCard);
  row.appendChild(alcCard);
  container.appendChild(row);
}
