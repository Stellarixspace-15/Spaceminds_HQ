# How to Get Your Google Sheet ID & Enable the API

## You've already done ✅
- Created the service account (`admin-817@spaceminds.iam.gserviceaccount.com`)
- Downloaded the JSON key file

## Step 1 — Enable Google Sheets API

1. Go to: https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=spaceminds
2. Click **"Enable"**
3. Done — takes about 30 seconds

## Step 2 — Create your Master Google Sheet

1. Go to: https://sheets.google.com → create a new spreadsheet
2. Rename it: **SpaceMinds Operations**
3. Create these 4 tabs (rename the default Sheet1 and add more):
   - `Workshops`
   - `Internship`
   - `Outreach Program`
   - `Events`
4. Leave them empty — the app will write the headers on first sync

## Step 3 — Share with Service Account

1. Click **Share** button (top right of the sheet)
2. Add email: `admin-817@spaceminds.iam.gserviceaccount.com`
3. Set permission to **Editor**
4. Click Send (ignore the "couldn't find account" warning — it still works)

## Step 4 — Get the Sheet ID

Look at your browser URL when the sheet is open:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       This is your SHEET_ID
```

Copy that ID and paste it into `.env.local`:
```
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

## Step 5 — Paste into .env.local & Vercel

In `.env.local`, replace `PASTE_YOUR_SHEET_ID_HERE` with your actual Sheet ID.

On Vercel (vercel.com → your project → Settings → Environment Variables), add the same value.

## That's it!

After deploying, go to Dashboard → click "Sync Sheets" to do the first pull.
