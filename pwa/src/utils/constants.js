// Shared constants used across multiple screens

export const MEAL_ICONS = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snack: '🍿', Other: '🍽️' };

export const WORKOUT_ICONS = { Run: '🏃', Gym: '🏋️', Walk: '🚶', Cycle: '🚴', Swim: '🏊', HIIT: '🔥' };

export const DRINK_ICONS = { Beer: '🍺', Wine: '🍷', Spirit: '🥃', Cocktail: '🍸', Cider: '🍏', Other: '🥤' };

export const SNACK_EMOJIS = { Cookie: '🍪', Chocolate: '🍫', Nuts: '🥜', Crisps: '🥨', Candy: '🍬' };

export const CAL_PER_MIN = { Run: 10, Gym: 8, Walk: 4, Cycle: 9, Swim: 11, HIIT: 12 };

export function snackEmoji(desc) {
  for (const [key, emoji] of Object.entries(SNACK_EMOJIS)) {
    if (desc && desc.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🍿';
}
