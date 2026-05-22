# Mtel Pitch

Internal dashboard for managing client pitch deck links. One shared team login; clients receive a direct `/view/:slug` URL.

---

## Stack

- React 19 + Vite
- Tailwind CSS v4
- Supabase (Auth + Database)
- React Router v7
- Lucide React icons

---

## Setup

### 1. Clone & install

```bash
git clone <repo>
cd mtel-pitchdeck
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, then run the SQL below in the **SQL Editor**.

### 3. Create the database tables

```sql
-- Members table
create table members (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  color   text not null,
  pattern text not null,
  pin     text not null
);

-- Decks table
create table decks (
  id            uuid primary key default gen_random_uuid(),
  client_name   text not null,
  slug          text not null unique,
  deck_url      text not null,
  date_added    timestamptz not null default now(),
  member_one_id uuid references members(id) on delete set null,
  member_two_id uuid references members(id) on delete set null
);
```

### 4. Enable Row Level Security (optional but recommended)

```sql
-- Allow authenticated users to do everything
alter table decks  enable row level security;
alter table members enable row level security;

create policy "Authenticated full access" on decks
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on members
  for all using (auth.role() = 'authenticated');

-- Allow public read on decks (for /view/:slug)
create policy "Public read decks" on decks
  for select using (true);
```

### 5. Create the shared team user

In Supabase → **Authentication → Users**, click **Add user** and create the shared team email/password.

### 6. Configure environment variables

```bash
cp .env.example .env
```

Fill in your values from **Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Optionally set `VITE_APP_URL` to your deployed domain (e.g. `https://pitch.mtel.com`) so the "Copy link" button generates the correct URL.

### 7. Run locally

```bash
npm run dev
```

### 8. Build for production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `/login` | Public | Shared team login |
| `/dashboard` | Protected | Manage all decks |
| `/view/:slug` | Public | Redirects to deck URL |

---

## Member profiles

Each team member creates a profile with a name, color, pattern, and 4-digit PIN. The PIN is required to edit a profile later. Profiles are shared across the team — click any member tag on a deck card to edit.
