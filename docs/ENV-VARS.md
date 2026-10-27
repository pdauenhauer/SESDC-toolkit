# Environment Variables

This project uses two separate `.env` files — one for the frontend (Vite) and one for the backend (Firebase Functions). Neither file should ever be committed to git (both are already in `.gitignore`).

---

## Frontend — `frontend/.env`

Create the file at `frontend/.env` by copying the example below. These values come from the Firebase console under **Project Settings → Your apps → SDK setup and configuration**.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Emulator flags (set to "true" when running firebase emulators:start locally)
VITE_USE_FIRESTORE_EMULATOR=false
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1
VITE_FIRESTORE_EMULATOR_PORT=8080
```

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (e.g. `sesdc-toolkit2.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID (e.g. `sesdc-toolkit2`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | GCS bucket (e.g. `sesdc-toolkit2.appspot.com`) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_USE_FIRESTORE_EMULATOR` | Set to `"true"` to point Firestore at the local emulator |
| `VITE_FIRESTORE_EMULATOR_HOST` | Emulator host (default `127.0.0.1`) |
| `VITE_FIRESTORE_EMULATOR_PORT` | Emulator port (default `8080`) |

### Local backend — `frontend/.env.local` *(optional)*

To send simulations to the local Functions emulator instead of the deployed
Cloud Functions, create `frontend/.env.local` (gitignored) and restart `npm run dev`:

```env
VITE_FUNCTIONS_BASE_URL=http://127.0.0.1:5001/sesdc-toolkit2/us-central1
```

| Variable | Description |
|---|---|
| `VITE_FUNCTIONS_BASE_URL` | Base URL for `run_simulation_post` / `get_stored_simulation`. Unset = deployed functions. The project ID in the URL must match the one the emulator runs as (start it with `--project sesdc-toolkit2`). |

---

## Backend (Functions) — `functions/.env`

Create the file at `functions/.env` by copying `functions/.env.example`:

```bash
cp functions/.env.example functions/.env
```

Then fill in the value:

```env
NLR_API_KEY=your_nlr_api_key_here
```

| Variable | Description |
|---|---|
| `NLR_API_KEY` | API key for the National Solar Radiation Database (NSRDB / NLR) used to fetch weather data for simulations |
| `GCS_BUCKET` | *(Optional)* Override the GCS bucket name. Defaults to `$GOOGLE_CLOUD_PROJECT.appspot.com` |

> **Emulator:** the functions declare `NLR_API_KEY` as a secret, so the emulator also reads it from `functions/.secret.local` (one line, `NLR_API_KEY=...`; gitignored). The emulator needs a Python virtual environment at `functions/venv` with `requirements.txt` installed.
>
> **Production:** `NLR_API_KEY` is stored as a Firebase Secret (Secret Manager). Set it via the Firebase console under **Functions → Configuration**, or with `firebase functions:secrets:set NLR_API_KEY`. The `functions/.env` file is only used for local emulator runs.
