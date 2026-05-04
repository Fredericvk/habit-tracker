import { app } from '@azure/functions';
import { getClientSecret } from '../lib/keyvault.js';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';
const CLIENT_ID = process.env.STRAVA_CLIENT_ID || '130728';

// Map Strava sport_type to app workout types
const SPORT_TYPE_MAP = {
  Run: 'Run', TrailRun: 'Run', VirtualRun: 'Run',
  Ride: 'Cycle', MountainBikeRide: 'Cycle', GravelRide: 'Cycle', VirtualRide: 'Cycle',
  Swim: 'Swim',
  WeightTraining: 'Gym', CrossFit: 'Gym', Crossfit: 'Gym',
  Walk: 'Walk', Hike: 'Walk',
  HighIntensityIntervalTraining: 'HIIT', Workout: 'HIIT',
};

function mapSportType(sportType) {
  return SPORT_TYPE_MAP[sportType] || 'HIIT';
}

app.http('strava-sync', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'strava/sync',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      let { access_token, refresh_token, expires_at, after } = body;

      if (!access_token || !refresh_token) {
        return { status: 400, jsonBody: { error: 'Missing tokens' } };
      }

      // Refresh token if expired
      let tokensRefreshed = null;
      if (expires_at && Date.now() / 1000 >= expires_at - 60) {
        const clientSecret = await getClientSecret();
        const refreshRes = await fetch(STRAVA_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token
          })
        });

        if (!refreshRes.ok) {
          return { status: 401, jsonBody: { error: 'Token refresh failed' } };
        }

        const refreshData = await refreshRes.json();
        access_token = refreshData.access_token;
        tokensRefreshed = {
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: refreshData.expires_at
        };
      }

      // Fetch activities since last sync (default: last 30 days)
      const sinceEpoch = after || Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
      const activitiesUrl = `${STRAVA_ACTIVITIES_URL}?after=${sinceEpoch}&per_page=100`;

      const activitiesRes = await fetch(activitiesUrl, {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      if (!activitiesRes.ok) {
        const status = activitiesRes.status;
        if (status === 401) {
          return { status: 401, jsonBody: { error: 'Unauthorized — reconnect Strava' } };
        }
        if (status === 429) {
          return { status: 429, jsonBody: { error: 'Rate limited — try again later' } };
        }
        return { status: 502, jsonBody: { error: 'Failed to fetch activities' } };
      }

      const activities = await activitiesRes.json();

      // Map to app format
      const workouts = activities.map(a => ({
        stravaId: String(a.id),
        date: a.start_date_local.split('T')[0],
        type: mapSportType(a.sport_type || a.type),
        duration: Math.round(a.moving_time / 60),
        kcal: a.calories ? Math.round(a.calories) : null,
        notes: a.name,
        source: 'strava'
      }));

      return {
        status: 200,
        jsonBody: {
          workouts,
          tokensRefreshed
        }
      };
    } catch (err) {
      context.log(`Strava sync error: ${err.message}`);
      return { status: 500, jsonBody: { error: 'Internal error' } };
    }
  }
});
