# Mailen & Javier — Wedding Photo Booth

A mobile-first web application that lets wedding guests take or upload photos, add backgrounds, frames, and text, then share them directly to Google Drive.

---

## Project Structure

```
casamientomayyjavi/
├── frontend/               # Static web app (HTML + CSS + JS)
│   ├── index.html
│   ├── style.css
│   ├── app.js              # Screen navigation, camera, file upload logic
│   └── canvas.js           # HTML5 Canvas composition engine
├── backend/                # Node.js + Express server
│   ├── server.js           # API server + Google Drive upload
│   ├── package.json
│   └── .env.example        # Environment variable template
├── assets/
│   ├── backgrounds/        # Background images (4 options)
│   └── frames/             # Frame overlays (3 options)
├── scripts/
│   ├── generate-placeholders.js   # Create SVG placeholder assets
│   └── generate-qr.js             # Generate QR code for the deployed URL
└── README.md
```

---

## Quick Start (Local Development)

### 1. Generate placeholder assets

```bash
node scripts/generate-placeholders.js
```

### 2. Serve the frontend

Use any static server:

```bash
# Option A — VS Code Live Server extension (recommended)
# Open frontend/index.html and click "Go Live"

# Option B — Python
python3 -m http.server 5500 --directory frontend

# Option C — npx
npx serve frontend
```

### 3. Set up and start the backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Google Drive credentials
node server.js
```

Backend runs at `http://localhost:3001`.

Update `frontend/app.js` line containing `window.BACKEND_URL` or add to your HTML:

```html
<script>window.BACKEND_URL = 'http://localhost:3001/upload-photo';</script>
```

---

## Google Drive Setup

### Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. `casamientomayyjavi`)
3. Enable the **Google Drive API** for that project

### Step 2 — Create a Service Account

1. Go to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Name it `wedding-photo-booth`
4. Skip role assignment (click Continue → Done)
5. Click the service account → **Keys** tab → **Add Key → JSON**
6. Download the JSON file

### Step 3 — Configure credentials

**For local development:**

```bash
mkdir backend/credentials
# Place the downloaded JSON as:
mv ~/Downloads/your-key-file.json backend/credentials/service-account.json
```

Edit `backend/.env`:

```env
GOOGLE_SERVICE_ACCOUNT_PATH=./credentials/service-account.json
GOOGLE_DRIVE_FOLDER_NAME=Mailen_Javier_Wedding_Photos
```

**For cloud deployment (Railway / Vercel):**

Copy the entire contents of the JSON file and set it as an environment variable:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...entire JSON..."}
```

### Step 4 — Share the target Drive folder (optional)

If you want photos to appear in a specific Drive folder you own:

1. Create a folder in Google Drive named `Mailen_Javier_Wedding_Photos`
2. Right-click → Share → paste the Service Account email (e.g. `wedding-photo-booth@your-project.iam.gserviceaccount.com`)
3. Give it **Editor** access
4. Copy the folder ID from the URL and set `GOOGLE_DRIVE_FOLDER_ID=<id>` in `.env`

---

## Replacing Placeholder Assets

Replace the SVG placeholders in `assets/backgrounds/` and `assets/frames/` with real images:

| File | Recommended size | Description |
|------|-----------------|-------------|
| `backgrounds/floral.jpg` | 1080×1080 px | Elegant floral pattern |
| `backgrounds/romantic.jpg` | 1080×1080 px | Romantic rose/blush tones |
| `backgrounds/couple.jpg` | 1080×1080 px | Photo of Mailen & Javier |
| `backgrounds/minimal.jpg` | 1080×1080 px | Clean white/cream background |
| `frames/polaroid.png` | 1080×1080 px | Polaroid frame with transparent center |
| `frames/floral-frame.png` | 1080×1080 px | Floral wedding frame PNG |
| `frames/gold.png` | 1080×1080 px | Gold elegant frame PNG |

> **Important:** Frame images must be **PNG with transparency** so the photo shows through.

---

## GitHub Setup

```bash
cd /path/to/casamientomayyjavi

# Initialize repository
git init
git add .
git commit -m "Initial commit — Mailen & Javier Wedding Photo Booth"

# Create GitHub repo and push
gh repo create casamientomayyjavi --public --source=. --remote=origin --push

# Or manually:
git remote add origin https://github.com/YOUR_USERNAME/casamientomayyjavi.git
git branch -M main
git push -u origin main
```

---

## Deployment

### Option A — Railway (Recommended — full stack)

Railway can host both frontend and backend together.

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Set environment variables in Railway dashboard:
   - `PORT=3001`
   - `GOOGLE_SERVICE_ACCOUNT_JSON=<paste full JSON>`
   - `GOOGLE_DRIVE_FOLDER_NAME=Mailen_Javier_Wedding_Photos`
   - `SERVE_FRONTEND=true`
   - `ALLOWED_ORIGINS=https://your-railway-domain.up.railway.app`
5. Set the **Start Command**: `node backend/server.js`
6. Railway assigns a domain like `casamientomayyjavi.up.railway.app`

### Option B — Vercel (Frontend) + Railway (Backend)

**Frontend on Vercel:**

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. No build command needed (static site)
4. Deploy → get URL like `casamientomayyjavi.vercel.app`
5. Update `app.js`: set `window.BACKEND_URL` to your Railway backend URL

**Backend on Railway:**

Follow Option A but set `SERVE_FRONTEND=false` and add the Vercel URL to `ALLOWED_ORIGINS`.

---

## QR Code Generation

After deploying, generate the QR code:

```bash
cd casamientomayyjavi

# Install QR generator
npm install qrcode

# Generate QR pointing to your deployed URL
node scripts/generate-qr.js https://casamientomayyjavi.up.railway.app
```

This outputs:
- `assets/qr-code.png` — 1200px PNG for printing (gold color)
- `assets/qr-code.svg` — Vector SVG for large-format printing
- Terminal preview

**Print suggestions:**
- Table cards: 5×5 cm QR + "Scan to share your moment 📸"
- Backdrop sign: large format with names and QR
- Use [qr.io](https://qr.io) for a branded QR with a logo center

---

## Security Notes

- Max file size: 10MB enforced server-side
- Only `image/jpeg`, `image/png`, `image/webp` accepted
- CORS restricted to configured origins
- Service account credentials are never exposed to the frontend
- `.gitignore` excludes all `.env` files and credential JSON files

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS, Canvas API |
| Backend | Node.js, Express.js |
| File Upload | Multer (in-memory) |
| Cloud Storage | Google Drive API v3 |
| Auth | Google Service Account |
| Deployment | Railway or Vercel |

---

*Made with love for Mailen & Javier's wedding 💍*
