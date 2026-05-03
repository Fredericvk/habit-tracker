import db from './db.js';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, daysInWeek } from './dateHelper.js';

// Drink defaults
export const DRINK_UNITS = { Beer: 2.3, Wine: 2.1, Spirit: 1.0, Cocktail: 2.0, Cider: 2.6 };
export const DRINK_KCAL  = { Beer: 200, Wine: 158, Spirit: 61, Cocktail: 180, Cider: 210 };

// ===== MEALS =====
export async function addMeal(meal) {
  const kcal = Math.max(0, Math.min(99999, parseInt(meal.kcal) || 0));
  const desc = String(meal.description || '').slice(0, 500);
  const mealType = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(meal.mealType) ? meal.mealType : 'Other';
  return db.meals.add({
    date: startOfDay(meal.date).getTime(),
    mealType,
    description: desc,
    kcal,
    inputMethod: meal.inputMethod || 'manual'
  });
}
export async function getMeals() { return db.meals.toArray(); }
export async function deleteMeal(id) { return db.meals.delete(id); }
export async function mealsInRange(start, end) {
  return db.meals.where('date').between(startOfDay(start).getTime(), endOfDay(end).getTime(), true, true).toArray();
}

// ===== WORKOUTS =====
export async function addWorkout(workout) {
  const validTypes = ['Run', 'Gym', 'Walk', 'Cycle', 'Swim', 'HIIT'];
  const type = validTypes.includes(workout.type) ? workout.type : 'Run';
  const duration = Math.max(0, Math.min(999, parseInt(workout.duration) || 0));
  const kcal = Math.max(0, Math.min(9999, parseInt(workout.kcal) || 0));
  const notes = String(workout.notes || '').slice(0, 200);
  return db.workouts.add({
    date: startOfDay(workout.date).getTime(),
    type,
    duration,
    kcal,
    notes
  });
}
export async function getWorkouts() { return db.workouts.toArray(); }
export async function deleteWorkout(id) { return db.workouts.delete(id); }
export async function workoutsInRange(start, end) {
  return db.workouts.where('date').between(startOfDay(start).getTime(), endOfDay(end).getTime(), true, true).toArray();
}

// ===== DRINKS =====
export async function addDrink(drink) {
  const validTypes = ['Beer', 'Wine', 'Spirit', 'Cocktail', 'Cider', 'Other'];
  const drinkType = validTypes.includes(drink.drinkType) ? drink.drinkType : 'Other';
  const quantity = Math.max(1, Math.min(99, parseInt(drink.quantity) || 1));
  const units = DRINK_UNITS[drinkType] ?? 1.0;
  const kcal = DRINK_KCAL[drinkType] ?? 100;
  return db.drinks.add({
    date: startOfDay(drink.date).getTime(),
    drinkType,
    quantity,
    units: units * quantity,
    kcal: kcal * quantity
  });
}
export async function getDrinks() { return db.drinks.toArray(); }
export async function deleteDrink(id) { return db.drinks.delete(id); }
export async function drinksInRange(start, end) {
  return db.drinks.where('date').between(startOfDay(start).getTime(), endOfDay(end).getTime(), true, true).toArray();
}

// ===== WEIGHTS =====
export async function addWeight(entry) {
  const value = Math.max(20, Math.min(500, parseFloat(entry.value) || 0));
  return db.weights.add({
    date: startOfDay(entry.date).getTime(),
    value
  });
}
export async function getWeights() { return db.weights.orderBy('date').reverse().toArray(); }
export async function deleteWeight(id) { return db.weights.delete(id); }
export async function weightsInRange(start, end) {
  return db.weights.where('date').between(startOfDay(start).getTime(), endOfDay(end).getTime(), true, true).toArray();
}

// ===== GOALS =====
export async function getGoals() { return db.goals.toArray(); }
export async function getGoal(type) { return db.goals.where('type').equals(type).first(); }
export async function updateGoal(id, changes) {
  const sanitized = {};
  if (changes.target != null) sanitized.target = Math.max(0, Math.min(99999, parseFloat(changes.target) || 0));
  if (changes.startDate != null) sanitized.startDate = parseInt(changes.startDate) || Date.now();
  if (changes.endDate != null) sanitized.endDate = parseInt(changes.endDate) || Date.now();
  if (changes.title != null) sanitized.title = String(changes.title).slice(0, 100);
  if (changes.daysPerWeek != null) sanitized.daysPerWeek = Math.max(1, Math.min(7, parseInt(changes.daysPerWeek) || 5));
  if (changes.dailyTarget != null) sanitized.dailyTarget = Math.max(0, Math.min(99999, parseInt(changes.dailyTarget) || 2300));
  if (changes.workoutsPerWeek != null) sanitized.workoutsPerWeek = Math.max(0, Math.min(7, parseInt(changes.workoutsPerWeek) || 4));
  if (changes.walksPerWeek != null) sanitized.walksPerWeek = Math.max(0, Math.min(7, parseInt(changes.walksPerWeek) || 3));
  if (changes.walkMinDuration != null) sanitized.walkMinDuration = Math.max(5, Math.min(300, parseInt(changes.walkMinDuration) || 30));
  return db.goals.update(id, sanitized);
}
export async function addGoal(goal) {
  const title = String(goal.title || '').slice(0, 100);
  const target = Math.max(0, Math.min(99999, parseFloat(goal.target) || 0));
  return db.goals.add({
    ...goal,
    title,
    target
  });
}

// ===== BADGES =====
export async function getBadges() { return db.badges.toArray(); }
export async function addBadge(badge) { return db.badges.add(badge); }

// ===== CALCULATIONS =====
export async function totalCaloriesForDay(date) {
  const meals = await mealsInRange(date, date);
  return meals.reduce((sum, m) => sum + (m.kcal || 0), 0);
}

export async function avgCaloriesForWeek(weekStart) {
  const days = daysInWeek(weekStart);
  let total = 0;
  let count = 0;
  for (const day of days) {
    const cal = await totalCaloriesForDay(day);
    if (cal > 0) { total += cal; count++; }
  }
  return count > 0 ? Math.round(total / count) : 0;
}

export async function activeDaysForWeek(weekStart) {
  const ws = await workoutsInRange(weekStart, endOfWeek(weekStart));
  const daySet = new Set(ws.map(w => startOfDay(new Date(w.date)).getTime()));
  return daySet.size;
}

export async function cleanWeekdaysForWeek(weekStart) {
  const today = new Date();
  const days = daysInWeek(weekStart).filter(d => startOfDay(d) <= startOfDay(today));
  let clean = 0;
  for (const day of days) {
    const meals = await mealsInRange(day, day);
    const hasSnack = meals.some(m => m.mealType === 'Snack');
    if (!hasSnack) clean++;
  }
  return clean;
}

export async function totalUnitsForWeek(weekStart) {
  const drinks = await drinksInRange(weekStart, endOfWeek(weekStart));
  return drinks.reduce((sum, d) => sum + (d.units || 0), 0);
}

export async function totalAlcoholKcalForWeek(weekStart) {
  const drinks = await drinksInRange(weekStart, endOfWeek(weekStart));
  return drinks.reduce((sum, d) => sum + (d.kcal || 0), 0);
}

// Count days in a week where total calories ≤ target
export async function daysUnderCalorieTarget(weekStart, dailyTarget) {
  const days = daysInWeek(weekStart);
  let count = 0;
  for (const day of days) {
    const cal = await totalCaloriesForDay(day);
    if (cal > 0 && cal <= dailyTarget) count++;
  }
  return count;
}

// Count non-walk workout days in a week
export async function workoutDaysForWeek(weekStart) {
  const ws = await workoutsInRange(weekStart, endOfWeek(weekStart));
  const daySet = new Set();
  for (const w of ws) {
    if (w.type !== 'Walk') daySet.add(startOfDay(new Date(w.date)).getTime());
  }
  return daySet.size;
}

// Count walk days (≥ minDuration) in a week
export async function walkDaysForWeek(weekStart, minDuration = 30) {
  const ws = await workoutsInRange(weekStart, endOfWeek(weekStart));
  const daySet = new Set();
  for (const w of ws) {
    if (w.type === 'Walk' && (w.duration || 0) >= minDuration) {
      daySet.add(startOfDay(new Date(w.date)).getTime());
    }
  }
  return daySet.size;
}
