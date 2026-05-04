import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

let cachedSecret = null;
let cacheExpiry = 0;

const VAULT_URL = process.env.KEY_VAULT_URL;
const SECRET_NAME = 'strava-client-secret';

/**
 * Retrieves the Strava client secret from Azure Key Vault.
 * Falls back to env var for local development.
 * Caches for 1 hour to minimize Key Vault calls.
 */
export async function getClientSecret() {
  // Local dev fallback
  if (!VAULT_URL) {
    const envSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!envSecret || envSecret === 'SET_VIA_KEYVAULT') {
      throw new Error('STRAVA_CLIENT_SECRET not configured and KEY_VAULT_URL not set');
    }
    return envSecret;
  }

  // Return cached value if still valid
  if (cachedSecret && Date.now() < cacheExpiry) {
    return cachedSecret;
  }

  const credential = new DefaultAzureCredential();
  const client = new SecretClient(VAULT_URL, credential);
  const secret = await client.getSecret(SECRET_NAME);

  cachedSecret = secret.value;
  cacheExpiry = Date.now() + 60 * 60 * 1000; // 1 hour cache

  return cachedSecret;
}
