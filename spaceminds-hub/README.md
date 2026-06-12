# SpaceMinds Operations Hub

Internal K-12 Aerospace Education operations management portal.

## Stack
- **Frontend**: React + Vite
- **Backend/Auth**: Supabase (PostgreSQL + RLS)
- **Hosting**: Vercel
- **Data Sync**: Google Sheets (gviz CSV API for reads)

---

## Setup Instructions

### 1. Clone & Install

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file (copy `.env.example`):

```
VITE_SUPABASE_URL=https://gkvvzmlpfmrvwhqtstpc.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon/public key from Supabase → Settings → API>
```

**Where to find the anon key:**
Supabase Dashboard → Project `Spaceminds_HQ` → Settings → API → `anon public`

### 3. Local Dev

```bash
npm run dev
```

### 4. Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Set environment variables in Vercel:
   - `VITE_SUPABASE_URL` = `https://gkvvzmlpfmrvwhqtstpc.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Deploy — Vercel auto-detects Vite

### 5. First Admin User

1. Go to your deployed app
2. Sign up with your admin email
3. In Supabase Dashboard → Table Editor → `allowed_users`
4. Add a row: `email = your@email.com`, `role = admin`, `is_active = true`
5. Now sign in — you'll have full admin access

All future users are added via the **Admin Panel → Team Access** tab.

---

## Google Sheets Sync

### Read (auto-sync every time you click Sync Now)
1. Share your Google Sheet: **File → Share → Anyone with the link can View**
2. Admin Panel → Google Sheets → Connect Sheet
3. Paste the sheet URL + tab GID (find in URL: `#gid=XXXXXXX`)
4. Click **Sync Now** to pull data

### Sheet Column Order (Row 1 = headers)
| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| school_id | school_name | contact_name | contact_email | contact_phone | city | program_type | enrollment_count | pipeline_step | pipeline_status | assigned_trainer_email | outreach_date | workshop_date | curriculum_start | notes | last_updated | status |

### Write-back (portal → sheet)
For two-way sync, deploy a Google Apps Script Web App:
1. Open your Google Sheet → Extensions → Apps Script
2. Paste the script from `scripts/apps-script.js` (to be added)
3. Deploy as Web App with access: "Anyone"
4. Copy the Web App URL into Admin Panel → Google Sheets settings

---

## Roles

| Role | Access |
|---|---|
| `admin` | Everything — team management, sheet config, all data |
| `founder` | Dashboard + full pipeline view (read) |
| `trainer` | Only their assigned schools |
| `admin_staff` | Full pipeline view + edit access |
