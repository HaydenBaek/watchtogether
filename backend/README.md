# WatchTogether – Backend (Milestone 1)

Express + PostgreSQL API. A self-hosted Hugging Face model turns text into genres, and TMDB supplies the movies.

Commands are shown for **Mac/Linux** and **Windows (PowerShell)**. On Windows you can also use Git Bash and run the Mac/Linux commands as written.

## 0. What you need first
- Node 18 or newer (`node -v` to check)
- PostgreSQL, running locally
  - Windows: `psql` and `createdb` must be on your PATH. If not, add `C:\Program Files\PostgreSQL\<version>\bin` to PATH and open a new terminal (or create the database in pgAdmin instead).
- A free TMDB account. Get your **API Read Access Token** at TMDB → Settings → API.

## 1. Install
```
cd backend
npm install
```
(On Windows, if `bcrypt` fails to install, install the "Desktop development with C++" tools from Visual Studio Build Tools and try again.)

## 2. Set up .env
Mac/Linux:
```
cp .env.example .env
```
Windows (PowerShell):
```
copy .env.example .env
```
Edit `.env`:
- `DATABASE_URL` – your PostgreSQL connection string
- `JWT_SECRET` – any long random string
- `TMDB_TOKEN` – your TMDB API Read Access Token
- `CLIENT_ORIGIN` – where the frontend runs: `http://localhost:5500` (no trailing slash, and use `localhost`, not `127.0.0.1`)
- `PORT` – `4537`. If you change it, also change `API_BASE_URL` in `frontend/js/api.js` to match.
- `ALLOW_MODEL_DOWNLOAD` – `true` for the first run, then `false`
- `NODE_ENV` – `development` locally, `production` when deployed

## 3. Create the database tables
Mac/Linux:
```
createdb watchtogether
psql "$DATABASE_URL" -f sql/schema.sql
```
Windows (PowerShell):
```
createdb watchtogether
psql $env:DATABASE_URL -f sql/schema.sql
```
`$env:DATABASE_URL` only works if the variable is set in your shell. If it isn't, paste your real connection string instead, e.g. `psql "postgresql://user:password@localhost:5432/watchtogether" -f sql/schema.sql`.

## 4. Seed the demo accounts
```
npm run seed
```
Creates `john@john.com` / `123` (user) and `admin@admin.com` / `111` (admin).

## 5. Download the model (first time only)
With `ALLOW_MODEL_DOWNLOAD=true`, run `npm start`. The model downloads into `backend/models`. When "AI model ready." prints, stop the server (Ctrl+C).

Then set `ALLOW_MODEL_DOWNLOAD=false` and start again. The server now uses only the local files, which shows the model is self-hosted. (If the model files are missing, startup fails.)

## 6. Run locally
```
npm start
```
API runs at `http://localhost:4537/api/v1`.

In a second terminal, serve the `frontend` folder on port **5500** (it must match `CLIENT_ORIGIN`). From the repo root, on Mac/Linux and Windows:
```
npx serve frontend -l 5500
```
or use the VS Code "Live Server" extension on port 5500. Then open `http://localhost:5500`.

Cookies with `sameSite: lax` work between `localhost:5500` and `localhost:4537` because both are the same site.

If something else already uses your port, you'll see `EADDRINUSE`. Pick another `PORT` and update `api.js`.

## 7. Deploy
**Backend** (`[BACKEND HOST]`):
1. Set the environment variables from `.env.example` on the host, with `NODE_ENV=production` and `CLIENT_ORIGIN` set to the real frontend URL.
2. Run `schema.sql` and the seed script against the production database.
3. Make sure the `models` folder is on the server (run once with `ALLOW_MODEL_DOWNLOAD=true`, or upload it), then set `ALLOW_MODEL_DOWNLOAD=false`.
4. Start with `npm start`. The backend must use HTTPS, because production cookies are `secure` + `sameSite: none`.

**Frontend** (`[FRONTEND HOST]`):
1. In `frontend/js/api.js`, change `API_BASE_URL` to your deployed backend URL (ending in `/api/v1`).
2. Upload the `frontend` folder as static files.
