import { getGoals, addGoal } from './store.js';
import { startOfWeek } from './dateHelper.js';

const SEEDER_KEY = 'habitTrackerDefaultsSeeded';

export async function seedDefaults() {
  // Skip on return visits to avoid creating duplicates when cloud sync
  // hasn't completed yet (local IndexedDB may appear empty at boot).
  if (localStorage.getItem(SEEDER_KEY)) return;

  const existing = await getGoals();
  if (existing.length > 0) {
    localStorage.setItem(SEEDER_KEY, 'true');
    return;
  }

  const now = new Date();
  const monday = startOfWeek(now);
  const eightWeeks = new Date(monday);
  eightWeeks.setDate(eightWeeks.getDate() + 8 * 7);
  const threeMonths = new Date(monday);
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  const defaults = [
    {
      type: 'calories',
      title: 'Calories',
      icon: '🔥',
      daysPerWeek: 5,
      dailyTarget: 2300,
      unit: 'days under target',
      startDate: monday.getTime(),
      endDate: eightWeeks.getTime(),
      isActive: 1
    },
    {
      type: 'exercise',
      title: 'Exercise',
      icon: '💪',
      workoutsPerWeek: 4,
      walksPerWeek: 3,
      walkMinDuration: 30,
      unit: 'workouts + walks',
      startDate: monday.getTime(),
      endDate: eightWeeks.getTime(),
      isActive: 1
    },
    {
      type: 'snacking',
      title: 'No Snacking',
      icon: '🍎',
      target: 5,
      unit: 'clean weekdays/week',
      comparison: 'gte',
      startDate: monday.getTime(),
      endDate: eightWeeks.getTime(),
      isActive: 1
    },
    {
      type: 'alcohol',
      title: 'Alcohol',
      icon: '🍺',
      target: 17,
      unit: 'units/week',
      comparison: 'lte',
      startDate: monday.getTime(),
      endDate: eightWeeks.getTime(),
      isActive: 1
    },
    {
      type: 'weight',
      title: 'Weight',
      icon: '⚖️',
      target: 93.0,
      unit: 'kg',
      startDate: monday.getTime(),
      endDate: threeMonths.getTime(),
      isActive: 1
    }
  ];

  for (const goal of defaults) {
    await addGoal(goal);
  }
  localStorage.setItem(SEEDER_KEY, 'true');
}
