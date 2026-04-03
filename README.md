# MediDonate – Setup & Deployment Guide

## Project Structure

```
medidonate/
├── backend/
│   ├── server.js          ← Express API server
│   ├── database.js        ← MongoDB Atlas connection
│   ├── package.json       ← npm dependencies + start script
│   └── models/
│       ├── User.js
│       ├── Request.js
│       └── Donation.js
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## Run Locally

```bash
cd backend
npm install
npm start
```

Open http://localhost:3000 — the server serves the frontend automatically.

For development with auto-reload:
```bash
npm run dev
```

---

## Deploy to Render (free, recommended)

1. Push this project to a GitHub repository
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Set these values:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment:** Node
5. Click Deploy

The frontend is served by Express from the `frontend/` folder, so no separate deployment needed.

---

## Deploy to Railway

1. Push to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select your repo
4. Set **Root Directory** to `backend`
5. Railway auto-detects Node.js and uses `npm start`

---

## Deploy to Cyclic / Heroku / Fly.io

Same pattern: point the deployment root at the `backend/` folder, ensure `npm start` runs `node server.js`.

---

## MongoDB Atlas (already configured)

The connection string in `database.js` is already set. If you need to update it:
- Open `backend/database.js`
- Replace the `MONGO_URI` string with your new Atlas connection string
- Make sure your Atlas cluster has **Network Access → 0.0.0.0/0** (allow all IPs) enabled for cloud deployments

---

## User Roles

| Role  | Can do |
|-------|--------|
| NGO   | Post medicine requests, view incoming donations, confirm receipt |
| Donor | Browse all requests, submit donations, track approval status |
| Admin | Approve/reject donations with notes, view all data |
