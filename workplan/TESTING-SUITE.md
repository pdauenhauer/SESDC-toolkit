## Testing suite

We currently have **Vitest** for unit tests and some Firebase‑focused smoke tests.

- **Language & tools**
  - **Test runner**: `vitest` (configured in root `package.json`).
  - **Emulators**: Firebase emulators can be used to run tests against local Auth/Firestore.

- **NPM scripts (root `package.json`)**
  - **`npm run test:unit`** → `vitest run`
    - Runs the unit test suite once in headless mode.
  - **`npm run test:e2e`** → `firebase emulators:exec --only auth,firestore --project demo-sesdc-toolkit "npm run test:unit"`
    - Spins up the Auth + Firestore emulators, then runs the unit tests inside that context.
  - **`npm run test:emulators`** → alias to `npm run test:e2e`.

- **Firestore smoke test (frontend)**
  - In `frontend/src/main.tsx`, when `import.meta.env.DEV` is true, we lazy‑load `./utils/firebase/tests/testdb`.
  - This exposes `window.FirestoreSmokeTest` with helpers like `runSmokeTest` and `cleanupSmokeTest` for manual sanity checks against Firestore during local dev.

- **Tips & tricks**
  - Keep **pure logic** (e.g. calculation helpers) in small modules so they are easy to unit‑test with Vitest.
  - When adding tests that hit Firestore, prefer the emulator‑based `test:e2e` flow instead of real production data.
  - Run tests locally before pushing to `test` if you are changing core simulation logic or Firestore schemas.
