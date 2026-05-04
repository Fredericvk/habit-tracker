import Dexie from 'dexie';
import dexieCloud from 'dexie-cloud-addon';

const ALLOWED_EMAILS = ['frederic.vankelecom@gmail.com'];

const db = new Dexie('HabitTrackerDB', { addons: [dexieCloud] });

db.version(1).stores({
  goals: '@id, type, isActive',
  meals: '@id, date, mealType',
  workouts: '@id, date, type, stravaId',
  drinks: '@id, date, drinkType',
  weights: '@id, date',
  badges: '@id, tracker, weeksRequired',
  stravaTokens: '@id'
});

db.cloud.configure({
  databaseUrl: 'https://zyhn1vsnm.dexie.cloud',
  requireAuth: true,
  customLoginGui: false
});

// Block unauthorized users after login
db.cloud.events.syncComplete.subscribe(() => {
  const user = db.cloud.currentUser?.value;
  if (user?.email && !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
    db.cloud.logout();
    alert('Access denied. This app is private.');
  }
});

export default db;
