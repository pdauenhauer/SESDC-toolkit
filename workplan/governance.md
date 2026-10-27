# Design Governance Document - SESDC-toolkit

## Overview
This document captures the current design, architectural, onboarding, and operational practices for the SESDC-toolkit project. It serves as the single authoritative reference for engineering standards and project lifecycle management.

## Project Architecture
The project is a microgrid design toolkit featuring a decoupled frontend and backend architecture:
- **Frontend**: Built with **Preact + TypeScript** (`@preact/preset-vite`), bundled using **Vite**, and served from `frontend/dist` via **Firebase Hosting**.
- **Backend**: Powered by **Firebase** and **Google Cloud Platform** (`us-central1` region, project `sesdc-toolkit2`).
    - **API Layer**: Firebase Cloud Functions (Python 3.13) handle requests (`run_simulation_post`, `get_stored_simulation`) and initiate tasks.
    - **Task Execution**: Long-running simulations are orchestrated via **Pub/Sub** and executed on **Google Cloud Run** to bypass standard function timeouts.
    - **Data Storage (3-Tier Hybrid Model)**:
        1. **Cloud Firestore**: Stores simulation metadata, run status, summary KPIs (`summaryKpis`), and compact pre-aggregated Tier-1 summaries (`tier1Summaries`: 20-year financials, monthly summaries) as native JSON for instant dashboard rendering.
        2. **Columnar Time-Series Storage (Apache Parquet on GCS + Google BigQuery)**: Stores a single canonical hourly time-series dataset per run in typed columnar format (`Parquet`) on Google Cloud Storage, bridged natively to **BigQuery** for windowed analytical queries and multi-scenario comparisons.
        3. **On-Demand CSV Export**: CSV is used strictly as an end-user download/export format, not as an internal intermediate state or primary API transport format.
- **Language Stack**: Python (Simulation & Functions), TypeScript (Frontend), and SQL-like rules for Firestore/Storage.

## Development Workflow

### Branching Strategy
- **Working Branch**: `test` is the primary branch for active development and automated CI/CD staging deployments.
- **Production**: `main` is reserved for substantial, stable changes.

### Environment, Prerequisites & Local Setup
- **Required Runtime Versions**:
    - **Node.js**: `20` (for frontend builds, Firebase CLI, and Vitest execution).
    - **Python**: `3.13` (for Firebase Cloud Functions and simulation execution, matching `python313` in `firebase.json`).
    - **Java**: `21` (Temurin distribution; required by `firebase-tools` to run the local/CI Firestore emulator).
- **Initial Repository Setup**:
    1. Clone the repository and check out the `test` branch.
    2. Install root dependencies: `npm install`
    3. Install frontend dependencies: `cd frontend && npm install`
    4. Install backend Python dependencies in a virtual environment:
       ```bash
       cd functions
       python -m venv venv
       # Activate venv (Windows: .\venv\Scripts\activate, macOS/Linux: source venv/bin/activate)
       pip install -r requirements.txt
       ```
    5. Authenticate and link the Firebase CLI (`npm install -g firebase-tools`):
       ```bash
       firebase login
       firebase use sesdc-toolkit2
       ```
    6. **Security Rule Precaution**: [firebase.json](file:///C:/Users/peter/Projects/SESDC-toolkit/firebase.json) is already tracked in git (`hosting.public` set to `frontend/dist`, rules in `firestore.rules` and `storage.rules`). Avoid re-running `firebase init`; if ever necessary, **never overwrite** existing `firestore.rules`, `storage.rules`, or `functions/` files.
- **Local Development & Emulators**:
    - Start the Firebase Emulator Suite (Auth `9099`, Functions `5001`, Firestore `8080`, Hosting `5005`, Storage `9199`) from the repository root: `firebase emulators:start`
    - Run the Vite frontend dev server (port `5173`) from `frontend/`: `npm run dev` (or `npm run build` / `npm run preview` for production builds).

### Environment Variables
The project uses two separate `.env` files (both gitignored and never committed):

1. **Frontend (`frontend/.env`)**:
   Injected at build/dev time by Vite (and via GitHub Secrets in CI):
   | Variable | Description |
   | :--- | :--- |
   | `VITE_FIREBASE_API_KEY` | Firebase Web API key |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (`sesdc-toolkit2.firebaseapp.com`) |
   | `VITE_FIREBASE_PROJECT_ID` | Firebase project ID (`sesdc-toolkit2`) |
   | `VITE_FIREBASE_STORAGE_BUCKET` | GCS bucket (`sesdc-toolkit2.appspot.com`) |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
   | `VITE_FIREBASE_APP_ID` | Firebase app ID |
   | `VITE_USE_FIRESTORE_EMULATOR` | Set to `"true"` to connect Firestore client to the local emulator |
   | `VITE_FIRESTORE_EMULATOR_HOST` | Emulator host (default `127.0.0.1`) |
   | `VITE_FIRESTORE_EMULATOR_PORT` | Emulator port (default `8080`) |

2. **Backend (`functions/.env`)**:
   Used for local emulator runs (copy from `functions/.env.example`):
   | Variable | Description |
   | :--- | :--- |
   | `NLR_API_KEY` | API key for the National Solar Radiation Database (NSRDB / NLR) weather API. Stored in Google Cloud Secret Manager (`firebase functions:secrets:set NLR_API_KEY`) in production. |
   | `GCS_BUCKET` | *(Optional)* Override the GCS bucket name (defaults to `<GOOGLE_CLOUD_PROJECT>.appspot.com`). |

### Frontend Standards
- **Project Layout**: Entry point is `frontend/src/main.tsx`. Routing is managed in `frontend/src/app.tsx` using `LocationProvider`, `Router`, and `Route` from `preact-iso`.
- **Component Architecture**:
    - Page-level components reside in `frontend/src/pages`.
    - Reusable leaf components reside in `frontend/src/components`.
    - Firestore access is encapsulated in `frontend/src/database/firestore.ts` rather than calling the SDK directly inside UI components; always guard authenticated calls with `auth.currentUser` checks and make reads resilient to missing fields.
- **Styling**: Current practice favors vanilla CSS files in `frontend/src/css/`.

### Backend & Simulation Standards
- **Architecture & Structural Typing**:
    - The simulation core follows a **modular, data-oriented, agent-based** design using a central **"Clock" engine** (`SimulationEngine` in `functions/engine/clock.py`), a unified **State Object** (`SimulationState` and `EpochModifiers` in `functions/engine/state.py`), and modular component models (`PVModel`, `WindModel`, `CoupledDispatchModel`, `GeneratorModel`, `BatteryModel`, `FinancialModel` in `functions/engine/models/`).
    - Component models, agents, and persistence adapters must conform to explicit `typing.Protocol` interfaces defined in `functions/engine/protocols.py` (`ComponentModelProtocol`, `BehavioralAgentProtocol`, `EvaluativeAgentProtocol`, `SimulationRepositoryProtocol`) rather than relying on untyped duck typing or deep inheritance trees.
- **Two-Timescale Execution, Coupled Dispatch & Data-Oriented Design**:
    - `SimulationState` stores time-series data as contiguous 1D/2D `float64` NumPy arrays (Structure of Arrays) alongside `EpochModifiers` vectors (`solar_derating`, `wind_derating`, `battery_soh`, `load_multiplier`, `generator_available`).
    - Exogenous physical potentials (solar, wind) are computed vectorially (`NumPy`).
    - State-dependent hourly dispatch runs in a single-pass, Numba `@njit`-compatible kernel (`run_coupled_dispatch_kernel` in `CoupledDispatchModel`) that enforces both battery charge and discharge kW ratings, discharges available battery storage *before* firing backup diesel generation, and tracks curtailed renewable power (`curtailed_power`).
    - Behavioral Agents execute at epoch/decision boundaries (daily/monthly/annually or event-driven) by mutating `EpochModifiers`.
- **Deterministic Reproducibility**:
    - All stochastic operations (agent perception noise, equipment failure events, Monte Carlo draws) must use an explicit seeded `np.random.Generator` (`np.random.default_rng(seed)`) attached to `SimulationState`—never global `random` or `np.random.seed()`.
- **Repository & Adapter Pattern (Offline/Emulator Parity)**:
    - External cloud dependencies (Firestore, GCS, BigQuery, Pub/Sub) must be accessed through repository/adapter interfaces (`functions/repository.py`) with in-memory/emulator implementations so `pytest` unit tests and local emulator workflows run completely offline without live GCP credentials.
- **Cold-Start Optimization**:
    - Heavy imports (`numpy`, `pandas`, `numba`, `pyarrow`, `google.cloud`) must remain lazy-loaded inside execution paths or worker containers so Firebase CLI discovery of `functions/main.py` never times out during deployment.
- **Data & Storage Standards**:
    - **No Intermediate CSVs**: Keep intermediate simulation arrays strictly in memory as typed NumPy arrays inside `SimulationState`. Do not persist redundant derived views as separate CSV blobs.
    - **Tiered Persistence**: Persist small scalar KPIs (`summaryKpis`) and 20-year/monthly summaries (`tier1Summaries`, < 15 KB) directly to **Firestore**. Persist canonical hourly time-series data as a single **Parquet** file in GCS and/or stream to **BigQuery**.
    - **Wire Format**: Serve downsampled, columnar numeric JSON arrays (`[timestamps[], series1[], ...]`) directly to `uPlot`, reserving CSV generation strictly for on-demand user file downloads.

### Frontend–Backend Contract Standards
- **Decoupled Evolution**: Frontend and backend must communicate through explicit, versioned data contracts (`functions/contracts.py`) covering HTTP request payloads, HTTP response envelopes, CSV column headers, and Firestore metadata schemas.
- **Additive Backward Compatibility**: Backend changes must preserve existing contract fields (`storagePath`, `csvKeys`, `csvBundle`, and CSV column schemas) until coordinated migrations occur; new capabilities (such as `summaryKpis`, `tier1Summaries`, `runId`, columnar series, or status fields) must be introduced additively.
- **Contract Testing**: Every backend PR/push must pass automated contract unit tests in `functions/tests/test_contracts.py` that verify request parsing and response serialization against canonical frontend payload fixtures.

### Iterative Workplan, Phase-Gate & Reflexive Governance
- **Rolling-Wave Planning**: Future phases in `workplan/blueprint.md` are intentionally treated as evolving directional outlines rather than fixed, predetermined specifications.
- **Phase-Transition Requirement**: As any current phase nears completion—or before beginning work on the next phase—contributors and AI agents must:
    1. Audit the actual state of the codebase (both `frontend/` and `functions/`) against `workplan/blueprint.md` and `workplan/governance.md`.
    2. Re-evaluate assumptions, technical constraints, parallel developer progress, and interface contracts based on lessons learned in the completing phase.
    3. Revise and fully flesh out the upcoming phase in `workplan/blueprint.md` into concrete, testable deliverables (and adjust or re-order later phases as needed) before writing implementation code.
- **Reflexive Governance Co-Update Rule**: Governance is a living system. Any commit or agent turn that adds or modifies a `.github/workflows/*.yml` file, runtime version (`firebase.json`), backend secret (`SecretParam`), `Protocol` interface (`functions/engine/protocols.py`), component model (`functions/engine/models/`), or architectural approach **must reflexively update `workplan/governance.md`, `workplan/blueprint.md`, and `functions/tests/test_governance.py` in the same change**.
- **Bidirectional Drift Enforcement (`functions/tests/test_governance.py`)**: Automated `pytest` assertions verify both that **code obeys governance** (lazy imports, `Protocol` conformance, seeded PRNG) and that **governance docs stay in sync with code** (every workflow, runtime version, secret, protocol, and component model in the repo must be documented in `workplan/governance.md` and `workplan/blueprint.md`).

## CI/CD, Testing & Deployment
- **Tools**: Managed via **GitHub Actions** (`.github/workflows/`), deploying to the `sesdc-toolkit2` Firebase project.
- **Workflows**:
    - `firebase-dev-deploy.yml`: Automatically builds the frontend (`frontend/`) with `VITE_FIREBASE_*` secrets and deploys to Firebase Hosting (`--only hosting`) on pushes to the `test` branch.
    - `firebase-functions-deploy.yml`: Sets up a Python 3.13 virtual environment, installs `functions/requirements.txt`, and deploys Firebase Cloud Functions (`--only functions`) on pushes to `test` modifying `functions/**` or via manual `workflow_dispatch`.
    - `e2e-emulators.yml`: Runs end-to-end (E2E) tests (`npm run test:e2e`) against the Firebase Auth and Firestore emulators on pushes and pull requests to `test`, or via manual `workflow_dispatch`.
    - `functions-unit-tests.yml`: Runs backend Python unit tests (`pytest`) on pull requests to `test`, pushes to `test` modifying `functions/**`, or via manual `workflow_dispatch`.
- **Testing Commands**:
    - **Frontend Unit Tests**: `npm run test:unit` (`vitest run`).
    - **Emulator E2E Tests**: `npm run test:e2e` (or `npm run test:emulators` — runs `vitest` inside `firebase emulators:exec --only auth,firestore --project demo-sesdc-toolkit`). In local dev mode (`import.meta.env.DEV`), `window.FirestoreSmokeTest` is also available in the browser console.
    - **Backend Unit, Contract & Governance Tests**: `npm run test:functions` (or `cd functions && python -m pytest tests/ -v`).
- **Required GitHub Secrets**: `FIREBASE_TOKEN` for Firebase CLI deployment authentication, along with `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` for frontend builds.
