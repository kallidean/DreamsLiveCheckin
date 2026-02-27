# Deploying DreamsLive Check-In

## Prerequisites

- GitHub repo pushed (already done)
- Accounts created at: railway.app, vercel.com, cloudinary.com, resend.com

---

## Step 1 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and create a new project
2. Click "Deploy from GitHub repo" and select **DreamsLiveCheckin**
3. Set the root directory to `/server`
4. Add a **PostgreSQL** database plugin to the project
5. Copy the `DATABASE_URL` from the PostgreSQL plugin into your environment variables
6. Add all remaining SERVER environment variables from `server/.env.example`
7. Railway will auto-deploy. Once live, copy your Railway deployment URL.

---

## Step 2 — Run Database Migrations

1. In Railway dashboard open the service shell
2. Run: `node src/db/migrate.js`
3. Run: `node src/db/seed.js` (optional, loads test data)

---

## Step 3 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and create a new project
2. Import the **DreamsLiveCheckin** GitHub repo
3. Set root directory to `/client`
4. Add environment variable: `VITE_API_URL` = your Railway deployment URL
5. Deploy. Copy your Vercel deployment URL.

---

## Step 4 — Connect Frontend and Backend

1. In Railway, update `CLIENT_URL` environment variable to your Vercel URL
2. Redeploy the Railway service for the change to take effect

---

## Step 5 — Test

1. Open your Vercel URL on your phone
2. Register a new account
3. Check your email for verification link
4. Log in and submit a test check-in
5. Verify supervisor receives email notification
6. Log in as `supervisor@test.com` and review the dashboard

---

## Test Accounts (after running seed.sql)

| Role       | Email                  | Password   |
|------------|------------------------|------------|
| Admin      | admin@test.com         | Admin1234  |
| Supervisor | supervisor@test.com    | Super1234  |
| Rep        | rep1@test.com          | Rep1234    |
