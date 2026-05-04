import { app } from '@azure/functions';
import { getClientSecret } from '../lib/keyvault.js';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const CLIENT_ID = process.env.STRAVA_CLIENT_ID || '130728';
const APP_URL = process.env.APP_URL || 'https://mango-bay-04f757203.7.azurestaticapps.net';

app.http('strava-callback', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'strava/callback',
  handler: async (request, context) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error || !code) {
      return {
        status: 302,
        headers: { Location: `${APP_URL}?strava_error=${error || 'no_code'}` }
      };
    }

    try {
      const clientSecret = await getClientSecret();

      const tokenRes = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code'
        })
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        context.log(`Strava token exchange failed: ${errBody}`);
        return {
          status: 302,
          headers: { Location: `${APP_URL}?strava_error=token_exchange_failed` }
        };
      }

      const tokenData = await tokenRes.json();
      // Pass tokens to frontend via URL fragment (not query string — fragments aren't sent to server)
      const fragment = encodeURIComponent(JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        athlete: tokenData.athlete?.id
      }));

      return {
        status: 302,
        headers: { Location: `${APP_URL}?strava_connected=1#strava_tokens=${fragment}` }
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
