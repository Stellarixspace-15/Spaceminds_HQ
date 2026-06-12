-- ============================================================
-- SpaceMinds Operations Hub — Supabase Schema
-- Run this in: supabase.com > Spaceminds_HQ > SQL Editor
-- ============================================================

-- 1. ALLOWED USERS (whitelist + roles)
create table if not exists public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'founder', 'trainer', 'admin_staff')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. PROGRAMS (the 4 program types, editable by admin)
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- e.g. "Workshops"
  sheet_tab_name text not null, -- exact tab name in Google Sheet
  color text not null default '#6366f1',
  sop_steps jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. SCHOOLS (synced from Google Sheets)
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  school_id text unique not null,        -- e.g. SCH-001
  school_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  city text,
  program_id uuid references public.programs(id),
  program_type text,                     -- outreach / workshop / curriculum
  enrollment_count integer default 0,
  pipeline_step integer default 1,
  pipeline_status text default 'In Progress' check (pipeline_status in ('In Progress', 'Completed', 'Blocked', 'Not Started')),
  assigned_trainer text,                 -- email of assigned trainer
  outreach_date date,
  workshop_date date,
  curriculum_start date,
  notes text,
  status text default 'Active' check (status in ('Active', 'On Hold', 'Completed')),
  last_synced_at timestamptz default now(),
  sheet_row_index integer,               -- row number in Google Sheet for writes
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. PIPELINE HISTORY (audit log of step changes)
create table if not exists public.pipeline_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  from_step integer,
  to_step integer,
  changed_by text not null,  -- user email
  notes text,
  changed_at timestamptz default now()
);

-- 5. SHEET ASSIGNMENTS (admin assigns sheet tabs to users)
create table if not exists public.sheet_assignments (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  program_id uuid references public.programs(id) on delete cascade,
  can_edit boolean default false,
  assigned_at timestamptz default now(),
  unique (user_email, program_id)
);

-- 6. NOTIFICATIONS / ALERTS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info', 'warning', 'error', 'success')),
  target_role text,  -- null = all roles
  is_sticky boolean default false,
  is_active boolean default true,
  created_by text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.allowed_users enable row level security;
alter table public.programs enable row level security;
alter table public.schools enable row level security;
alter table public.pipeline_history enable row level security;
alter table public.sheet_assignments enable row level security;
alter table public.notifications enable row level security;

-- Helper: get current user's role
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.allowed_users
  where email = auth.jwt() ->> 'email' and is_active = true
  limit 1;
$$;

-- Helper: check if current user is allowed
create or replace function public.is_allowed_user()
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.allowed_users
    where email = auth.jwt() ->> 'email' and is_active = true
  );
$$;

-- ALLOWED USERS: only admin can manage
create policy "admin can manage allowed_users" on public.allowed_users
  for all using (public.get_my_role() = 'admin');

create policy "users can read own record" on public.allowed_users
  for select using (email = auth.jwt() ->> 'email');

-- PROGRAMS: all allowed users can read; only admin can write
create policy "allowed users read programs" on public.programs
  for select using (public.is_allowed_user());

create policy "admin manages programs" on public.programs
  for all using (public.get_my_role() = 'admin');

-- SCHOOLS: role-based access
create policy "admin and founder see all schools" on public.schools
  for select using (public.get_my_role() in ('admin', 'founder'));

create policy "trainer sees assigned schools" on public.schools
  for select using (
    public.get_my_role() in ('trainer', 'admin_staff')
    and assigned_trainer = auth.jwt() ->> 'email'
  );

create policy "admin can write schools" on public.schools
  for all using (public.get_my_role() = 'admin');

create policy "trainer can update assigned school pipeline" on public.schools
  for update using (
    public.get_my_role() in ('trainer', 'admin_staff')
    and assigned_trainer = auth.jwt() ->> 'email'
  );

-- PIPELINE HISTORY: allowed users can read/insert
create policy "allowed users read history" on public.pipeline_history
  for select using (public.is_allowed_user());

create policy "allowed users insert history" on public.pipeline_history
  for insert with check (public.is_allowed_user());

-- SHEET ASSIGNMENTS: admin manages, users see their own
create policy "admin manages assignments" on public.sheet_assignments
  for all using (public.get_my_role() = 'admin');

create policy "users see own assignments" on public.sheet_assignments
  for select using (user_email = auth.jwt() ->> 'email');

-- NOTIFICATIONS: all can read active ones; admin manages
create policy "allowed users read notifications" on public.notifications
  for select using (public.is_allowed_user() and is_active = true);

create policy "admin manages notifications" on public.notifications
  for all using (public.get_my_role() = 'admin');

-- ============================================================
-- SEED DATA — 4 default programs
-- ============================================================

insert into public.programs (name, sheet_tab_name, color, sop_steps) values
(
  'Workshops',
  'Workshops',
  '#6366f1',
  '[
    {"step": 1, "name": "Initial Outreach"},
    {"step": 2, "name": "School Interest Confirmed"},
    {"step": 3, "name": "Principal Meeting Scheduled"},
    {"step": 4, "name": "Principal Meeting Done"},
    {"step": 5, "name": "Proposal Sent"},
    {"step": 6, "name": "Proposal Approved"},
    {"step": 7, "name": "Agreement Signed"},
    {"step": 8, "name": "Trainer Assigned"},
    {"step": 9, "name": "Workshop Scheduled"},
    {"step": 10, "name": "Workshop Delivered"},
    {"step": 11, "name": "Feedback Collected"},
    {"step": 12, "name": "Program Completed"}
  ]'::jsonb
),
(
  'Internship',
  'Internship',
  '#10b981',
  '[
    {"step": 1, "name": "Initial Outreach"},
    {"step": 2, "name": "School Interest Confirmed"},
    {"step": 3, "name": "Coordinator Meeting"},
    {"step": 4, "name": "Program Briefing Done"},
    {"step": 5, "name": "MOU Sent"},
    {"step": 6, "name": "MOU Signed"},
    {"step": 7, "name": "Students Shortlisted"},
    {"step": 8, "name": "Onboarding Scheduled"},
    {"step": 9, "name": "Internship Started"},
    {"step": 10, "name": "Mid-Review Done"},
    {"step": 11, "name": "Final Evaluation"},
    {"step": 12, "name": "Certificates Issued"}
  ]'::jsonb
),
(
  'Outreach Program',
  'Outreach Program',
  '#f59e0b',
  '[
    {"step": 1, "name": "Target School Identified"},
    {"step": 2, "name": "Cold Outreach Sent"},
    {"step": 3, "name": "Response Received"},
    {"step": 4, "name": "Intro Call Done"},
    {"step": 5, "name": "Visit Scheduled"},
    {"step": 6, "name": "School Visit Done"},
    {"step": 7, "name": "Follow-up Sent"},
    {"step": 8, "name": "Decision Expected"},
    {"step": 9, "name": "School Onboarded"},
    {"step": 10, "name": "Program Briefing"},
    {"step": 11, "name": "First Session Done"},
    {"step": 12, "name": "Relationship Established"}
  ]'::jsonb
),
(
  'Events',
  'Events',
  '#ef4444',
  '[
    {"step": 1, "name": "Event Conceptualized"},
    {"step": 2, "name": "School Invited"},
    {"step": 3, "name": "RSVP Confirmed"},
    {"step": 4, "name": "Details Shared"},
    {"step": 5, "name": "Logistics Finalized"},
    {"step": 6, "name": "Reminder Sent"},
    {"step": 7, "name": "School Attended"},
    {"step": 8, "name": "Engagement Tracked"},
    {"step": 9, "name": "Follow-up Done"},
    {"step": 10, "name": "Feedback Collected"},
    {"step": 11, "name": "Outcome Recorded"},
    {"step": 12, "name": "Event Closed"}
  ]'::jsonb
);

-- ============================================================
-- UPDATED AT TRIGGER
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schools_updated_at before update on public.schools
  for each row execute function public.handle_updated_at();

create trigger allowed_users_updated_at before update on public.allowed_users
  for each row execute function public.handle_updated_at();
