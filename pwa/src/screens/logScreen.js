import * as store from '../store.js';
import { startOfDay, formatDate, shortDate } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';
import { icon } from '../utils/icons.js';
import { DRINK_ICONS, WORKOUT_ICONS, CAL_PER_MIN } from '../utils/constants.js';

let container = null;
let currentDate = new Date();

// State
let calMode = 'Meal'; // 'Meal', 'Snack', 'Drink'
let mealType = 'Breakfast';
let drinkType = 'Beer';
let drinkQty = 1;
let weightValue = 90.0;
let workoutType = 'Run';
let workoutDuration = 30;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

export async function render(el) {
  container = el;
  container.innerHTML = '';

  // Single date nav at top (no card wrapper)
  const dateNav = document.createElement('div');
  dateNav.className = 'date-nav';
  dateNav.innerHTML = `
    <button class="nav-arrow" id="log-prev">${icon('chevronLeft', 16)}</button>
    <span class="date-label">${formatDate(currentDate)}</span>
    <button class="nav-arrow" id="log-next">${icon('chevronRight', 16)}</button>`;
  container.appendChild(dateNav);

  dateNav.querySelector('#log-prev').onclick = () => { currentDate.setDate(currentDate.getDate() - 1); render(container); };
  dateNav.querySelector('#log-next').onclick = () => { currentDate.setDate(currentDate.getDate() + 1); render(container); };

  // Render all sections
  await renderCalories();
  await renderWorkout();
  await renderWeight();
}

const SNACK_DEFAULTS = [
  { emoji: '🍪', name: 'Cookie', kcal: 150 },
  { emoji: '🍫', name: 'Chocolate', kcal: 250 },
  { emoji: '🥜', name: 'Nuts', kcal: 180 },
  { emoji: '🥨', name: 'Crisps', kcal: 200 },
  { emoji: '🍬', name: 'Candy', kcal: 120 },
  { emoji: '✏️', name: 'Custom', kcal: 0 },
];

const DRINK_TYPES = ['Beer', 'Wine', 'Spirit', 'Cocktail', 'Cider', 'Other'];

async function renderCalories() {
  const card = document.createElement('div');
  card.className = calMode === 'Snack' ? 'glass-card snack-warning-card' : 'glass-card';
  card.id = 'cal-card';

  // 3-way toggle: Meal | Snack | Drink
  const toggle = `
    <div class="card-title" style="margin-bottom:12px">${icon('flame', 16)} Calories</div>
    <div class="toggle-group">
      <button class="toggle-btn ${calMode === 'Meal' ? 'active' : ''}" data-mode="Meal">Meal</button>
      <button class="toggle-btn ${calMode === 'Snack' ? 'active' : ''}" data-mode="Snack">Snack</button>
      <button class="toggle-btn ${calMode === 'Drink' ? 'active' : ''}" data-mode="Drink">Drink</button>
    </div>`;

  let formHTML = '';

  if (calMode === 'Meal') {
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
    formHTML = `
      ${toggle}
      <div class="meal-type-selector">
        ${mealTypes.map(t => `<button class="meal-type-btn ${mealType === t ? 'selected' : ''}" data-type="${t}">${t}</button>`).join('')}
      </div>
      <div class="input-group">
        <label>Description</label>
        <input class="input-field" id="food-desc" placeholder="e.g. Chicken salad" />
      </div>
      <div class="input-group">
        <label>Calories (kcal)</label>
        <input class="input-field" id="food-kcal" type="number" placeholder="0" />
      </div>
      <button class="btn btn-primary btn-block" id="food-save">Save</button>`;
  } else if (calMode === 'Snack') {
    const snackGrid = SNACK_DEFAULTS.map((s, i) =>
      `<div class="snack-option" data-snack-idx="${i}">
        <span class="snack-emoji">${s.emoji}</span>
        <span class="snack-name">${s.name}</span>
        ${s.kcal > 0 ? `<span class="snack-cal">${s.kcal} kcal</span>` : '<span class="snack-cal">manual</span>'}
      </div>`
    ).join('');

    formHTML = `
      ${toggle}
      <div class="snack-warning">
        <span class="snack-warning-icon">${icon('alertTriangle', 22)}</span>
        <span class="snack-warning-text">Are you sure? Every snack breaks your streak.</span>
      </div>
      <div class="snack-grid">${snackGrid}</div>
      <div id="snack-custom-fields" class="hidden">
        <div class="input-group">
          <label>Description</label>
          <input class="input-field" id="food-desc" placeholder="e.g. Trail mix" />
        </div>
        <div class="input-group">
          <label>Calories (kcal)</label>
          <input class="input-field" id="food-kcal" type="number" placeholder="0" />
        </div>
        <button class="btn btn-danger-fill btn-block" id="food-save">Save Snack</button>
      </div>`;
  } else {
    // Drink mode
    const unitVal = (store.DRINK_UNITS[drinkType] ?? 1.0) * drinkQty;
    const kcalVal = (store.DRINK_KCAL[drinkType] ?? 100) * drinkQty;

    formHTML = `
      ${toggle}
      <div class="drink-grid">
        ${DRINK_TYPES.map(t => `
          <div class="drink-option ${drinkType === t ? 'selected' : ''}" data-type="${t}">
            <span class="drink-icon">${DRINK_ICONS[t]}</span>
            ${t}
          </div>
        `).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <span style="font-weight:600">Quantity</span>
        <div class="stepper">
          <button id="drink-minus">−</button>
          <span class="stepper-value" id="drink-qty">${drinkQty}</span>
          <button id="drink-plus">+</button>
        </div>
      </div>
      <div class="session-total">
        <div>
          <div class="st-label">Units</div>
          <div class="st-value">${unitVal.toFixed(1)}</div>
        </div>
        <div>
          <div class="st-label">Calories</div>
          <div class="st-value">${kcalVal}</div>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="drink-add">Add drink</button>`;
  }

  card.innerHTML = formHTML;
  container.appendChild(card);

  // ── Today's entries card (meals + snacks + drinks combined) ──
  const [recentMeals, recentDrinks] = await Promise.all([
    store.mealsInRange(currentDate, currentDate),
    store.drinksInRange(currentDate, currentDate)
  ]);

  const regularMeals = recentMeals.filter(m => m.mealType !== 'Snack');
  const snackMeals = recentMeals.filter(m => m.mealType === 'Snack');
  const totalKcal = recentMeals.reduce((s, m) => s + (m.kcal || 0), 0)
    + recentDrinks.reduce((s, d) => s + (d.kcal || 0), 0);

  if (regularMeals.length > 0 || snackMeals.length > 0 || recentDrinks.length > 0) {
    const recentCard = document.createElement('div');
    recentCard.className = 'glass-card';

    let entriesHTML = `<div class="card-title" style="margin-bottom:8px">Today: ${totalKcal.toLocaleString()} kcal</div>`;

    if (regularMeals.length > 0) {
      entriesHTML += `<div class="card-subtitle" style="margin:8px 0 4px;font-size:12px;text-transform:uppercase;opacity:0.6">Meals</div>`;
      entriesHTML += regularMeals.map(m => `
        <div class="meal-item">
          <span class="meal-desc">${escapeHTML(m.description || m.mealType)}</span>
          <span class="meal-kcal">${m.kcal || 0} kcal</span>
          <button class="delete-btn" data-id="${m.id}" data-type="meal">✕</button>
        </div>
      `).join('');
    }

    if (snackMeals.length > 0) {
      entriesHTML += `<div class="card-subtitle" style="margin:8px 0 4px;font-size:12px;text-transform:uppercase;opacity:0.6">Snacks</div>`;
      entriesHTML += snackMeals.map(m => `
        <div class="meal-item">
          <span class="meal-desc">${escapeHTML(m.description || 'Snack')}</span>
          <span class="meal-kcal">${m.kcal || 0} kcal</span>
          <button class="delete-btn" data-id="${m.id}" data-type="meal">✕</button>
        </div>
      `).join('');
    }

    if (recentDrinks.length > 0) {
      entriesHTML += `<div class="card-subtitle" style="margin:8px 0 4px;font-size:12px;text-transform:uppercase;opacity:0.6">Drinks</div>`;
      entriesHTML += recentDrinks.map(d => `
        <div class="meal-item">
          <span class="meal-desc">${DRINK_ICONS[d.drinkType] || '🍹'} ${escapeHTML(d.drinkType || 'Drink')} ×${d.quantity || 1}</span>
          <span class="meal-kcal">${d.kcal || 0} kcal</span>
          <button class="delete-btn" data-id="${d.id}" data-type="drink">✕</button>
        </div>
      `).join('');
    }

    recentCard.innerHTML = entriesHTML;
    container.appendChild(recentCard);

    recentCard.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = async () => {
        if (btn.dataset.type === 'drink') {
          await store.deleteDrink(btn.dataset.id);
        } else {
          await store.deleteMeal(btn.dataset.id);
        }
        render(container);
      };
    });
  }

  // ── Event handlers ──
  card.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.onclick = async () => {
      calMode = btn.dataset.mode;
      const oldCard = document.getElementById('cal-card');
      if (oldCard) {
        const parent = oldCard.parentNode;
        const next = oldCard.nextSibling;
        parent.removeChild(oldCard);
        // Temporarily point container to a fragment to capture the new card
        const frag = document.createDocumentFragment();
        const savedContainer = container;
        container = frag;
        await renderCalories();
        container = savedContainer;
        parent.insertBefore(frag, next);
      }
    };
  });

  if (calMode === 'Meal') {
    card.querySelectorAll('.meal-type-btn').forEach(btn => {
      btn.onclick = () => {
        mealType = btn.dataset.type;
        card.querySelectorAll('.meal-type-btn').forEach(b => b.classList.toggle('selected', b.dataset.type === mealType));
      };
    });

    const saveBtn = card.querySelector('#food-save');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const desc = card.querySelector('#food-desc').value.trim().slice(0, 500);
        const kcal = Math.max(0, Math.min(99999, parseInt(card.querySelector('#food-kcal').value) || 0));
        if (!desc && kcal === 0) return;
        await store.addMeal({
          date: currentDate,
          mealType,
          description: desc || mealType,
          kcal
        });
        showToast('✓ Saved');
        render(container);
      };
    }
  } else if (calMode === 'Snack') {
    card.querySelectorAll('.snack-option').forEach(opt => {
      opt.onclick = async () => {
        const idx = Number(opt.dataset.snackIdx);
        const snack = SNACK_DEFAULTS[idx];
        if (snack.name === 'Custom') {
          card.querySelector('#snack-custom-fields').classList.remove('hidden');
          card.querySelector('.snack-grid').classList.add('hidden');
          return;
        }
        await store.addMeal({
          date: currentDate,
          mealType: 'Snack',
          description: snack.name,
          kcal: snack.kcal
        });
        showToast('✓ Snack logged');
        render(container);
      };
    });

    const saveBtn = card.querySelector('#food-save');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const desc = card.querySelector('#food-desc').value.trim().slice(0, 500);
        const kcal = Math.max(0, Math.min(99999, parseInt(card.querySelector('#food-kcal').value) || 0));
        if (!desc && kcal === 0) return;
        await store.addMeal({
          date: currentDate,
          mealType: 'Snack',
          description: desc || 'Snack',
          kcal
        });
        showToast('✓ Saved');
        render(container);
      };
    }
  } else {
    // Drink mode handlers — update in-place
    card.querySelectorAll('.drink-option').forEach(opt => {
      opt.onclick = () => {
        drinkType = opt.dataset.type;
        drinkQty = 1;
        card.querySelectorAll('.drink-option').forEach(o => o.classList.toggle('selected', o.dataset.type === drinkType));
        card.querySelector('#drink-qty').textContent = drinkQty;
      };
    });
    card.querySelector('#drink-minus').onclick = () => {
      if (drinkQty > 1) drinkQty--;
      card.querySelector('#drink-qty').textContent = drinkQty;
    };
    card.querySelector('#drink-plus').onclick = () => {
      drinkQty++;
      card.querySelector('#drink-qty').textContent = drinkQty;
    };

    card.querySelector('#drink-add').onclick = async () => {
      await store.addDrink({ date: currentDate, drinkType, quantity: drinkQty });
      showToast('✓ Drink added');
      drinkQty = 1;
      render(container);
    };
  }
}

async function renderWorkout() {
  const card = document.createElement('div');
  card.className = 'glass-card';

  const types = ['Run', 'Gym', 'Walk', 'Cycle', 'Swim', 'HIIT'];
  const estimatedKcal = workoutDuration * (CAL_PER_MIN[workoutType] || 7);

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:12px">${icon('dumbbell', 16)} Workout</div>
    <div class="drink-grid">
      ${types.map(t => `
        <div class="drink-option ${workoutType === t ? 'selected' : ''}" data-type="${t}">
          <span class="drink-icon">${WORKOUT_ICONS[t]}</span>
          ${t}
        </div>
      `).join('')}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <span style="font-weight:600">Duration (min)</span>
      <div class="stepper">
        <button id="wo-minus">−</button>
        <span class="stepper-value" id="wo-dur">${workoutDuration}</span>
        <button id="wo-plus">+</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <span style="font-weight:600">Calories burned</span>
      <input type="number" inputmode="numeric" pattern="[0-9]*" id="wo-kcal" class="input-field" style="width:100px;text-align:center" value="${estimatedKcal}" min="0" max="9999" />
    </div>
    <div class="input-group">
      <label>Notes (optional)</label>
      <input class="input-field" id="wo-notes" placeholder="e.g. Leg day, 5K run" maxlength="200" />
    </div>
    <button class="btn btn-primary btn-block" id="wo-save">Log workout</button>
  `;
  container.appendChild(card);

  // Type selection — update in-place without re-rendering the full page
  card.querySelectorAll('.drink-option').forEach(opt => {
    opt.onclick = () => {
      workoutType = opt.dataset.type;
      card.querySelectorAll('.drink-option').forEach(o => o.classList.toggle('selected', o.dataset.type === workoutType));
      const est = workoutDuration * (CAL_PER_MIN[workoutType] || 7);
      card.querySelector('#wo-kcal').value = est;
    };
  });

  // Duration stepper (step 5) — also updates kcal estimate
  const updateKcalEstimate = () => {
    const est = workoutDuration * (CAL_PER_MIN[workoutType] || 7);
    card.querySelector('#wo-kcal').value = est;
  };
  card.querySelector('#wo-minus').onclick = () => { workoutDuration = Math.max(5, workoutDuration - 5); card.querySelector('#wo-dur').textContent = workoutDuration; updateKcalEstimate(); };
  card.querySelector('#wo-plus').onclick = () => { workoutDuration = Math.min(300, workoutDuration + 5); card.querySelector('#wo-dur').textContent = workoutDuration; updateKcalEstimate(); };

  // Save
  card.querySelector('#wo-save').onclick = async () => {
    const notes = card.querySelector('#wo-notes').value.trim().slice(0, 200);
    const kcal = parseInt(card.querySelector('#wo-kcal').value) || 0;
    await store.addWorkout({ date: currentDate, type: workoutType, duration: workoutDuration, kcal, notes });
    showToast('✓ Workout logged');
    render(container);
  };

  // Recent workouts today
  const recent = await store.workoutsInRange(currentDate, currentDate);
  if (recent.length > 0) {
    const recentCard = document.createElement('div');
    recentCard.className = 'glass-card';
    recentCard.innerHTML = `
      <div class="card-title" style="margin-bottom:8px">Today's workouts</div>
      ${recent.map(w => `
        <div class="meal-item">
          <span class="meal-desc">${icons[w.type] || '🏃'} ${escapeHTML(w.type)}${w.duration ? ' · ' + w.duration + ' min' : ''}${w.kcal ? ' · ' + w.kcal + ' kcal' : ''}${w.notes ? ' — ' + escapeHTML(w.notes) : ''}</span>
          <button class="delete-btn" data-id="${w.id}">✕</button>
        </div>
      `).join('')}
    `;
    container.appendChild(recentCard);

    recentCard.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = async () => {
        await store.deleteWorkout(btn.dataset.id);
        render(container);
      };
    });
  }
}

async function renderWeight() {
  const card = document.createElement('div');
  card.className = 'glass-card';

  card.innerHTML = `
    <div class="card-title" style="margin-bottom:12px">${icon('scale', 16)} Weight</div>
    <div class="weight-readout">
      <button class="adjust-btn" id="wt-down">−</button>
      <div>
        <span class="weight-value" id="wt-val">${weightValue.toFixed(1)}</span>
        <span class="weight-unit">kg</span>
      </div>
      <button class="adjust-btn" id="wt-up">+</button>
    </div>
    <button class="btn btn-primary btn-block" id="wt-save">Save weight</button>
  `;
  container.appendChild(card);

  card.querySelector('#wt-down').onclick = () => { weightValue = Math.max(40, Math.round((weightValue - 0.1) * 10) / 10); card.querySelector('#wt-val').textContent = weightValue.toFixed(1); };
  card.querySelector('#wt-up').onclick = () => { weightValue = Math.min(200, Math.round((weightValue + 0.1) * 10) / 10); card.querySelector('#wt-val').textContent = weightValue.toFixed(1); };

  card.querySelector('#wt-save').onclick = async () => {
    await store.addWeight({ date: currentDate, value: weightValue });
    showToast('✓ Weight saved');
    render(container);
  };
}
