# Bio-Inspired Design Atlas

A community-curated database + discussion board + interactive map for bio-inspired
robotics papers, built around the taxonomy in **Zhang, Ting & Moore (2026),
*"Justifying bio-inspired robotics research: A taxonomy of strategies."***

People can **submit papers**, propose an **initial classification with a
justification**, **discuss each paper in a Reddit-style comment thread**, and the
whole corpus is **plotted on a map like Figure 2** — where every paper's position
is the *average of the classifications the community attaches to it*.

> **Note on this folder.** This app lives in its own `atlas/` subfolder because
> the repository root is a separate, unrelated project (a Pinterest MCP
> connector). Everything the Atlas needs is inside `atlas/`; it has no
> dependency on anything at the root.

---

## What's here

| File | Purpose |
|------|---------|
| `index.html` | The app shell (loads the four scripts below). |
| `styles.css` | All styling. |
| `js/data.js` | The 7 taxonomy categories, the two axes, and ~34 seed papers from Fig. 2. |
| `js/store.js` | **Data-access layer.** Ships a browser-`localStorage` implementation. Every method is `async` so it can be swapped for Supabase with no UI changes. |
| `js/plot.js` | The interactive "Figure 2" scatter plot (dependency-free SVG). |
| `js/app.js` | UI: paper list, detail view, threaded comments, voting, the classification slider widget, and the submit modal. |
| `supabase/schema.sql` | The real Postgres backend (tables, derived views, row-level security). |

**Zero dependencies, no build step.** It's plain HTML/CSS/JS.

---

## How the map position is computed

This is the core mechanic. A paper is **not** placed by a single label. Instead:

1. Each **classification suggestion** contributes a point `(x, y)` on the two
   axes plus one or more **category tags** and a written justification.
   - `x`: `0` = purely **Scientific** contribution … `1` = purely **Engineering**.
   - `y`: `0` = **low** engagement with biology … `1` = **high** engagement.
2. Suggestions come from the **original submission** and from **any comment**
   where the commenter ticks *"Attach a classification."*
3. The paper's plotted position is the **mean of all its suggestion points**; its
   dot color is the **top-voted category**; the detail panel shows the full
   category tally. Add a comment with a new classification and the dot **moves**.
   (Deleting a comment also removes its classification, so the map re-averages.)

So the map genuinely redraws itself "based on the content of the comments," while
staying transparent and reproducible (no black-box inference).

---

## Run it locally

**Easiest — just open it:** double-click **`atlas/standalone.html`**. This is a
single self-contained file (CSS + JS all inlined, no external loads), so it opens
reliably straight from disk in any browser.

> ⚠️ Don't double-click `index.html` — some browsers block the separate `js/*.js`
> files on a `file://` page, which leaves the plot blank. `index.html` is the
> maintainable multi-file version; use it via a local server or GitHub Pages. If
> it ever fails, a red error box now tells you exactly what was blocked.

**Serve the multi-file version over HTTP** (recommended for development, and what
GitHub Pages does):

```bash
cd atlas
python3 -m http.server 8000
# open http://localhost:8000
```

In prototype mode all data lives in your browser's `localStorage`. Use **Reset
demo** to restore the seed papers. If your browser blocks storage (Safari private
mode, or quota exceeded), a red banner warns you that changes won't persist.

### Regenerating the single file
`standalone.html` is generated from the multi-file source. After editing
`index.html`, `styles.css`, or any `js/*.js`, rebuild it:

```bash
cd atlas
python3 build-standalone.py
```

---

## Deploy the prototype

### Option A — GitHub Pages (recommended)
1. Put the **contents of `atlas/`** at the root of a repo's `main` branch
   (so `index.html` is at the repo root of *that* repo).
2. Repo **Settings → Pages → Source: "Deploy from a branch"**, branch `main`,
   folder `/ (root)`. Save.
3. Live at `https://<user>.github.io/<repo>/`.

### Option B — Squarespace
Two ways:
- **Embed the GitHub Pages site** (cleanest — auto-updates when you push) with a
  Code Block:
  ```html
  <iframe src="https://<user>.github.io/<repo>/"
          style="width:100%;height:900px;border:0" loading="lazy"></iframe>
  ```
- **Or paste `standalone.html`** into a Code Block / Code Injection. Because it's
  one self-contained file with no external loads, its contents run inline. (You'd
  re-paste it whenever you change the app.)

> ⚠️ On GitHub Pages / Squarespace the prototype still stores data **per-visitor**
> in their own browser. For a *shared* database that everyone sees, do the
> Supabase step below.

---

## Going live with Supabase (shared data + Google/ORCID sign-in)

**The Supabase backend is already built** — `js/store.supabase.js` (the adapter),
the auth UI, and `supabase/schema.sql` + `supabase/seed.sql`. Going live is
account setup + pasting two values into `js/config.js`. `js/app.js` doesn't
change; it uses whichever store is configured.

👉 **Follow [DEPLOY.md](DEPLOY.md) for the step-by-step.** In short:

### 1. Create the database
- Create a free project at [supabase.com](https://supabase.com).
- **SQL Editor** → run `supabase/schema.sql` (tables, the `paper_positions` and
  `paper_category_tally` views, RLS policies), then run `supabase/seed.sql` (loads
  the 34 Figure-2 papers).

### 2. Connect the app
- Copy your **Project URL** + **anon public** key from Supabase → Settings → API.
- Paste them into `js/config.js`. Empty = localStorage prototype; filled = shared
  Supabase backend (the app loads the Supabase client on demand and shows sign-in).

### 3. Turn on auth
- **Google:** enable the Google provider in Supabase with an OAuth client
  ID/secret from Google Cloud Console; add Supabase's callback to Google's
  redirect URIs.
- **ORCID:** add it under **Authentication → Providers → Custom (OIDC)** with
  issuer `https://orcid.org` (sandbox for testing).

### 4. How the built adapter bridges the two backends
`store.supabase.js` reconciles these intentional differences (verified against the
code and the mock-client test):

| Concern | Prototype (`store.js`) | Supabase (`schema.sql`) | What the adapter does |
|---|---|---|---|
| **Averaging & tally** | computed in JS in `decoratePaper()` | `paper_positions` + `paper_category_tally` **SQL views** | read the views instead of computing |
| **Comment votes** | a `voters` map on each comment | a separate `votes` table (one row per user/comment) | aggregate votes per comment on read |
| **Tally shape** | `{ id, count }`, top-category tie-broken by the JS category order | view columns are `category_id`, `votes`; no built-in tie-break | rename `category_id→id`, `votes→count`; re-apply the fixed category order for stable ties |
| **Identity** | free-text display name (`author`) | `author_id uuid = auth.uid()` + `author_name` | write both `author_id` and `author_name`; display the name |
| **Delete auth** | compares the display-name string | RLS `author_id = auth.uid()` | rely on RLS; drop the client-side name check |
| **Vote identity** | random per-browser `getClientId()` | `votes.user_id = auth.uid()` | use the signed-in user id for votes |
| **Record ids** | app-generated `pp_/cm_/sg_` strings | server-side `uuid` defaults | let Postgres mint ids; use the returned uuid |
| **Prototype-only helpers** | `resetToSeed()`, `getUser()`, `setUser()`, `isStorageHealthy()` | no equivalent | stub these (auth session replaces get/set user) |

`supabase/seed.sql` is generated from `js/data.js` — regenerate it if you change
the seed papers (see the node one-liner in git history, or just hand-edit).

---

## Notes & next steps
- **Moderation:** with RLS + required sign-in, only authors can edit/delete their
  own content. For spam, add a Supabase Edge Function or a simple report button.
- **Category definitions** and seed positions in `js/data.js` are editable — the
  blurbs are paraphrased from the paper; refine as you like.
- **Seed positions are approximate** placements matching Fig. 2; the community
  average will move them over time. That's the point.
