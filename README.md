# Pitch (Demo)

Internal dashboard for managing client pitch deck links. One shared team login; clients receive a direct `/view/:slug` URL.

This is a **portfolio demo build** — it runs entirely on in-memory mock data instead of a real backend. Credentials are prefilled on the login screen, so just hit sign in. Add decks and members freely and explore the full flow — your session survives a refresh, but the decks/members data resets back to the seeded sample data (nothing is persisted to a database).

---

## Stack

- React 19 + Vite
- Tailwind CSS v4
- React Router v7
- Lucide React icons
- Mock data layer (`src/lib/mockAuth.js`, `src/lib/mockDb.js`) standing in for an auth/database backend

---

## Setup

### 1. Clone & install

```bash
git clone <repo>
cd pitchdeckhub
npm install
```

### 2. Run locally

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

---

## Mock data

- `src/lib/mockAuth.js` simulates the auth session — any non-empty email/password signs you in, kept only in memory.
- `src/lib/mockDb.js` seeds a handful of sample decks and members, and implements create/update/delete in-memory.

To swap this demo back onto a real backend, replace the calls in those two files with your API/database client of choice; the rest of the app is unaware of where the data comes from.

Optionally set `VITE_APP_URL` (see `.env.example`) to your deployed domain so the "Copy link" button generates the correct URL.

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
