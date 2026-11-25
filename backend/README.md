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
```
npm run download-model
```
This downloads [MoritzLaurer/deberta-v3-xsmall-zeroshot-v1.1-all-33](https://huggingface.co/MoritzLaurer/deberta-v3-xsmall-zeroshot-v1.1-all-33) into `backend/models/MoritzLaurer/deberta-v3-xsmall-zeroshot-v1.1-all-33/`:
- `onnx/model_quantized.onnx` (~87 MB, 8-bit quantized weights, the file the server runs)
- `tokenizer.json`, `tokenizer_config.json`, `config.json`

Then set `ALLOW_MODEL_DOWNLOAD=false`. The server now uses only the local files, which shows the model is self-hosted. (If the model files are missing, startup fails.) The quantized model keeps the server around 420 MB of RAM, so it fits a 512 MB free hosting plan.

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

**Tests:**
```
npm test
```
The tests in `test/` run the real app with fakes for the database, the AI model and TMDB, so they don't need `.env`, Postgres, the model files or a TMDB token. GitHub runs them on every pull request.

## 7. Deploy (Render, free plan)
`render.yaml` in the repo root describes all three pieces: the API (Node web service), the client (static site, a different origin) and a PostgreSQL database.

1. Push the code to GitHub.
2. Render dashboard → **New → Blueprint** → pick this repo → **Apply**. Keep the service names `watchtogether-api` and `watchtogether-client` so the URLs are predictable. When asked, enter `TMDB_TOKEN` (your TMDB API Read Access Token). `CLIENT_ORIGIN` is preset to `https://watchtogether-client.onrender.com`.
3. What Render does:
   - **Build:** `npm ci && npm run download-model` puts the model files in `backend/models` on the server.
   - **Start:** `node scripts/setupDb.js && node server.js` creates the tables if missing, creates the demo accounts if missing, then starts the API with `ALLOW_MODEL_DOWNLOAD=false` (local model files only). The log shows `AI model ready. Running local file: .../onnx/model_quantized.onnx`.
4. If Render added a suffix to either name (because it was taken), update **both** `CLIENT_ORIGIN` (API service → Environment) and `PRODUCTION_API_URL` in `frontend/js/api.js`, then push.
5. Check `https://<api-url>/api/v1/health` returns `{"status":"ok"}`, then log in on the client URL in **Chrome**.

Notes:
- **Memory:** the free plan has 512 MB. Measured in a 512 MB Linux container with these exact commands, the server uses about 430 MB (RSS) and survived 40 AI requests, 4 at a time. Three settings keep it there; don't undo them: the 8-bit model (`dtype: 'q8'`), ONNX graph optimizations turned off (`aiModel.js`), and starting with `node` directly instead of `npm start` (an npm wrapper process costs about 60 MB). If the API still restarts with an out-of-memory error, it needs a paid instance.
- **`.npmrc`:** on Linux, `onnxruntime-node` tries to download CUDA (GPU) binaries during `npm ci`, and that download 404s and fails the build. `backend/.npmrc` (and `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` in `render.yaml`) skips it. We only use the CPU.
- **Cold starts:** free services sleep after 15 minutes without traffic, and the first request after that takes about a minute. Open `https://<api-url>/api/v1/health` a few minutes before a demo or marking.
- **Database expiry:** Render's free PostgreSQL expires about 30 days after it's created. That's fine for Milestone 1. Before then, point `DATABASE_URL` at a permanent database (e.g. Neon's free tier); `setupDb.js` creates the tables on the next start.
- HTTPS is provided by Render. It is required, because production cookies are `secure` + `sameSite: none`. Safari may block this cross-site cookie; test in Chrome.
- No shell is needed: `setupDb.js` can be rerun safely (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

**Other hosts (e.g. Railway):** root directory `backend`. Set the variables from `.env.example` (`NODE_ENV=production`, `ALLOW_MODEL_DOWNLOAD=false`). Build with `npm ci && npm run download-model`, start with `node scripts/setupDb.js && node server.js`, and serve the `frontend` folder as static files from a different origin.
