import * as store from '../store.js';
import { startOfDay, formatDate, shortDate } from '../dateHelper.js';
import { escapeHTML } from '../utils/sanitize.js';
import { icon } from '../utils/icons.js';

let container = null;
let currentDate = new Date();

// State
let foodMode = 'Meal'; // Meal or Snack
let mealType = 'Breakfast';
let drinkType = 'Beer';
let drinkQty = 1;
let weightValue = 90.0;

export function init() {}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

export async function render(el, segment = 'food') {
  container = el;
  container.innerHTML = '';

  if (segment === 'food') renderFood();
  else if (segment === 'drink') renderDrink();
  else if (segment === 'weight') renderWeight();
}

async function renderFood() {
  const card = document.createElement('div');
  card.className = foodMode === 'Snack' ? 'glass-card snack-warning-card' : 'glass-card';

  // Date nav
  const dateNav = `
    <div class="date-nav">
      <button class="nav-arrow" id="food-prev">${icon('chevronLeft', 16)}</button>
      <span class="date-label">${formatDate(currentDate)}</span>
      <button class="nav-arrow" id="food-next">${icon('chevronRight', 16)}</button>
    </div>`;

  // Toggle Meal/Snack
  const toggle = `
    <div class="toggle-group">
      <button class="toggle-btn ${foodMode === 'Meal' ? 'active' : ''}" data-mode="Meal">Meal</button>
      <button class="toggle-btn ${foodMode === 'Snack' ? 'active' : ''}" data-mode="Snack">Snack</button>
    </div>`;

  // Meal type selector (only for Meals)
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
  const typeSelector = foodMode === 'Meal' ? `
    <div class="meal-type-selector">
      ${mealTypes.map(t => `<button class="meal-type-btn ${mealType === t ? 'selected' : ''}" data-type="${t}">${t}</button>`).join('')}
    </div>` : '';

  const SNACK_DEFAULTS = [
    { emoji: '🍪', name: 'Cookie', kcal: 150 },
    { emoji: '🍫', name: 'Chocolate', kcal: 250 },
    { emoji: '🥜', name: 'Nuts', kcal: 180 },
    { emoji: '🥨', name: 'Crisps', kcal: 200 },
    { emoji: '🍬', name: 'Candy', kcal: 120 },
    { emoji: '✏️', name: 'Custom', kcal: 0 },
  ];

  if (foodMode === 'Snack') {
    const snackGrid = SNACK_DEFAULTS.map((s, i) =>
      `<div class="snack-option" data-snack-idx="${i}">
        <span class="snack-emoji">${s.emoji}</span>
        <span class="snack-name">${s.name}</span>
        ${s.kcal > 0 ? `<span class="snack-cal">${s.kcal} kcal</span>` : '<span class="snack-cal">manual</span>'}
      </div>`
    ).join('');

    card.innerHTML = `
      ${dateNav}
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
      </div>
    `;
  } else {
    card.innerHTML = `
      ${dateNav}
      ${toggle}
      ${typeSelector}
      <div class="input-group">
        <label>Description</label>
        <input class="input-field" id="food-desc" placeholder="e.g. Chicken salad" />
      </div>
      <div class="input-group">
        <label>Calories (kcal)</label>
        <input class="input-field" id="food-kcal" type="number" placeholder="0" />
      </div>
      <button class="btn btn-primary btn-block" id="food-save">Save</button>
    `;
  }
  container.appendChild(card);

  // Recent meals
  const recent = await store.mealsInRange(currentDate, currentDate);
  if (recent.length > 0) {
    const recentCard = document.createElement('div');
    recentCard.className = 'glass-card';
    recentCard.innerHTML = `
      <div class="card-title" style="margin-bottom:8px">Today's entries</div>
      ${recent.map(m => `
        <div class="meal-item">
          <span class="meal-desc">${escapeHTML(m.description || m.mealType)}</span>
          <span class="meal-kcal">${m.kcal || 0} kcal</span>
          <button class="delete-btn" data-id="${m.id}">✕</button>
        </div>
      `).join('')}
    `;
    container.appendChild(recentCard);

    recentCard.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = async () => {
        await store.deleteMeal(Number(btn.dataset.id));
        render(container, 'food');
      };
    });
  }

  // Event handlers
  card.querySelector('#food-prev').onclick = () => { currentDate.setDate(currentDate.getDate() - 1); render(container, 'food'); };
  card.querySelector('#food-next').onclick = () => { currentDate.setDate(currentDate.getDate() + 1); render(container, 'food'); };

  card.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.onclick = () => { foodMode = btn.dataset.mode; render(container, 'food'); };
  });
  card.querySelectorAll('.meal-type-btn').forEach(btn => {
    btn.onclick = () => { mealType = btn.dataset.type; render(container, 'food'); };
  });

  // Snack mode handlers
  if (foodMode === 'Snack') {
    card.querySelectorAll('.snack-option').forEach(opt => {
      opt.onclick = async () => {
        const idx = Number(opt.dataset.snackIdx);
        const snack = SNACK_DEFAULTS[idx];
        if (snack.name === 'Custom') {
          // Show custom fields
          card.querySelector('#snack-custom-fields').classList.remove('hidden');
          card.querySelector('.snack-grid').classList.add('hidden');
          return;
        }
        // Quick save preset snack
        await store.addMeal({
          date: currentDate,
          mealType: 'Snack',
          description: snack.name,
          kcal: snack.kcal
        });
        showToast('✓ Snack logged');
        render(container, 'food');
      };
    });
  }

  const saveBtn = card.querySelector('#food-save');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const desc = card.querySelector('#food-desc').value.trim().slice(0, 500);
      const kcal = Math.max(0, Math.min(99999, parseInt(card.querySelector('#food-kcal').value) || 0));
      if (!desc && kcal === 0) return;
      await store.addMeal({
        date: currentDate,
        mealType: foodMode === 'Snack' ? 'Snack' : mealType,
        description: desc || (foodMode === 'Snack' ? 'Snack' : mealType),
        kcal
      });
      showToast('✓ Saved');
      render(container, 'food');
    };
  }
}

async function renderDrink() {
  const card = document.createElement('div');
  card.className = 'glass-card';

  const types = ['Beer', 'Wine', 'Spirit', 'Cocktail', 'Cider', 'Other'];
  const icons = { Beer: '🍺', Wine: '🍷', Spirit: '🥃', Cocktail: '🍸', Cider: '🍏', Other: '🥤' };

  const unitVal = (store.DRINK_UNITS[drinkType] ?? 1.0) * drinkQty;
  const kcalVal = (store.DRINK_KCAL[drinkType] ?? 100) * drinkQty;

  card.innerHTML = `
    <div class="date-nav">
      <button class="nav-arrow" id="drink-prev">‹</button>
      <span class="date-label">${formatDate(currentDate)}</span>
      <button class="nav-arrow" id="drink-next">›</button>
    </div>
    <div class="drink-grid">
      ${types.map(t => `
        <div class="drink-option ${drinkType === t ? 'selected' : ''}" data-type="${t}">
          <span class="drink-icon">${icons[t]}</span>
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
    <button class="btn btn-primary btn-block" id="drink-add">Add drink</button>
  `;
  container.appendChild(card);

  card.querySelector('#drink-prev').onclick = () => { currentDate.setDate(currentDate.getDate() - 1); render(container, 'drink'); };
  card.querySelector('#drink-next').onclick = () => { currentDate.setDate(currentDate.getDate() + 1); render(container, 'drink'); };

  card.querySelectorAll('.drink-option').forEach(opt => {
    opt.onclick = () => { drinkType = opt.dataset.type; drinkQty = 1; render(container, 'drink'); };
  });
  card.querySelector('#drink-minus').onclick = () => { if (drinkQty > 1) drinkQty--; render(container, 'drink'); };
  card.querySelector('#drink-plus').onclick = () => { drinkQty++; render(container, 'drink'); };

  card.querySelector('#drink-add').onclick = async () => {
    await store.addDrink({ date: currentDate, drinkType, quantity: drinkQty });
    showToast('✓ Drink added');
    drinkQty = 1;
    render(container, 'drink');
  };
}

async function renderWeight() {
  const card = document.createElement('div');
  card.className = 'glass-card';

  card.innerHTML = `
    <div class="date-nav">
      <button class="nav-arrow" id="wt-prev">‹</button>
      <span class="date-label">${formatDate(currentDate)}</span>
      <button class="nav-arrow" id="wt-next">›</button>
    </div>
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

  // Recent entries
  const all = await store.getWeights();
  const recentEntries = all.slice(0, 10);
  if (recentEntries.length > 0) {
    const recentCard = document.createElement('div');
    recentCard.className = 'glass-card';
    recentCard.innerHTML = `
      <div class="card-title" style="margin-bottom:8px">Recent</div>
      <div class="recent-list">
        ${recentEntries.map(w => `
          <div class="recent-item">
            <span class="recent-date">${shortDate(new Date(w.date))}</span>
            <span class="recent-value">${w.value.toFixed(1)} kg</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(recentCard);
  }

  card.querySelector('#wt-prev').onclick = () => { currentDate.setDate(currentDate.getDate() - 1); render(container, 'weight'); };
  card.querySelector('#wt-next').onclick = () => { currentDate.setDate(currentDate.getDate() + 1); render(container, 'weight'); };
  card.querySelector('#wt-down').onclick = () => { weightValue = Math.max(40, weightValue - 0.1); card.querySelector('#wt-val').textContent = weightValue.toFixed(1); };
  card.querySelector('#wt-up').onclick = () => { weightValue = Math.min(200, weightValue + 0.1); card.querySelector('#wt-val').textContent = weightValue.toFixed(1); };

  card.querySelector('#wt-save').onclick = async () => {
    await store.addWeight({ date: currentDate, value: weightValue });
    showToast('✓ Weight saved');
    render(container, 'weight');
  };
}
