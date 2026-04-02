# SiteLedger Backend — Setup Guide

## What's In This Folder

```
siteledger-backend/
├── server.js          ← Main server entry point
├── database.js        ← SQLite setup, schema & seed data
├── backup.js          ← Daily backup script
├── package.json       ← Dependencies
├── .env.example       ← Environment variable template
├── api.js             ← Copy this to your React src/ folder
├── middleware/
│   └── auth.js        ← JWT authentication middleware
└── routes/
    ├── auth.js        ← Login, users
    ├── materials.js   ← Stock management
    ├── workers.js     ← Workers & attendance
    ├── expenses.js    ← Expenses, vendors, invoices
    ├── tasks.js       ← Tasks & daily logs
    └── reports.js     ← Summary reports
```

---

## Step-by-Step Setup

### Step 1 — Install Node.js
Download from https://nodejs.org — choose the LTS version.
Verify: open Terminal/Command Prompt and run:
```
node --version
```
You should see something like v20.x.x

---

### Step 2 — Install Backend Dependencies
Open Terminal in this folder and run:
```
npm install
```
This installs: Express, SQLite, bcrypt, JWT, CORS, dotenv.

---

### Step 3 — Create Your .env File
Copy the example file:
```
# Mac/Linux:
cp .env.example .env

# Windows:
copy .env.example .env
```
Then open `.env` and change the JWT_SECRET to any long random string.

---

### Step 4 — Start the Backend
```
npm start
```
You should see:
```
✅ Database initialised
SiteLedger Backend running on http://localhost:5000
```
The database file `siteledger.db` is created automatically with all your seed data.

---

### Step 5 — Connect Your React Frontend
1. Copy the `api.js` file from this folder into your React `src/` folder.
2. Create a `.env` file in your React project root:
```
REACT_APP_API_URL=http://localhost:5000/api
```
3. In your React `App.jsx`, replace the in-memory state calls with the API functions from `api.js`. For example:

```js
import { login, getMaterials, recordAttendance } from './api';

// Login
const { token, user } = await login(username, password);
setToken(token);

// Load materials
const mats = await getMaterials();
setMats(mats);

// Record attendance
await recordAttendance({ worker_id, date, status, hours, ot_hours });
```

---

### Step 6 — Run Both Together
Open two terminal windows:

Terminal 1 (Backend):
```
cd siteledger-backend
npm start
```

Terminal 2 (Frontend):
```
cd siteledger
npm start
```

Your app is now fully connected to the real database.

---

### Step 7 — Set Up Cloudflare Tunnel (Access From Anywhere)
1. Download Cloudflare Tunnel from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
2. Run:
```
cloudflared tunnel --url http://localhost:5000
```
You'll get a free public URL like: `https://random-name.trycloudflare.com`
Share this URL with your team as the API URL.

Update your React `.env`:
```
REACT_APP_API_URL=https://your-tunnel-url.trycloudflare.com/api
```

---

### Step 8 — Deploy React Frontend to Vercel (Free)
1. Push your React project to GitHub
2. Go to vercel.com and sign up free
3. Import your GitHub repo
4. Add environment variable: `REACT_APP_API_URL` = your Cloudflare tunnel URL
5. Deploy — you get a URL like `siteledger.vercel.app`

---

### Step 9 — Set Up Automatic Daily Backup

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task → Daily at 2:00 AM
3. Action: Start a program → `node`
4. Arguments: `C:\path\to\siteledger-backend\backup.js`

**Mac/Linux (crontab):**
```
crontab -e
```
Add this line:
```
0 2 * * * node /full/path/to/siteledger-backend/backup.js
```

Backups are saved in the `backups/` folder. Last 30 days are kept automatically.

---

## API Endpoints Reference

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | /api/auth/login | Login, returns JWT token |
| GET | /api/materials | Get all materials |
| POST | /api/materials/log | Record stock movement |
| GET | /api/workers | Get all workers |
| POST | /api/workers/attendance | Record attendance |
| GET | /api/expenses | Get all expenses |
| POST | /api/expenses | Add expense |
| GET | /api/expenses/vendors | Get vendors |
| GET | /api/expenses/invoices | Get invoices |
| GET | /api/reports/summary | Full project summary |
| GET | /api/reports/daily | Today's report |

---

## Adding New Features Later

**Adding a new data type (e.g. Equipment):**
1. Add a table to `database.js`
2. Create `routes/equipment.js`
3. Register it in `server.js`: `app.use("/api/equipment", require("./routes/equipment"))`
4. Add the API calls to `api.js`
5. Build the React component in `App.jsx`

**Adding a new field to an existing form:**
- Backend: `ALTER TABLE attendance ADD COLUMN new_field TEXT;` in database.js
- Frontend: Add the input field in the React component and include it in the API call

You can always add more features. The architecture is built to grow.

---

## Default Login Credentials
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| manager | manager123 | Site Manager |
| entry | entry123 | Data Entry |
| account | account123 | Accountant |

**Change these after first login by asking your developer to update via the API.**
