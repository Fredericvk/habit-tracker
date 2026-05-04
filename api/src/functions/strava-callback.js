import { app } from '@azure/functions';
import crypto from 'crypto';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const APP_URL = process.env.APP_URL;
const SYNC_SECRET = process.env.SYNC_SECRET || crypto.randomBytes(32).toString('hex');

if (!CLIENT_ID || !CLIENT_SECRET || !APP_URL) {
  throw new Error('Missing required env vars: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, APP_URL');
}

app.http('strava-callback', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'strava/callback',
  handler: async (request, context) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error || !code) {
      return {
        status: 302,
        headers: { Location: `${APP_URL}?strava_error=${error || 'no_code'}` }
      };
    }

    // Verify CSRF state from cookie
    const cookies = request.headers.get('cookie') || '';
    const stateMatch = cookies.match(/strava_state=([a-f0-9]+)/);
    if (!stateMatch || stateMatch[1] !== state) {
      context.log('OAuth state mismatch — possible CSRF');
      return {
        status: 302,
        headers: { Location: `${APP_URL}?strava_error=invalid_state` }
      };
    }

    try {
      const tokenRes = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenRes.ok) {
        context.log('Strava token exchange failed');
        return {
          status: 302,
          headers: { Location: `${APP_URL}?strava_error=token_exchange_failed` }
        };
      }

      const tokenData = await tokenRes.json();

      // Generate an HMAC-signed sync token to authenticate future sync requests
      const athleteId = String(tokenData.athlete?.id || '');
      const syncToken = crypto.createHmac('sha256', SYNC_SECRET)
        .update(athleteId)
        .digest('hex');

      const fragment = encodeURIComponent(JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        athlete: tokenData.athlete?.id,
        sync_token: syncToken
      }));

      return {
        status: 302,
        headers: {
          Location: `${APP_URL}?strava_connected=1#strava_tokens=${fragment}`,
          'Set-Cookie': 'strava_state=; HttpOnly; Secure; Max-Age=0; Path=/api/strava'
        }
      };
    } catch (err) {
      context.log(`Strava callback error: ${err.message}`);
      return {
        status: 302,
        headers: { Location: `${APP_URL}?strava_error=internal` }
      };
    }
  }
});
