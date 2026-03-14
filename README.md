# Mailen & Javier — Wedding Photo Booth

A mobile-first web app for wedding guests to take or upload a photo, pick a background and frame, add personalized text, then save it or upload it to Google Drive.

---

## Quick Start

```bash
# From the project root:
npm install
npm start
# App runs at http://localhost:3000
```

> Always run from the **project root** (`casamientomayyjavi/`), not from `backend/`.

Development mode (auto-restarts on file changes):

```bash
npm run dev
```

---

## One-Time Admin Authorization (Google Drive)

Photos upload to Google Drive under the admin's account. This requires a single OAuth2 authorization that generates a long-lived refresh token. **Guests never see a login screen.**

### How it works automatically

1. On first startup, the server checks for a stored refresh token.
2. If none exists, it **automatically opens your browser** to Google's authorization page.
3. You (the admin) sign in and click **Allow**.
4. Google redirects back to `http://localhost:3000/oauth2callback`.
5. The server saves the token to `backend/config/tokens.json`.
6. All future uploads use that token silently — no re-auth needed.

### Where the refresh token is stored

| Location | Priority | Notes |
|----------|----------|-------|
| `GOOGLE_REFRESH_TOKEN` in `.env` | 1st (highest) | Optional — set manually if preferred |
| `backend/config/tokens.json` | 2nd | Auto-created after first auth, gitignored |

If you ever need to re-authorize (token revoked or expired):
1. Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions), find the app, remove access.
2. Delete `backend/config/tokens.json` (and clear `GOOGLE_REFRESH_TOKEN` in `.env` if set).
3. Restart the server — the browser will open automatically again.

### Alternative: standalone token generator

If the auto-open doesn't work (e.g. headless server):

```bash
node scripts/get-token.js
```

This starts a temporary server on port 3000, prints an auth URL, and saves `tokens.json` on success.

---

## Environment Variables

Create a `.env` file in the **project root**:

```env
PORT=3000
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
GOOGLE_REFRESH_TOKEN=          # leave blank — filled automatically after first auth
DRIVE_FOLDER_ID=your-google-drive-folder-id
```

The server validates `DRIVE_FOLDER_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` on startup and exits with a clear error if any are missing.

---

## Adding New Backgrounds or Frames

All asset configuration lives in **`frontend/config.js`** — this is the only file you need to edit.

### Add a background

1. Copy your image to `assets/backgrounds/yourimage.jpg`
2. Add an entry to `BOOTH_CONFIG.backgrounds` in `frontend/config.js`:

```js
{
  id:    'yourimage',                             // unique key, no spaces
  label: 'Your Label',                           // shown to guests in the app
  path:  'assets/backgrounds/yourimage.jpg',
  thumb: 'assets/backgrounds/yourimage.jpg',
},
```

3. Restart the server — the new option appears automatically in the app.

### Add a frame

1. Copy your PNG (must have transparency) to `assets/frames/yourframe.png`
2. Add an entry to `BOOTH_CONFIG.frames` in `frontend/config.js`:

```js
{
  id:    'yourframe',
  label: 'Your Label',
  path:  'assets/frames/yourframe.png',
  thumb: 'assets/frames/yourframe.png',
},
```

Frame images are drawn at full canvas size (1080×1080 px) on top of the photo. Design them with transparency where the photo should show through.

### Recommended asset sizes

| File | Size | Format |
|------|------|--------|
| `assets/backgrounds/*.jpg` | 1080×1080 px | JPEG |
| `assets/frames/*.png` | 1080×1080 px | PNG with transparency |

---

## Project Structure

```
casamientomayyjavi/
├── package.json              # Root package — run npm start/install from here
├── .env                      # Not committed — create from template above
├── .gitignore
├── assets/
│   ├── backgrounds/          # Background images, served at /assets/backgrounds/
│   └── frames/               # Frame PNGs, served at /assets/frames/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── config.js             # BOOTH_CONFIG — edit this to add backgrounds/frames
│   ├── app.js                # Screen navigation, camera, file input, events
│   └── canvas.js             # Photo composition engine (HTML5 Canvas)
├── backend/
│   ├── server.js             # Express server + OAuth routes + upload endpoint
│   └── config/
│       ├── googleDrive.js    # OAuth2 client singleton + Drive upload logic
│       └── tokens.json       # Auto-created after first auth (gitignored)
└── scripts/
    └── get-token.js          # Standalone one-time OAuth token generator
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS, Canvas API |
| Backend | Node.js, Express.js |
| File Upload | Multer (in-memory, 10 MB limit) |
| Cloud Storage | Google Drive API v3 |
| Auth | OAuth2 (personal Google account, refresh token) |
| Fonts | Playfair Display + Inter (Google Fonts) |

---

*Made with love for Mailen & Javier's wedding 💍*
