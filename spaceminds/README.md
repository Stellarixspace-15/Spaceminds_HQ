# SpaceMinds Operations Hub

Internal K-12 Aerospace Education operations management portal.

---

## Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database + Auth**: Supabase (Spaceminds_HQ project)
- **Google Sheets**: Two-way sync via Google Service Account
- **Hosting**: Vercel

---

## Setup Guide (Follow In Order)

### 1. Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) → open **Spaceminds_HQ** project
2. Go to **SQL Editor** → paste the entire contents of `supabase-schema.sql` → Run
3. This creates all tables, RLS policies, and seeds the 4 default programs

### 2. Create Your First Admin User

In Supabase dashboard:
1. Go to **Authentication → Users → Invite User**
2. Enter your admin email
3. After they sign up, go to **SQL Editor** and run:
   ```sql
   INSERT INTO public.allowed_users (email, full_name, role)
   VALUES ('your@email.com', 'Your Name', 'admin');
   ```

### 3. Google Sheets Setup

**A. Create the Master Sheet**
1. Create a new Google Sheet
2. Create 4 tabs named exactly: `Workshops`, `Internship`, `Outreach Program`, `Events`
3. In each tab, Row 1 should be left empty (the app writes headers on first sync)
4. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

**B. Create a Service Account**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**: APIs & Services → Library → search "Google Sheets API" → Enable
4. Create credentials: APIs & Services → Credentials → Create Credentials → Service Account
5. Name it, click Create → Done (no special roles needed)
6. Click on the service account → Keys → Add Key → JSON → Download

**C. Share the Sheet with the Service Account**
1. Open the service account JSON — copy the `client_email` field
2. In your Google Sheet → Share → paste that email → give **Editor** access

### 4. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
# From Supabase: Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # Settings → API → service_role (secret!)

# Google Sheet ID from the URL
GOOGLE_SHEET_ID=your_sheet_id

# From the downloaded service account JSON
GOOGLE_SERVICE_ACCOUNT_EMAIL=name@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> ⚠️ **NEVER commit `.env.local` to git.** It's in `.gitignore`.

### 5. Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts — link to your Vercel account
# When asked about environment variables, add all from .env.local
```

Or deploy via Vercel dashboard:
1. Push code to GitHub
2. Import repo at vercel.com/new
3. Add all environment variables under **Settings → Environment Variables**
4. Deploy

---

## Google Sheets Column Structure

Every tab must have these columns (the app writes headers automatically):

| Column | Name | Description |
|--------|------|-------------|
| A | school_id | Unique ID like SCH-001 |
| B | school_name | School name |
| C | contact_name | Primary contact |
| D | contact_email | Contact email |
| E | contact_phone | Contact phone |
| F | city | City |
| G | program_type | outreach / workshop / curriculum |
| H | enrollment_count | Number of students |
| I | pipeline_step | Current step number |
| J | pipeline_status | In Progress / Completed / Blocked / Not Started |
| K | assigned_trainer | Trainer's email |
| L | outreach_date | YYYY-MM-DD |
| M | workshop_date | YYYY-MM-DD |
| N | curriculum_start | YYYY-MM-DD |
| O | notes | Free text notes |
| P | last_updated | Auto-set by app |
| Q | status | Active / On Hold / Completed |

---

## Role Permissions

| Feature | admin | founder | trainer | admin_staff |
|---------|-------|---------|---------|-------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Pipeline (all schools) | ✅ | ✅ | ❌ | ❌ |
| Pipeline (own schools) | ✅ | ✅ | ✅ | ✅ |
| Advance pipeline steps | ✅ | ❌ | ✅ (own) | ✅ (own) |
| Admin tab | ✅ | ❌ | ❌ | ❌ |
| Sync Google Sheets | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |

---

## Editing SOP Steps

In the Admin tab → Programs → click "Edit Steps" on any program to:
- Rename steps
- Add new steps
- Remove steps
- Reorder (drag support coming)

Changes are saved to Supabase and apply immediately to all schools in that program.

---

## Two-Way Sync Logic

- **Sheet → Portal**: Click "Sync Sheets" button on Dashboard (admin/founder only). Reads all tabs, upserts into Supabase by `school_id`.
- **Portal → Sheet**: When a trainer advances a pipeline step, the app writes that row back to Google Sheets automatically via the service account.
- The `last_updated` column is always auto-set when the portal writes back.
