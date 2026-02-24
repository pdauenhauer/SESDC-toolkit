## GitHub Actions (CI/CD)

We use **GitHub Actions** both for deployment and for emulator‑backed tests.

- **Deploy workflow**
  - File: `.github/workflows/firebase-dev-deploy.yml`.
  - Trigger: `on: push: branches: [ test ]` (build + deploy frontend to Firebase Hosting).

- **E2E emulator workflow**
  - File: `.github/workflows/e2e-emulators.yml`.
  - Triggers: on `push` and `pull_request` to `test`, plus `workflow_dispatch` for manual runs.
  - Runs Node 20 + Java 17, installs root deps with `npm ci`, then executes `npm run test:e2e`, which starts the Firebase **Auth + Firestore emulators** and runs our Vitest suite against them.

- **Language & tooling**
  - **Runner**: `ubuntu-latest`.
  - **Node**: `actions/setup-node@v4` with Node 20.
  - **Firebase CLI**: installed globally with `npm install -g firebase-tools`.

- **Workflow steps**
  - **Checkout**: `actions/checkout@v4` to pull the repo.
  - **Install frontend deps**: `cd frontend && npm ci`.
  - **Build frontend**: `cd frontend && npm run build` with `VITE_FIREBASE_*` env vars coming from GitHub secrets.
  - **Deploy hosting**: `firebase deploy --only hosting --project sesdc-toolkit2 --token $FIREBASE_TOKEN`.

- **Secrets used**
  - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`: passed into the build step.
  - `FIREBASE_TOKEN`: service token for `firebase deploy`.

- **Tips & tricks**
  - If a deploy fails, check the **Actions logs** for:
    - Vite build failures (TypeScript/Preact issues).
    - Missing or misconfigured `VITE_FIREBASE_*` secrets.
    - Firebase CLI auth issues with `FIREBASE_TOKEN`.
  - For staging vs production, consider separate workflows and Firebase projects; this workflow currently deploys only to the `sesdc-toolkit2` dev site.
