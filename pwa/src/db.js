import Dexie from 'dexie';

const db = new Dexie('HabitTrackerDB');

db.version(1).stores({
  goals: '++id, type, isActive',
  meals: '++id, date, mealType',
  workouts: '++id, date, type',
  drinks: '++id, date, drinkType',
  weights: '++id, date',
  badges: '++id, tracker, weeksRequired'
});

export default db;
