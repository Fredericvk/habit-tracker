import Dexie from 'dexie';
import dexieCloud from 'dexie-cloud-addon';

const db = new Dexie('HabitTrackerDB', { addons: [dexieCloud] });

db.version(1).stores({
  goals: '@id, type, isActive',
  meals: '@id, date, mealType',
  workouts: '@id, date, type',
  drinks: '@id, date, drinkType',
  weights: '@id, date',
  badges: '@id, tracker, weeksRequired'
});

db.cloud.configure({
  databaseUrl: 'https://zyhn1vsnm.dexie.cloud',
  requireAuth: true
});

export default db;
