import { google } from 'googleapis';

/**
 * Configure and return Google OAuth2 client with refresh token credentials
 * @returns {google.auth.OAuth2}
 */
export const getOAuth2Client = () => {
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing Gmail OAuth credentials. Ensure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are set in .env'
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
};

/**
 * Get configured Gmail API v1 client
 * @returns {import('googleapis').gmail_v1.Gmail}
 */
export const getGmailClient = () => {
  const auth = getOAuth2Client();
  return google.gmail({ version: 'v1', auth });
};

export default { getOAuth2Client, getGmailClient };
