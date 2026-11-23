# WatchTogether – Frontend (Milestone 1)

Plain HTML, CSS and JavaScript (ES modules). No build step.

## Pages
- `index.html` – register and login
- `user.html` – logged-in user: email, API calls used, and the AI movie finder
- `admin.html` – admins only: all registered users and their API call counts (the server returns 403 to non-admins)

## Configuration
Everything that talks to the backend is in `js/api.js`:
- `LOCAL_API_URL` – used when the page is opened from `localhost` (default `http://localhost:4537/api/v1`)
- `PRODUCTION_API_URL` – used everywhere else. Set it to your deployed backend URL, ending in `/api/v1`.

The backend's `CLIENT_ORIGIN` must be this frontend's exact origin (for example `http://localhost:5500` or `https://watchtogether-client.onrender.com`), otherwise CORS blocks the requests.

## Run locally
Start the backend first (see `backend/README.md`). Then, from the repo root, serve this folder on port 5500:
```
npx serve frontend -l 5500
```
or `python -m http.server 5500` from inside `frontend`, or VS Code "Live Server" on port 5500.

Open `http://localhost:5500` (use `localhost`, not `127.0.0.1`, so the login cookie is sent).

Demo accounts: `john@john.com` / `123` (user), `admin@admin.com` / `111` (admin).

## Deploy
Upload this folder as a static site on a different origin from the backend (the `render.yaml` Blueprint in the repo root does this on Render).
