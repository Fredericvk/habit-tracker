import { app } from '@azure/functions';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';
const CLIENT_ID = process.env.STRAVA_CLIENT_ID || '130728';
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

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
        const refreshRes = await fetch(STRAVA_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
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

      // Fetch detailed data for each activity to get accurate calories
      const workouts = [];
      for (const a of activities) {
        let kcal = a.calories ? Math.round(a.calories) : 0;

        // If no calories in summary, fetch detailed activity
        if (!kcal) {
          try {
            const detailRes = await fetch(`https://www.strava.com/api/v3/activities/${a.id}`, {
              headers: { Authorization: `Bearer ${access_token}` }
            });
            if (detailRes.ok) {
              const detail = await detailRes.json();
              kcal = detail.calories ? Math.round(detail.calories) : 0;
            }
          } catch (e) {
            context.log(`Failed to fetch detail for activity ${a.id}: ${e.message}`);
          }
        }

        workouts.push({
          stravaId: String(a.id),
          date: a.start_date_local.split('T')[0],
          type: mapSportType(a.sport_type || a.type),
          duration: Math.round(a.moving_time / 60),
          distance: a.distance ? Math.round(a.distance) : 0,
          kcal,
          notes: '',
          source: 'strava'
        });
      }

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
