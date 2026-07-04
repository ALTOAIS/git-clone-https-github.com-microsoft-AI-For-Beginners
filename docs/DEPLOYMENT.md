# Deploying Compliance Risk Hub (Render)

This repo includes a `render.yaml` "Blueprint" that provisions all three pieces of the
stack — the NestJS API, a managed PostgreSQL database, and the React SPA — from one GitHub
connection. Everything below is done through Render's website; no CLI or local setup needed.

Render's free tier has real limits worth knowing up front: free web services spin down after
~15 minutes of inactivity (the next request takes 30-60s to wake them back up), and free
Postgres databases are deleted after a fixed trial period. Check Render's current pricing page
if you want the app to stay always-on / the database to be permanent. File attachments are also
stored on the backend's local disk, which is wiped on every redeploy on the free plan — fine for
a demo, not for production use (a persistent Render Disk, or S3, is the fix for that later).

## 1. Deploy the blueprint

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to https://dashboard.render.com and sign up / log in (GitHub login is easiest).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub account if prompted, then select this repository.
5. Render will detect `render.yaml` and show two services (`crh-backend`, `crh-frontend`) plus
   a database (`crh-postgres`). Click **Apply**.
6. Wait for `crh-backend` to finish building and deploying (first build takes a few minutes —
   it also runs the database migrations automatically on startup). The frontend build will
   likely fail or point at the wrong API on this first pass — that's expected, fixed in step 2.

## 2. Point the frontend at the real backend URL

1. Once `crh-backend` is live, open its page in the Render dashboard and copy its URL, e.g.
   `https://crh-backend-xxxx.onrender.com`.
2. Open the `crh-frontend` service → **Environment** tab.
3. Edit the `VITE_API_URL` variable to `https://crh-backend-xxxx.onrender.com/api`
   (your real backend URL + `/api`).
4. Save, then trigger **Manual Deploy** → **Deploy latest commit** on `crh-frontend` so it
   rebuilds with the correct API URL baked in (Vite reads this at build time, not runtime).

## 3. Lock down CORS to the real frontend URL

1. Once `crh-frontend` is live, copy its URL too, e.g. `https://crh-frontend-xxxx.onrender.com`.
2. Open `crh-backend` → **Environment** tab, edit `CORS_ORIGIN` from `*` to that exact URL.
3. Save — Render redeploys the backend automatically on env var changes.

## 4. Load demo data (optional)

`crh-backend` → **Shell** tab → run:

```
npx prisma db seed
```

This creates the demo companies/departments/users/risks described in the root `README.md`
(all demo accounts use password `ChangeMe123!`). Safe to re-run; it skips records that already
exist.

## 5. Open the app

Visit the `crh-frontend` URL from step 3 and log in with a demo account, e.g.
`admin@crh.local` / `ChangeMe123!`.

---

### Why not one click with zero manual steps?

Vite bakes `VITE_API_URL` into the frontend's static JS at *build time*, and Render assigns
each service's public URL only after it's created — so the frontend can't know the backend's
final URL until the backend already exists. Steps 2-3 above are that one-time wiring; every
subsequent push to `main` redeploys both services automatically with no manual steps.
