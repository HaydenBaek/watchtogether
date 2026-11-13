# WatchTogether – Backend (Milestone 1)

Express + PostgreSQL API. A self-hosted Hugging Face model turns text into genres, and TMDB supplies the movies.

## 1. Install
```
cd backend
npm install
```
Requires Node 18+ and PostgreSQL.

## 2. Set up .env
```
cp .env.example .env
```
Edit `.env`:
- `DATABASE_URL` – your PostgreSQL connection string
- `JWT_SECRET` – any long random string
- `TMDB_TOKEN` – the "API Read Access Token" from your TMDB account settings
- `CLIENT_ORIGIN` – where the frontend runs, e.g. `http://localhost:5500` (no trailing slash)
- `ALLOW_MODEL_DOWNLOAD` – `true` for the first run, then `false`
- `NODE_ENV` – `development` locally, `production` when deployed

## 3. Create the database tables
```
createdb watchtogether
psql "$DATABASE_URL" -f sql/schema.sql
```

## 4. Seed the demo accounts
```
npm run seed
```
Creates `john@john.com` / `123` (user) and `admin@admin.com` / `111` (admin).

## 5. Download the model (first time only)
With `ALLOW_MODEL_DOWNLOAD=true`, run `npm start`. The model downloads into `backend/models` (a few hundred MB at most). When "AI model ready." prints, stop the server.

Then set `ALLOW_MODEL_DOWNLOAD=false` and start again. The server now uses only the local files, which shows the model is self-hosted. (If the model files are missing, startup fails.)

## 6. Run locally
```
npm start
```
API runs at `http://localhost:3000/api/v1`.

Serve the `frontend` folder with any static server (for example the VS Code "Live Server" extension on port 5500, or `npx serve frontend -l 5500`). Open `index.html`. Make sure the port/origin matches `CLIENT_ORIGIN`.
Cookies with `sameSite: lax` work between `localhost:5500` and `localhost:3000` because both are the same site.

## 7. Deploy
**Backend** (`[BACKEND HOST]`):
1. Set the environment variables from `.env.example` on the host, with `NODE_ENV=production` and `CLIENT_ORIGIN` set to the real frontend URL.
2. Run `schema.sql` and the seed script against the production database.
3. Make sure the `models` folder is on the server (run once with `ALLOW_MODEL_DOWNLOAD=true`, or upload it), then set `ALLOW_MODEL_DOWNLOAD=false`.
4. Start with `npm start`. The backend must use HTTPS, because production cookies are `secure` + `sameSite: none`.

**Frontend** (`[FRONTEND HOST]`):
1. In `frontend/js/api.js`, change `API_BASE_URL` to your deployed backend URL (ending in `/api/v1`).
2. Upload the `frontend` folder as static files.
