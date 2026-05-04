import { app } from '@azure/functions';
import crypto from 'crypto';

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const APP_URL = process.env.APP_URL;

if (!CLIENT_ID || !APP_URL) {
  throw new Error('Missing required env vars: STRAVA_CLIENT_ID, APP_URL');
}

app.http('strava-auth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'strava/auth',
  handler: async (request, context) => {
    const redirectUri = `${APP_URL}/api/strava/callback`;
    const scope = 'activity:read_all';

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    const authUrl = new URL(STRAVA_AUTH_URL);
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('approval_prompt', 'auto');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    return {
      status: 302,
      headers: {
        Location: authUrl.toString(),
        'Set-Cookie': `strava_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/api/strava`
      }
    };
  }
});
