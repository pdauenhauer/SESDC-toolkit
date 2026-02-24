## Firebase usage

We use **Firebase** for auth, data, storage, hosting, and backend logic.

- **Language & SDKs**
  - **Frontend**: TypeScript with the modular **Firebase JS SDK v9+** (`firebase` package).
  - **Backend**: **Python** Cloud Functions using `firebase_functions`

- **Auth**
  - Configured in `frontend/src/utils/firebase/firebase-init.ts`.
  - **Auth object**: `auth = getAuth(app)`; we use it via `onAuthStateChanged` (see `Projects.tsx`) and for login/logout flows.
  - **Tips**: Always guard Firestore / function calls with `auth.currentUser` checks; unauthenticated users should see safe fallbacks, not errors.

- **Firestore**
  - Frontend access via `db = getFirestore(app)`.
  - Higher‑level helpers live in `frontend/src/database/firestore.ts` (e.g. `listProjects`, `getProjectLoads`, `saveProjectLoads`).
  - Projects are documents in a `projects` collection; loads are stored under a per‑project document.
  - **Tips**:
    - Prefer moving Firestore logic into `database/` helpers instead of calling the SDK directly from components.
    - When you add new fields, make your reads **resilient to missing data** (use default values or make them optional).

- **Cloud Functions (Python)**
  - Lives under `functions/` with a Python 3.13 runtime (see `firebase.json`).
  - Main entry is `functions/main.py` which exposes `fetch_solar_data_function` via `@https_fn.on_request(cors=...)`.
  - The function:
    - Accepts JSON from the frontend (project inputs, load profile, tech flags).
    - Calls the **NREL NSRDB** API (Meteosat Prime Meridian dataset) to fetch irradiance + weather at a given WKT point.
    - Runs the simulation (using `calculations.py`) and returns **JSON of CSV strings** for multiple outputs (inputs, hourly series, daily, 20‑year financials, etc.).
    - NOTE: This will be rewritten asap.
  - **Tips**:
    - Heavy imports (`numpy`, `pandas`, `calculations`) are lazy‑loaded inside functions to avoid deploy‑time timeouts.
    - CORS is open (`cors_origins=["*"]`) for now; if you lock this down, remember to include both local dev and hosting origins.
    - Use `print(...)` in Python for logging; you’ll see these in Cloud Logging under the function’s logs.

- **Firebase Hosting**
  - Config in `firebase.json` points `hosting.public` to `frontend/dist` (Vite build output).
  - GitHub Actions (`.github/workflows/firebase-dev-deploy.yml`) builds the frontend and then runs `firebase deploy --only hosting` to publish.

- **Emulators & local dev**
  - `firebase.json` defines emulators for **auth**, **firestore**, **functions**, **hosting**, **storage**.
  - Use `firebase emulators:start` (from the repo root) for a full local stack.
  - Frontend dev (`npm run dev` in `frontend`) can talk to emulated services if you configure the SDKs appropriately.

- **Gotchas / tips**
  - **Env vars**: The frontend relies on `VITE_FIREBASE_*` env vars; in CI these are wired via GitHub secrets. Locally, add them to `.env`.
  - **Regions**: The function is deployed to `us-central1`; when calling over HTTP from the frontend we construct the URL using `VITE_FIREBASE_PROJECT_ID` and that region.
  - **NREL API**: The backend hard‑codes an NREL API key and dataset; if you change datasets or locations, watch the Cloud Function logs for "No data available at the provided location" style errors.
