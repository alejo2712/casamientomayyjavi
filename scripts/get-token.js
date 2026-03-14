/**
 * get-token.js
 * One-time script to generate your Google Drive refresh token.
 *
 * Usage:
 *   1. Stop the main server if it is running (Ctrl+C)
 *   2. node scripts/get-token.js
 *   3. Open the URL printed in the terminal
 *   4. Sign in with Google and click Allow
 *   5. The refresh token is saved to backend/config/tokens.json automatically
 *   6. Restart the main server: npm start
 */

'use strict';

const http   = require('http');
const path   = require('path');
const fs     = require('fs');
const { google } = require('googleapis');

// Load .env from the project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ---- Config ----
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT          = 3000;
const REDIRECT_URI  = `http://localhost:${PORT}/oauth2callback`;
const TOKENS_PATH   = path.join(__dirname, '..', 'backend', 'config', 'tokens.json');

// ---- Validate ----
if (!CLIENT_ID) {
  console.error('ERROR: GOOGLE_CLIENT_ID is not set in .env');
  process.exit(1);
}
if (!CLIENT_SECRET) {
  console.error('ERROR: GOOGLE_CLIENT_SECRET is not set in .env');
  process.exit(1);
}

// ---- Build OAuth client and auth URL ----
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',   // forces Google to return a refresh_token every time
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n========================================');
console.log('  Google Drive — Token Setup');
console.log('========================================\n');
console.log('Open this URL in your browser:\n');
console.log('  ' + authUrl);
console.log('\nSign in with your Google account and click Allow.');
console.log('This window will update automatically.\n');
console.log('Waiting for Google to redirect back...\n');

// ---- Temporary callback server ----
const server = http.createServer(async (req, res) => {
  // Ignore favicon and anything else
  if (!req.url || !req.url.startsWith('/oauth2callback')) {
    res.writeHead(204);
    res.end();
    return;
  }

  const params = new URL(req.url, `http://localhost:${PORT}`).searchParams;
  const code  = params.get('code');
  const error = params.get('error');

  if (error) {
    const msg = `Authorization denied: ${error}`;
    console.error('\n' + msg);
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(htmlPage('Authorization denied', `<p>${msg}</p>`, false));
    server.close();
    return;
  }

  if (!code) {
    const msg = 'No authorization code received from Google.';
    console.error('\n' + msg);
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(htmlPage('Error', `<p>${msg}</p>`, false));
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      const msg =
        'Google did not return a refresh token.\n' +
        'This usually means the app was already authorized before.\n' +
        'Fix: revoke access at https://myaccount.google.com/permissions then run this script again.';
      console.error('\nERROR:', msg);
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(htmlPage('No refresh token', `<pre>${msg}</pre>`, false));
      server.close();
      return;
    }

    // Save tokens.json
    fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
    fs.writeFileSync(
      TOKENS_PATH,
      JSON.stringify({ refresh_token: tokens.refresh_token }, null, 2),
      'utf8'
    );

    console.log('========================================');
    console.log('  SUCCESS');
    console.log('========================================');
    console.log('\nREFRESH TOKEN:\n');
    console.log('  ' + tokens.refresh_token);
    console.log('\nSaved to:', TOKENS_PATH);
    console.log('\nNext steps:');
    console.log('  npm start          — the server will load the token automatically');
    console.log('  (optional) paste the token into .env as GOOGLE_REFRESH_TOKEN\n');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlPage(
      'Authorization successful!',
      '<p>The refresh token has been saved to <code>backend/config/tokens.json</code>.</p>' +
      '<p>Check your terminal for the token value.</p>' +
      '<p><strong>You can close this tab and run <code>npm start</code>.</strong></p>',
      true
    ));

    server.close();
  } catch (err) {
    console.error('\nERROR during token exchange:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(htmlPage('Token exchange failed', `<pre>${err.message}</pre>`, false));
    server.close();
  }
});

server.listen(PORT, () => {
  // Listening — waiting for browser redirect
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nERROR: Port ${PORT} is already in use.`);
    console.error('The main server is probably running. Stop it first:\n');
    console.error('  Press Ctrl+C in the server terminal, then run this script again.\n');
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});

// ---- Helper: minimal HTML response ----
function htmlPage(title, body, success) {
  const icon  = success ? '&#10003;' : '&#10007;';
  const color = success ? '#2e7d32' : '#c62828';
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center">
    <h2 style="color:${color}">${icon} ${title}</h2>
    ${body}
  </body></html>`;
}
