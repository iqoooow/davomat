# Davomat — Setup Guide

## Prerequisites
- Node.js 18+
- Supabase project (free tier works)
- Eskiz SMS account

---

## Step 1: Install Dependencies
```bash
npm install
```

---

## Step 2: Configure Supabase

1. Go to [supabase.com](https://supabase.com) → your project
2. **Project Settings → API**, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 3: Create `.env` file

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Never commit `.env` to git.**

---

## Step 4: Run SQL Migrations (in order)

Go to **Supabase → SQL Editor** and run each file:

### 4.1 — Initial Schema
Run: `supabase/migrations/001_initial_schema.sql`

Creates: `students`, `attendance` tables + RLS

### 4.2 — Extended Schema
Run: `supabase/migrations/002_extended_schema.sql`

Creates: `groups`, `sms_templates`, `sms_history`, `sms_settings` tables
Adds: `group_id`, `avatar_url` columns to `students`

### 4.3 — Storage
Run: `supabase/migrations/003_storage.sql`

Creates: `avatars` public storage bucket

---

## Step 5: Create Admin User

**Supabase → Authentication → Users → Add User**
- Enter your email and password
- This is the only login account

---

## Step 6: Deploy Edge Function (SMS)

The `sms-sender` Edge Function sends SMS via Eskiz server-side so credentials never reach the browser.

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login & link
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
```

### Set secrets
```bash
supabase secrets set ESKIZ_EMAIL=your@email.com
supabase secrets set ESKIZ_PASSWORD=your-password
supabase secrets set ESKIZ_FROM=4546
```
> `ESKIZ_FROM` — registered sender name in Eskiz panel (default: `4546`)

### Deploy
```bash
supabase functions deploy sms-sender
```

---

## Step 7: Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and log in.

---

## Step 8: Build for Production

```bash
npm run build
```

Deploy `dist/` to Vercel, Netlify, or Cloudflare Pages.
Set environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) on your host.

---

## Features

| Page | URL | Description |
|---|---|---|
| Davomat | `/` | Daily attendance with toggle per student |
| Dashboard | `/dashboard` | Stats, charts, quick summary |
| Kalendar | `/calendar` | Monthly attendance calendar view |
| Hisobot | `/reports` | Filter & print attendance reports |
| Guruhlar | `/groups` | Create/edit/delete groups |
| Talabalar | `/students` | Student list with avatar upload |
| SMS Sozlamalari | `/sms-settings` | SMS templates + send history |

---

## SMS Flow

1. Mark students present/absent on **Davomat** page
2. Click **SMS Yuborish** → select template → confirm
3. Edge Function calls Eskiz API for each absent student
4. Each parent receives: *"Hurmatli ota-ona, farzandingiz [Ism] bugun darsga kelmadi."*
5. `sms_sent = true` is set to prevent duplicates
6. All sends are logged in `sms_history` table

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Could not find table 'students'` | Run migration 001 in Supabase SQL Editor |
| `Could not find table 'groups'` | Run migration 002 in Supabase SQL Editor |
| SMS not sending | Check Edge Function logs: Supabase → Edge Functions → sms-sender → Logs |
| Avatar upload fails | Run migration 003 to create the `avatars` storage bucket |
| Login fails | Create admin user in Supabase → Authentication → Users |

---

## Project Structure

```
src/
  components/   Layout, Sidebar, Modal, ProtectedRoute, ThemeToggle
  context/      AuthContext, ThemeContext
  hooks/        useAuth.js
  pages/        AttendancePage, DashboardPage, CalendarPage, ReportsPage,
                GroupsPage, GroupDetailPage, StudentsPage, StudentDetailPage,
                SmsSettingsPage, LoginPage
  services/     supabaseClient, studentsService, groupsService,
                attendanceService, smsSettingsService
supabase/
  functions/
    sms-sender/index.ts     ← Deno Edge Function (SMS via Eskiz)
  migrations/
    001_initial_schema.sql
    002_extended_schema.sql
    003_storage.sql
```
