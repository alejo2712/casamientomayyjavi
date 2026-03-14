'use strict';

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Readable } = require('stream');

// ---------------------------------------------------------------
// CONFIGURATION — all values come from environment variables
// ---------------------------------------------------------------

const CLIENT_ID      = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET  = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI   = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Local file where the refresh token is persisted after the OAuth flow
const TOKENS_PATH = path.join(__dirname, 'tokens.json');

// ---------------------------------------------------------------
// Shared OAuth2 client — one instance for the whole process
// ---------------------------------------------------------------

let _client = null;

/**
 * Return the singleton OAuth2 client.
 * Initialised once on first call; reused on every subsequent call.
 */
function getOAuthClient() {
  if (_client) return _client;

  if (!CLIENT_ID)     throw new Error('Missing env var: GOOGLE_CLIENT_ID');
  if (!CLIENT_SECRET) throw new Error('Missing env var: GOOGLE_CLIENT_SECRET');

  _client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  // --- Refresh token priority: env var → tokens.json → nothing ---

  const envToken = process.env.GOOGLE_REFRESH_TOKEN;
  const envTokenIsReal = envToken && envToken !== 'your_refresh_token_here';

  if (envTokenIsReal) {
    _client.setCredentials({ refresh_token: envToken });
    console.log('[Drive] Refresh token loaded from environment variable');
    console.log('[Drive] OAuth2 client initialised');
  } else if (fs.existsSync(TOKENS_PATH)) {
    try {
      const stored = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
      if (stored.refresh_token) {
        _client.setCredentials({ refresh_token: stored.refresh_token });
        console.log('[Drive] Refresh token loaded from tokens.json');
        console.log('[Drive] OAuth2 client initialised');
      } else {
        console.warn('[Drive] tokens.json exists but has no refresh_token');
        console.warn('[Drive] No refresh token found — visit http://localhost:3000/auth/google to authorize');
      }
    } catch (e) {
      console.warn('[Drive] Could not parse tokens.json:', e.message);
      console.warn('[Drive] No refresh token found — visit http://localhost:3000/auth/google to authorize');
    }
  } else {
    console.warn('[Drive] No refresh token found — visit http://localhost:3000/auth/google to authorize');
  }

  console.log('[Drive] Target folder ID:', DRIVE_FOLDER_ID);

  return _client;
}

/**
 * Save a new refresh token to the live client and persist it to tokens.json.
 * Called by the /oauth2callback route after a successful authorization.
 *
 * @param {string} refreshToken
 */
function setRefreshToken(refreshToken) {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  fs.writeFileSync(
    TOKENS_PATH,
    JSON.stringify({ refresh_token: refreshToken }, null, 2),
    'utf8'
  );

  console.log('[Drive] Refresh token saved to', TOKENS_PATH);
  console.log('[Drive] Refresh token loaded successfully');
}

// ---------------------------------------------------------------
// Upload
// ---------------------------------------------------------------

/**
 * Upload an image buffer to the configured Google Drive folder.
 *
 * @param {Buffer}  fileBuffer
 * @param {string}  filename
 * @param {string}  mimeType
 * @returns {Promise<string>} Google Drive file ID
 */
async function uploadToDrive(fileBuffer, filename, mimeType) {
  if (!DRIVE_FOLDER_ID) throw new Error('Missing env var: DRIVE_FOLDER_ID');

  const auth  = getOAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  console.log(`[Drive] Uploading "${filename}" (${(fileBuffer.length / 1024).toFixed(1)} KB) ...`);

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id, name',
  });

  const fileId = response.data.id;
  console.log(`[Drive] Upload complete — file ID: ${fileId}`);

  return fileId;
}

/**
 * Returns true if a usable refresh token is already available
 * (either in the env var or in tokens.json), false otherwise.
 * Does NOT build the OAuth client — safe to call at any time.
 */
function refreshTokenExists() {
  const envToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (envToken && envToken !== 'your_refresh_token_here') return true;

  if (fs.existsSync(TOKENS_PATH)) {
    try {
      const stored = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
      return Boolean(stored.refresh_token);
    } catch (_) {
      return false;
    }
  }

  return false;
}

module.exports = { getOAuthClient, setRefreshToken, refreshTokenExists, uploadToDrive };
