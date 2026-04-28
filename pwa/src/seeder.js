import { getGoals, addGoal } from './store.js';
import { startOfWeek } from './dateHelper.js';

export async function seedDefaults() {
  const existing = await getGoals();
  if (existing.length > 0) return;

  const now = new Date();
  const monday = startOfWeek(now);
  const twoMonths = new Date(monday);
  twoMonths.setMonth(twoMonths.getMonth() + 2);
  const threeMonths = new Date(monday);
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  const defaults = [
    {
      type: 'calories',
      title: 'Calories',
      icon: '🔥',
      target: 2300,
      unit: 'kcal/day',
      comparison: 'lte',
      startDate: monday.getTime(),
      endDate: twoMonths.getTime(),
      isActive: 1
    },
    {
      type: 'exercise',
      title: 'Exercise',
      icon: '💪',
      target: 7,
      unit: 'active days/week',
      comparison: 'gte',
      note: '4 workouts + 3 walks',
      startDate: monday.getTime(),
      endDate: twoMonths.getTime(),
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
      endDate: twoMonths.getTime(),
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
      endDate: twoMonths.getTime(),
      isActive: 1
    },
    {
      type: 'weight',
      title: 'Weight',
      icon: '⚖️',
      target: 93.0,
      unit: 'kg',
      comparison: 'lte',
      startDate: monday.getTime(),
      endDate: threeMonths.getTime(),
      isActive: 1
    }
  ];

  for (const goal of defaults) {
    await addGoal(goal);
  }
}
