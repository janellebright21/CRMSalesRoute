# Route Planner CRM — Deployment Guide

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd route-planner-crm
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials (see **Supabase Setup** below).

### 3. Run locally

```bash
npm run dev
```

---

## Supabase Setup

### Create a project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project** and choose a name, region, and database password
3. Wait for provisioning (~1 minute)

### Get your credentials

1. Open **Project Settings → API**
2. Copy **Project URL** → paste as `VITE_SUPABASE_URL`
3. Copy **anon / public** key → paste as `VITE_SUPABASE_ANON_KEY`

> The anon key is safe to use in client-side code. Row Level Security (RLS) policies ensure each user can only access their own data.

### Run migrations

All migrations are in `supabase/migrations/`. Apply them in order via the Supabase SQL editor or Supabase CLI:

```bash
# Using Supabase CLI (optional)
supabase db push
```

Or paste each `.sql` file into **Supabase Dashboard → SQL Editor → New query** and run them in filename order.

### Enable Authentication

1. Go to **Authentication → Providers**
2. Email/Password is enabled by default — no changes needed
3. Optionally disable **Confirm email** under **Authentication → Settings** for easier testing

### Enable Realtime

1. Go to **Database → Replication**
2. Ensure the `customers` and `visits` tables are listed under **supabase_realtime** publication
3. The migrations already run `ALTER PUBLICATION supabase_realtime ADD TABLE ...` — check they applied

---

## Deploy to Netlify

### Option A — Netlify UI (recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
3. Connect your repo
4. Build settings are detected automatically from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Go to **Site settings → Environment variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy site**

### Option B — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://your-ref.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJ..."
netlify deploy --prod
```

---

## Deploy to Vercel

### Option A — Vercel UI (recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com) → **Add New → Project**
3. Import your repo — Vercel detects Vite automatically
4. Go to **Settings → Environment Variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |

> **Security note:** Variables prefixed with `VITE_` are bundled into the client. Only the anon key (never the service role key) should be used here. Data access is controlled by Supabase RLS policies.

---

## PWA / Install to Home Screen

After deploying, visit the app in Chrome/Safari on mobile:

- **Android (Chrome):** Tap the menu → "Add to Home Screen"
- **iOS (Safari):** Tap the Share icon → "Add to Home Screen"
- **Desktop (Chrome):** Click the install icon in the address bar

The app works offline for cached pages after first load (new data requires network).

---

## Production Checklist

- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in hosting platform
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] Supabase migrations applied
- [ ] RLS enabled on all tables (`customers`, `visits`, `routes`, `user_settings`)
- [ ] Email confirmation setting matches your preference (Settings → Auth)
- [ ] Custom domain configured (optional)
- [ ] Realtime enabled for `customers` and `visits` tables
