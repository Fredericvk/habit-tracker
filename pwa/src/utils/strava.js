import * as store from '../store.js';

/**
 * Handles the Strava OAuth callback tokens from URL fragment.
 * Called on app load to check if we just returned from Strava OAuth.
 */
export function handleStravaCallback() {
  const hash = window.location.hash;
  if (!hash.includes('strava_tokens=')) return false;

  try {
    const encoded = hash.split('strava_tokens=')[1];
    const tokens = JSON.parse(decodeURIComponent(encoded));

    store.saveStravaTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      athlete_id: tokens.athlete,
      lastSync: null
    });

    // Clean up URL
    window.history.replaceState(null, '', window.location.pathname);
    return true;
  } catch (e) {
    console.error('Failed to parse Strava tokens:', e);
    return false;
  }
}

/**
 * Syncs Strava activities to local workouts.
 * Deduplicates by stravaId — won't create duplicates.
 * Returns { synced: number, error?: string }
 */
export async function syncStravaActivities() {
  const tokens = await store.getStravaTokens();
  if (!tokens?.access_token) return { synced: 0, error: 'not_connected' };

  const lastSync = tokens.lastSync || null;
  // Always look back at least 7 days to catch updates to existing activities
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const after = lastSync ? Math.min(lastSync, sevenDaysAgo) : sevenDaysAgo;

  try {
    const res = await fetch('/api/strava/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        after
      })
    });

    if (res.status === 401) {
      await store.clearStravaTokens();
      return { synced: 0, error: 'unauthorized' };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { synced: 0, error: err.error || 'sync_failed' };
    }

    const data = await res.json();

    // Save refreshed tokens if returned
    if (data.tokensRefreshed) {
      await store.saveStravaTokens({
        ...tokens,
        ...data.tokensRefreshed
      });
    }

    // Deduplicate and save/update workouts
    let synced = 0;
    for (const workout of data.workouts) {
      const existing = await store.getWorkoutByStravaId(workout.stravaId);
      if (existing) {
        // Update kcal if it was missing before
        if (workout.kcal && !existing.kcal) {
          await store.updateWorkout(existing.id, { kcal: workout.kcal });
          synced++;
        }
      } else {
        // Also check for duplicate by date+type+duration (legacy entries without stravaId)
        const dateObj = new Date(workout.date);
        const dayWorkouts = await store.workoutsInRange(dateObj, dateObj);
        const duplicate = dayWorkouts.find(w =>
          w.type === workout.type &&
          Math.abs(w.duration - workout.duration) <= 1 &&
          w.source === 'strava'
        );
        if (!duplicate) {
          await store.addWorkout({
            date: dateObj,
            type: workout.type,
            duration: workout.duration,
            distance: workout.distance || 0,
            kcal: workout.kcal || 0,
            notes: '',
            source: 'strava',
            stravaId: workout.stravaId
          });
          synced++;
        } else if (!duplicate.stravaId) {
          // Backfill stravaId on legacy entry
          await store.updateWorkout(duplicate.id, { stravaId: workout.stravaId, kcal: workout.kcal || duplicate.kcal, distance: workout.distance || 0 });
        }
      }
    }

    // Update last sync timestamp
    await store.updateStravaSyncTime(Math.floor(Date.now() / 1000));

    return { synced };
  } catch (e) {
    console.error('Strava sync error:', e);
    return { synced: 0, error: 'network_error' };
  }
}

/**
 * Checks if Strava is connected.
 */
export async function isStravaConnected() {
  const tokens = await store.getStravaTokens();
  return !!tokens?.access_token;
}

/**
 * Disconnects Strava (clears tokens locally).
 */
export async function disconnectStrava() {
  await store.clearStravaTokens();
}
