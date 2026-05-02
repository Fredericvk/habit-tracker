import * as store from '../store.js';
import { startOfMonth, endOfMonth, startOfWeek, startOfDay, monthYear, weekNumber, weekdayName, isSameDay, isWeekday, daysInWeek, shortDate } from '../dateHelper.js';
import { icon } from '../utils/icons.js';
import { escapeHTML } from '../utils/sanitize.js';

let currentDate = new Date();
let container = null;
let activeFilter = 'default'; // 'default', 'calories', 'exercise', 'snacks', 'alcohol'

const WORKOUT_ICONS = { Run: '🏃', Gym: '🏋️', Walk: '🚶', Cycle: '🚴', Swim: '🏊', Yoga: '🧘', HIIT: '🔥' };
const SNACK_EMOJIS = { Cookie: '🍪', Chocolate: '🍫', Nuts: '🥜', Crisps: '🥨', Candy: '🍬' };
function snackEmoji(desc) {
  for (const [key, emoji] of Object.entries(SNACK_EMOJIS)) {
    if (desc && desc.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🍿';
}

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

  // Filter buttons
  const filterBar = document.createElement('div');
  filterBar.className = 'mo-filter-bar';
  const filters = [
    { id: 'default', label: 'All' },
    { id: 'calories', label: '🔥 Cal' },
    { id: 'exercise', label: '💪 Exercise' },
    { id: 'snacks', label: '🍫 Snacks' },
    { id: 'alcohol', label: '🍺 Alcohol' },
  ];
  filterBar.innerHTML = filters.map(f =>
    `<button class="mo-filter-btn ${activeFilter === f.id ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>`
  ).join('');
  container.appendChild(filterBar);

  filterBar.querySelectorAll('.mo-filter-btn').forEach(btn => {
    btn.onclick = () => { activeFilter = btn.dataset.filter; render(container); };
  });

  // Build mini calendar
  const calCard = document.createElement('div');
  calCard.className = 'glass-card flip-card';

  const [meals, workouts, drinks, weights] = await Promise.all([
    store.mealsInRange(ms, me),
    store.workoutsInRange(ms, me),
    store.drinksInRange(ms, me),
    store.weightsInRange(ms, me),
  ]);
  const today = new Date();

  // Load goals for dot logic and week detail
  const [calGoal, exGoal, snackGoal, alcGoal] = await Promise.all([
    store.getGoal('calories'),
    store.getGoal('exercise'),
    store.getGoal('snacks'),
    store.getGoal('alcohol'),
  ]);
  const calTarget = calGoal?.dailyTarget ?? calGoal?.target ?? 2300;
  const alcWeeklyBudget = alcGoal?.weeklyUnits ?? 6;

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

    let cellContent = '';
    let dotColor = '';
    let cellCls = '';

    if (inMonth) {
      const dayMeals = meals.filter(m => isSameDay(new Date(m.date), calDate));
      const dayWorkouts = workouts.filter(w => isSameDay(new Date(w.date), calDate));
      const dayDrinks = drinks.filter(dr => isSameDay(new Date(dr.date), calDate));

      if (activeFilter === 'default') {
        cellContent = `${calDate.getDate()}`;
        // Only show dot for days up to today that have some data
        if (startOfDay(calDate) <= startOfDay(today) && (dayMeals.length > 0 || dayWorkouts.length > 0 || dayDrinks.length > 0)) {
          // Check 4 goals: calories, exercise, no snacks, no alcohol
          let missed = 0;
          const dayKcal = dayMeals.reduce((s, m) => s + (m.kcal || 0), 0) + dayDrinks.reduce((s, d) => s + (d.kcal || 0), 0);
          if (dayKcal > calTarget) missed++;
          if (dayWorkouts.length === 0) missed++;
          const hasSnack = dayMeals.some(m => m.mealType === 'Snack');
          if (hasSnack) missed++;
          const dayUnits = dayDrinks.reduce((s, d) => s + (d.units || 0), 0);
          const dailyAlcBudget = alcWeeklyBudget / 7;
          if (dayUnits > dailyAlcBudget) missed++;

          if (missed === 0) dotColor = 'green';
          else if (missed <= 2) dotColor = 'amber';
          else dotColor = 'red';
        }
      } else if (activeFilter === 'calories') {
        const kcal = dayMeals.reduce((s, m) => s + (m.kcal || 0), 0) + dayDrinks.reduce((s, d) => s + (d.kcal || 0), 0);
        cellContent = `<span class="mc-day-num">${calDate.getDate()}</span>`;
        if (kcal > 0) {
          cellCls = kcal <= 2300 ? 'mc-filter-green' : 'mc-filter-red';
          cellContent += `<span class="mc-filter-val">${kcal}</span>`;
        }
      } else if (activeFilter === 'exercise') {
        cellContent = `<span class="mc-day-num">${calDate.getDate()}</span>`;
        if (dayWorkouts.length > 0) {
          cellCls = 'mc-filter-green';
          const wIcon = WORKOUT_ICONS[dayWorkouts[0].type] || '🏃';
          cellContent += `<span class="mc-filter-icon">${wIcon}</span>`;
        }
      } else if (activeFilter === 'snacks') {
        cellContent = `<span class="mc-day-num">${calDate.getDate()}</span>`;
        const hasSnack = dayMeals.some(m => m.mealType === 'Snack');
        const hasData = dayMeals.length > 0;
        if (hasData && !hasSnack) {
          cellCls = 'mc-filter-green';
          cellContent += `<span class="mc-filter-icon">✨</span>`;
        } else if (hasSnack) {
          cellCls = 'mc-filter-red';
          const snacks = dayMeals.filter(m => m.mealType === 'Snack');
          cellContent += `<span class="mc-filter-icon">${snacks.map(s => snackEmoji(s.description)).join('')}</span>`;
        }
      } else if (activeFilter === 'alcohol') {
        cellContent = `<span class="mc-day-num">${calDate.getDate()}</span>`;
        const units = dayDrinks.reduce((s, d) => s + (d.units || 0), 0);
        if (units > 0) {
          cellCls = 'mc-filter-amber';
          cellContent += `<span class="mc-filter-val">${units.toFixed(1)}</span>`;
        } else if (startOfDay(calDate) <= startOfDay(today)) {
          cellCls = 'mc-filter-green';
          cellContent += `<span class="mc-filter-icon">✨</span>`;
        }
      }
    }

    if (activeFilter === 'default' && !cellContent) cellContent = inMonth ? `${calDate.getDate()}` : '';

    const dateISO = inMonth ? startOfDay(calDate).toISOString() : '';
    calHTML += `<div class="mc-day ${isToday ? 'today' : ''} ${!inMonth ? 'empty' : 'clickable'} ${cellCls}"${dateISO ? ` data-date="${dateISO}"` : ''}>
      ${cellContent}
      ${dotColor ? `<span class="mc-dot ${dotColor}"></span>` : ''}
    </div>`;

    calDate.setDate(calDate.getDate() + 1);
    if (calDate > me && calDate.getDay() === 1) break;
  }
  calHTML += '</div>';

  const flipContainer = document.createElement('div');
  flipContainer.className = 'flip-container';
  calCard.innerHTML = calHTML;
  flipContainer.appendChild(calCard);
  container.appendChild(flipContainer);

  // Week detail flip setup
  calCard.querySelectorAll('.mc-wk').forEach(wkEl => {
    wkEl.onclick = () => flipToWeekDetail(new Date(wkEl.dataset.wk), calCard, flipContainer, calTarget);
  });

  // Day tap → navigate to day view
  calCard.querySelectorAll('.mc-day.clickable').forEach(dayEl => {
    dayEl.onclick = () => {
      const dateStr = dayEl.dataset.date;
      if (dateStr) {
        document.dispatchEvent(new CustomEvent('navigateToDay', { detail: { date: new Date(dateStr) } }));
      }
    };
  });

  // Rich month stats
  const totalKcal = meals.reduce((s, m) => s + (m.kcal || 0), 0);
  const daysInMonth = me.getDate();
  const avgKcal = daysInMonth > 0 ? Math.round(totalKcal / daysInMonth) : 0;

  const totalWorkoutCount = workouts.length;
  const workoutDaySet = new Set(workouts.map(w => startOfDay(new Date(w.date)).getTime()));
  const activeDayCount = workoutDaySet.size;

  const totalAlcUnits = drinks.reduce((s, d) => s + (d.units || 0), 0);
  const totalAlcKcal = drinks.reduce((s, d) => s + (d.kcal || 0), 0);

  // Snacking score
  let cleanWeekdays = 0;
  let totalWeekdays = 0;
  const checkDate = new Date(ms);
  while (checkDate <= me) {
    if (isWeekday(checkDate)) {
      totalWeekdays++;
      const dayMealsCheck = meals.filter(m => isSameDay(new Date(m.date), checkDate));
      const hasSnack = dayMealsCheck.some(m => m.mealType === 'Snack');
      if (dayMealsCheck.length > 0 && !hasSnack) cleanWeekdays++;
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }
  const snackPct = totalWeekdays > 0 ? Math.round((cleanWeekdays / totalWeekdays) * 100) : 0;

  // Weight
  const startWeight = weights.length > 0 ? weights[0].value : null;
  const endWeight = weights.length > 0 ? weights[weights.length - 1].value : null;
  const weightDelta = (startWeight != null && endWeight != null) ? endWeight - startWeight : null;

  // Best day
  const dayCalMap = {};
  for (const m of meals) {
    const key = startOfDay(new Date(m.date)).getTime();
    dayCalMap[key] = (dayCalMap[key] || 0) + (m.kcal || 0);
  }
  let bestDayDate = null;
  let bestDayCal = Infinity;
  for (const [ts, cal] of Object.entries(dayCalMap)) {
    if (cal > 0 && cal < bestDayCal) { bestDayCal = cal; bestDayDate = new Date(Number(ts)); }
  }

  const summaryCard = document.createElement('div');
  summaryCard.className = 'glass-card';
  summaryCard.innerHTML = `
    <div class="card-header">
      <div class="card-title">Month Summary</div>
    </div>
    <div class="mo-stats-grid">
      <div class="mo-stat-card">
        <div class="mo-stat-icon purple">${icon('flame', 18)}</div>
        <div class="mo-stat-value">${totalKcal.toLocaleString()}</div>
        <div class="mo-stat-label">Total Calories</div>
        <div class="mo-stat-sub">~${avgKcal} kcal/day</div>
      </div>
      <div class="mo-stat-card">
        <div class="mo-stat-icon green">${icon('dumbbell', 18)}</div>
        <div class="mo-stat-value">${totalWorkoutCount}</div>
        <div class="mo-stat-label">Workouts</div>
        <div class="mo-stat-sub">${activeDayCount} active day${activeDayCount !== 1 ? 's' : ''}</div>
      </div>
      <div class="mo-stat-card">
        <div class="mo-stat-icon amber">${icon('beer', 18)}</div>
        <div class="mo-stat-value">${totalAlcUnits.toFixed(1)}</div>
        <div class="mo-stat-label">Alcohol Units</div>
        <div class="mo-stat-sub">${totalAlcKcal} kcal</div>
      </div>
      <div class="mo-stat-card">
        <div class="mo-stat-icon red">${icon('apple', 18)}</div>
        <div class="mo-stat-value">${snackPct}%</div>
        <div class="mo-stat-label">Snack-free Score</div>
        <div class="mo-stat-sub">${cleanWeekdays}/${totalWeekdays} weekdays</div>
      </div>
      <div class="mo-stat-card">
        <div class="mo-stat-icon blue">${icon('scale', 18)}</div>
        <div class="mo-stat-value">${endWeight != null ? endWeight.toFixed(1) : '—'}</div>
        <div class="mo-stat-label">Weight (kg)</div>
        <div class="mo-stat-sub">${weightDelta != null ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg change` : 'No data'}</div>
      </div>
      ${bestDayDate ? `<div class="mo-stat-card">
        <div class="mo-stat-icon green">${icon('trophy', 18)}</div>
        <div class="mo-stat-value">${bestDayCal}</div>
        <div class="mo-stat-label">Best Day (kcal)</div>
        <div class="mo-stat-sub">${shortDate(bestDayDate)}</div>
      </div>` : `<div class="mo-stat-card">
        <div class="mo-stat-icon green">${icon('trophy', 18)}</div>
        <div class="mo-stat-value">—</div>
        <div class="mo-stat-label">Best Day</div>
        <div class="mo-stat-sub">No data yet</div>
      </div>`}
    </div>
  `;
  container.appendChild(summaryCard);
}

async function flipToWeekDetail(weekStart, flipCard, flipContainer, calTarget = 2300) {
  // Phase 1: flip out
  flipCard.classList.add('flipping-out');
  await new Promise(r => setTimeout(r, 250));

  // Load week data
  const days = daysInWeek(weekStart);
  const [wkMeals, wkWorkouts, wkDrinks] = await Promise.all([
    store.mealsInRange(weekStart, days[6]),
    store.workoutsInRange(weekStart, days[6]),
    store.drinksInRange(weekStart, days[6]),
  ]);

  // Build week detail grid
  const dayHeaders = days.map(d => `<div class="wg-header">${weekdayName(d)}</div>`).join('');
  const rows = ['Calories', 'Exercise', 'Snacking', 'Alcohol'];
  let gridHTML = `<div class="week-grid"><div class="wg-header"></div>${dayHeaders}`;

  for (const row of rows) {
    gridHTML += `<div class="wg-label">${row}</div>`;
    for (const d of days) {
      const dayMeals = wkMeals.filter(m => isSameDay(new Date(m.date), d));
      const dayW = wkWorkouts.filter(w => isSameDay(new Date(w.date), d));
      const dayD = wkDrinks.filter(dr => isSameDay(new Date(dr.date), d));

      let cls = 'muted', val = '—';
      const isPast = startOfDay(d) <= startOfDay(new Date());
      if (row === 'Calories') {
        const kcal = dayMeals.reduce((s, m) => s + (m.kcal || 0), 0) + dayD.reduce((s, dr) => s + (dr.kcal || 0), 0);
        if (kcal > 0) { val = kcal.toLocaleString(); cls = kcal <= calTarget ? 'green' : 'red'; }
      } else if (row === 'Exercise') {
        if (dayW.length > 0) { val = '✓'; cls = 'green'; }
      } else if (row === 'Snacking') {
        const has = dayMeals.some(m => m.mealType === 'Snack');
        if (has) { val = '✕'; cls = 'red'; }
        else if (isPast) { val = '✓'; cls = 'green'; }
      } else if (row === 'Alcohol') {
        const units = dayD.reduce((s, dr) => s + (dr.units || 0), 0);
        if (units > 0) { val = units.toFixed(1); cls = 'amber'; }
        else if (isPast) { val = '✓'; cls = 'green'; }
      }
      gridHTML += `<div class="wg-cell ${cls}">${val}</div>`;
    }
  }
  gridHTML += '</div>';

  // Swap content
  // Store original HTML so we can restore it
  flipContainer._calendarHTML = flipCard.innerHTML;

  flipCard.innerHTML = `
    <div style="padding: 16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <button class="nav-arrow" id="flip-back">${icon('chevronLeft', 16)}</button>
        <h3 style="font-size:16px;font-weight:700;flex:1">W${weekNumber(weekStart)} · ${shortDate(weekStart)}</h3>
      </div>
      ${gridHTML}
    </div>
  `;

  flipCard.classList.remove('flipping-out');
  flipCard.classList.add('flipping-in');

  // Back button
  flipCard.querySelector('#flip-back').onclick = () => flipBackToCalendar(flipCard, flipContainer, calTarget);

  await new Promise(r => setTimeout(r, 250));
  flipCard.classList.remove('flipping-in');
}

function flipBackToCalendar(flipCard, flipContainer, calTarget) {
  flipCard.classList.add('flipping-out');
  setTimeout(() => {
    flipCard.innerHTML = flipContainer._calendarHTML;
    flipCard.classList.remove('flipping-out');
    flipCard.classList.add('flipping-in');

    // Re-attach week click handlers
    flipCard.querySelectorAll('.mc-wk').forEach(wkEl => {
      wkEl.onclick = () => flipToWeekDetail(new Date(wkEl.dataset.wk), flipCard, flipContainer, calTarget);
    });

    // Re-attach day click handlers
    flipCard.querySelectorAll('.mc-day.clickable').forEach(dayEl => {
      dayEl.onclick = () => {
        const dateStr = dayEl.dataset.date;
        if (dateStr) {
          document.dispatchEvent(new CustomEvent('navigateToDay', { detail: { date: new Date(dateStr) } }));
        }
      };
    });

    setTimeout(() => flipCard.classList.remove('flipping-in'), 250);
  }, 250);
}
