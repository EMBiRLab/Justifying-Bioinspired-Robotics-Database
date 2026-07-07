# Deploying the Bio-Inspired Design Atlas

Two stages. **Stage 1** gets a working version on your website today (no backend).
**Stage 2** turns on the shared database + Google/ORCID sign-in. The code for both
is already written — Stage 2 is account setup plus pasting two values.

---

## Stage 1 — Get it on your website (no backend, ~15 min)

1. **Create a GitHub repo** (e.g. `bioinspired-atlas`), public.
2. **Upload the *contents* of the `atlas/` folder to the repo root** — so
   `index.html` is at the top level of the repo (not inside an `atlas/` subfolder).
   GitHub → *Add file → Upload files* → drag in: `index.html`, `standalone.html`,
   `styles.css`, the `js/` folder, the `supabase/` folder, `README.md`,
   `DEPLOY.md`, `build-standalone.py`.
3. **Enable Pages:** repo *Settings → Pages → Source: "Deploy from a branch" →
   branch `main`, folder `/ (root)` → Save*. Wait ~1 minute.
4. Your site is live at `https://<your-username>.github.io/bioinspired-atlas/`.
   Open it — the full atlas loads (data is per-visitor for now).
5. **Embed in Squarespace:** edit the page → add a **Code** block → paste:
   ```html
   <iframe src="https://<your-username>.github.io/bioinspired-atlas/"
           style="width:100%;height:900px;border:0" loading="lazy"></iframe>
   ```
   (Code/embed blocks need a Squarespace **Business** plan or higher. On a lower
   plan, just link out to the GitHub Pages URL.)

Now it's live and clickable. Each visitor's submissions/comments live only in
their own browser — perfect for demos and gathering interest. Stage 2 makes it
shared and persistent.

---

## Stage 2 — Turn on the shared database + Google/ORCID sign-in

### 2a. Create the database
1. Sign up at [supabase.com](https://supabase.com), create a project (free tier).
   Pick a region near your users; save the database password it gives you.
2. Project → **SQL Editor** → *New query* → paste **all of `supabase/schema.sql`**
   → Run.
3. *New query* → paste **all of `supabase/seed.sql`** → Run. (Seeds the 34
   Figure-2 papers so the shared map isn't empty.)

### 2b. Connect the app (this is the whole "swap")
1. Project → **Settings → API**. Copy the **Project URL** and the **anon public**
   key. (The anon key is safe to publish — it only grants what the row-level
   security policies allow.)
2. Edit **`js/config.js`** and paste them in:
   ```js
   window.BID_CONFIG = {
     supabaseUrl: "https://xxxx.supabase.co",
     supabaseAnonKey: "eyJhbGciOi...",
   };
   ```
3. Re-upload `js/config.js` to GitHub (or edit it directly on github.com). Pages
   redeploys automatically. The app now reads/writes the shared database and the
   header shows **"Sign in with Google / ORCID."** Nothing else changes.

### 2c. Turn on sign-in
1. **Google:** in Google Cloud Console create an *OAuth 2.0 Client ID* (type: Web).
   Copy the callback URL from Supabase → *Authentication → Providers → Google* into
   Google's "Authorized redirect URIs". Paste Google's client ID + secret back into
   Supabase's Google provider and enable it.
2. **ORCID:** register an API client at *orcid.org → Developer Tools* to get a
   client ID/secret; set its redirect URI to Supabase's callback. In Supabase →
   *Authentication → Providers*, add ORCID as a **Custom / OIDC** provider, issuer
   `https://orcid.org` (use `https://sandbox.orcid.org` while testing).
3. Add your live URLs (the GitHub Pages URL, and your Squarespace domain if you
   embed) to Supabase → *Authentication → URL Configuration → Redirect URLs*.

Sign in, submit a paper, comment, vote — it now persists for everyone. Ownership
and moderation are enforced server-side by the RLS policies in `schema.sql`
(anyone can read; only signed-in users write; people can edit/delete only their
own posts).

### Note on iframe + sign-in
Some browsers block OAuth redirects **inside** a Squarespace iframe. If sign-in
misbehaves when embedded, either link out to the GitHub Pages URL for the
interactive app, or host it on a subdomain of your own domain. The read-only map
always works embedded.

---

## Where the pieces live
- **`index.html` + `js/` + `styles.css`** — the app you deploy (multi-file).
- **`js/config.js`** — the only file you edit to go live (paste keys).
- **`js/store.js`** — local prototype backend · **`js/store.supabase.js`** — shared backend (already written).
- **`supabase/schema.sql`** + **`supabase/seed.sql`** — run once in Supabase.
- **`standalone.html`** — single-file local build for double-click / Squarespace paste (regenerate with `python3 build-standalone.py`).
