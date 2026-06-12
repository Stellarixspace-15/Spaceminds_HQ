# SpaceMinds Hub — Setup Guide

## What you need
- Node.js 18+
- A Google Sheet with tabs: `Workshops`, `Internship`, `Outreach Program`, `Events`
- A Google Cloud Service Account with Sheets API enabled

---

## Step 1 — Fill in .env.local

Open `.env.local` and replace the placeholder values:

```
NEXT_PUBLIC_SUPABASE_URL=https://gkvvzmlpfmrvwhqtstpc.supabase.co   ← already set

NEXT_PUBLIC_SUPABASE_ANON_KEY=...   ← Supabase > Settings > API > anon public key
                                        ⚠️ Must be the ANON key (not service_role)

SUPABASE_SERVICE_ROLE_KEY=...       ← Supabase > Settings > API > service_role key
                                        (used only in server API routes, never browser)

GOOGLE_SHEET_ID=...                 ← from your sheet URL: /spreadsheets/d/SHEET_ID/edit

GOOGLE_SERVICE_ACCOUNT_EMAIL=...    ← from the JSON key file you downloaded
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Step 2 — Create your admin user

The database schema and programs are already applied to Spaceminds_HQ.

1. Go to supabase.com → Spaceminds_HQ → Authentication → Users → **Invite User**
2. Enter your email, send invite, set password via the email link
3. Go to SQL Editor and run:
   ```sql
   INSERT INTO public.allowed_users (email, full_name, role)
   VALUES ('your@email.com', 'Your Name', 'admin');
   ```

---

## Step 3 — Google Sheets service account

1. Go to console.cloud.google.com → Enable **Google Sheets API**
2. Create → Credentials → Service Account → Download JSON key
3. Open the JSON, copy `client_email` and `private_key` into `.env.local`
4. In your Google Sheet → Share → paste the service account email → give **Editor** access

---

## Step 4 — Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Step 5 — Deploy to Vercel

```bash
npm i -g vercel
vercel
```

When prompted, add all env vars from `.env.local`.
Or go to vercel.com → your project → Settings → Environment Variables.

The `vercel.json` sets region to `bom1` (Mumbai) for low latency.

---

## How sync works

- **Sheet → Portal**: Dashboard → "Sync Sheets" button (admin/founder)
- **Portal → Sheet**: Trainer advances a step → auto-writes that row back
- Headers are written automatically on first sync

## Adding more programs

Admin tab → Programs → programs are editable. Steps can be added, renamed, removed.
To add a new program type: go to Supabase → Table Editor → programs → Insert row.
