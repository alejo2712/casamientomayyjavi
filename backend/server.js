'use strict';

const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');
const dotenvResult = require('dotenv').config({ path: ENV_FILE });

// ---- Startup: environment validation ----
// Runs before anything else. Prints status of every required variable.
// Exits immediately if any are missing so the problem is obvious.
(function validateEnv() {
  if (dotenvResult.error) {
    console.warn(`[env] WARNING: could not load .env file at ${ENV_FILE}`);
    console.warn('[env]          Falling back to system environment variables.');
  } else {
    console.log(`[env] Loaded: ${ENV_FILE}`);
  }

  // GOOGLE_REFRESH_TOKEN is intentionally excluded — it can be obtained
  // at runtime by visiting /auth/google and stored in tokens.json.
  const REQUIRED = [
    'DRIVE_FOLDER_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
  ];

  const missing = [];
  for (const key of REQUIRED) {
    const present = Boolean(process.env[key]);
    console.log(`[env]   ${key}: ${present ? 'present' : 'MISSING ✗'}`);
    if (!present) missing.push(key);
  }

  if (missing.length > 0) {
    console.error(`\n[env] FATAL — missing required variable(s): ${missing.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('[env] Add these variables in the Render dashboard → your service → Environment tab.');
    } else {
      console.error(`[env] Open the .env file at: ${ENV_FILE}`);
      console.error('[env] Fill in the missing values and restart the server.\n');
    }
    process.exit(1);
  }

  console.log('[env] All required variables present.\n');
}());

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { exec } = require('child_process');
const { getOAuthClient, setRefreshToken, refreshTokenExists, uploadToDrive } = require('./config/googleDrive');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Static files ----
// Serve frontend and assets from project root
const frontendPath = path.join(__dirname, '..', 'frontend');
const assetsPath = path.join(__dirname, '..', 'assets');

app.use(express.static(frontendPath));
app.use('/assets', express.static(assetsPath));

// ---- CORS ----
app.use(cors());
app.use(express.json());

// ---- Multer — in-memory storage ----
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, png, webp).'));
    }
  },
});

// ---- Routes ----

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'casamientomayyjavi' });
});

/**
 * POST /upload-photo
 * Accepts multipart/form-data with field "photo"
 */
app.post('/upload-photo', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received. Send field "photo".' });
  }

  const timestamp = Date.now();
  const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
  const filename = `wedding-photo-${timestamp}.${ext}`;

  try {
    const fileId = await uploadToDrive(req.file.buffer, filename, req.file.mimetype);

    console.log('Photo uploaded to Google Drive successfully');

    return res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully!',
      filename,
      fileId,
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    return res.status(500).json({ error: 'Upload failed.', detail: err.message });
  }
});

// ---- Google OAuth authorization routes ----
// These routes live entirely in the backend — no secrets reach the browser.

/**
 * GET /auth/google
 * Redirects the user to Google's consent screen.
 * Open this in a browser: http://localhost:3000/auth/google
 */
app.get('/auth/google', (_req, res) => {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',   // required to receive a refresh_token
    prompt: 'consent',        // forces Google to issue a new refresh_token every time
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
  console.log('[OAuth] Redirecting to Google consent screen...');
  res.redirect(url);
});

/**
 * GET /oauth2callback
 * Google redirects here after the user grants (or denies) access.
 * Exchanges the authorization code for tokens and saves the refresh token.
 */
app.get('/oauth2callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('[OAuth] User denied access or error occurred:', error);
    return res.status(400).send(`Authorization denied: ${error}`);
  }

  if (!code) {
    return res.status(400).send('Missing authorization code from Google.');
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      console.warn('[OAuth] Google did not return a refresh_token.');
      console.warn('[OAuth] To force a new one: revoke access at https://myaccount.google.com/permissions then try /auth/google again.');
      return res.status(400).send(
        'Google did not return a refresh token. ' +
        'Revoke the app access at https://myaccount.google.com/permissions and try again.'
      );
    }

    setRefreshToken(tokens.refresh_token);

    console.log('\n[OAuth] ================================================');
    console.log('[OAuth] Authorization successful!');
    console.log('[OAuth] REFRESH TOKEN:');
    console.log(tokens.refresh_token);
    console.log('[OAuth] Saved to backend/config/tokens.json');
    console.log('[OAuth] Optionally copy it to .env as GOOGLE_REFRESH_TOKEN');
    console.log('[OAuth] ================================================\n');

    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>&#10003; Authorization successful!</h2>
        <p>The refresh token has been saved to <code>backend/config/tokens.json</code>.</p>
        <p>Check your terminal — the token is printed there too.</p>
        <p>You can close this window and start using the photo booth.</p>
      </body></html>
    `);
  } catch (err) {
    console.error('[OAuth] Token exchange error:', err.message);
    res.status(500).send('OAuth error: ' + err.message);
  }
});

// Catch-all: serve index.html for any unmatched route
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ---- Multer error handler ----
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum is 10MB.' });
  }
  if (err.message && err.message.includes('Only image')) {
    return res.status(415).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---- Start ----
// Bind to 0.0.0.0 so Render (and other cloud platforms) can route traffic to the process.
// Locally this behaves identically — all interfaces are reachable on localhost.
app.listen(PORT, '0.0.0.0', () => {
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`Wedding Photo Booth server running on port ${PORT}`);
  if (!isProduction) {
    console.log(`Open: http://localhost:${PORT}`);
  }

  if (!refreshTokenExists()) {
    console.log('\n[Drive] No refresh token found.');
    if (isProduction) {
      // On Render there is no browser — instruct the operator via logs.
      console.log('[Drive] Set GOOGLE_REFRESH_TOKEN in the Render dashboard → Environment tab.');
      console.log('[Drive] Then redeploy for the change to take effect.');
    } else {
      const authUrl = `http://localhost:${PORT}/auth/google`;
      console.log(`[Drive] Opening browser to authorize...`);
      console.log(`[Drive] Auth URL: ${authUrl}\n`);

      // Open the default browser — works on macOS, Windows, and Linux
      const cmd = process.platform === 'win32' ? `start "${authUrl}"`
                : process.platform === 'darwin' ? `open "${authUrl}"`
                : `xdg-open "${authUrl}"`;
      exec(cmd);
    }
  }
});
