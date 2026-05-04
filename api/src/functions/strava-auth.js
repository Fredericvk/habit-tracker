import { app } from '@azure/functions';

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const CLIENT_ID = process.env.STRAVA_CLIENT_ID || '130728';
const APP_URL = process.env.APP_URL || 'https://mango-bay-04f757203.7.azurestaticapps.net';

app.http('strava-auth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'strava/auth',
  handler: async (request, context) => {
    const redirectUri = `${APP_URL}/api/strava/callback`;
    const scope = 'activity:read_all';

    const authUrl = new URL(STRAVA_AUTH_URL);
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('approval_prompt', 'auto');
    authUrl.searchParams.set('scope', scope);

    return { status: 302, headers: { Location: authUrl.toString() } };
  }
});
