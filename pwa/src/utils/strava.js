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

  const lastSync = tokens.lastSync || Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  try {
    const res = await fetch('/api/strava/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        after: lastSync
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

    // Deduplicate and save new workouts
    let synced = 0;
    for (const workout of data.workouts) {
      const existing = await store.getWorkoutByStravaId(workout.stravaId);
      if (!existing) {
        await store.addWorkout({
          date: new Date(workout.date),
          type: workout.type,
          duration: workout.duration,
          kcal: workout.kcal || 0,
          notes: workout.notes || '',
          source: 'strava',
          stravaId: workout.stravaId
        });
        synced++;
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
