# Design Governance Document - SESDC-toolkit

## Overview
This document captures the current design, architectural, onboarding, and operational practices for the SESDC-toolkit project. It serves as the single authoritative reference for engineering standards and project lifecycle management.

## Project Architecture
The project is a microgrid design toolkit featuring a decoupled frontend and backend architecture:
- **Frontend (Preliminary — Subject to Frontend Developer Review)**: Currently built with **Preact + TypeScript** (`@preact/preset-vite`), bundled using **Vite**, and served from `frontend/dist` via **Firebase Hosting**. *(Note: All frontend architectural choices, UI patterns, and charting conventions are preliminary and are not established as permanent canon until reviewed, verified on `test`, and ratified with the frontend developer).*
- **Backend**: Powered by **Firebase** and **Google Cloud Platform** (`us-central1` region, project `sesdc-toolkit2`).
    - **API Layer**: Firebase Cloud Functions (Python 3.13) handle requests (`run_simulation_post`, `get_stored_simulation`) and initiate tasks.
    - **Task Execution**: Long-running simulations are orchestrated via **Pub/Sub** and executed on **Google Cloud Run** to bypass standard function timeouts.
    - **Data Storage (3-Tier Hybrid Model)**:
        1. **Cloud Firestore**: Stores simulation metadata, run status, summary KPIs (`summaryKpis`), and compact pre-aggregated Tier-1 summaries (`tier1Summaries`: 20-year financials, monthly summaries) as native JSON for instant dashboard rendering.
        2. **Columnar Time-Series Storage (Apache Parquet on GCS + Google BigQuery)**: Stores a single canonical hourly time-series dataset per run in typed columnar format (`Parquet`) on Google Cloud Storage, bridged natively to **BigQuery** for windowed analytical queries and multi-scenario comparisons.
        3. **On-Demand CSV Export**: CSV is used strictly as an end-user download/export format, not as an internal intermediate state or primary API transport format.
- **Language Stack**: Python (Simulation & Functions), TypeScript (Frontend — Preliminary), and SQL-like rules for Firestore/Storage.

## Development Workflow

### Multi-Developer Branching, `test` Staging Deployment & Dev Acceptance
To support parallel frontend and backend development (and multiple AI-assisted contributors) without deployment collisions or unreviewed breaking changes:
1. **Scoped Topic Branches**:
    - Active coding happens on short-lived, domain-scoped branches (`be/<topic>` for backend/simulation, `fe/<topic>` for frontend/UI, `chore/<topic>` for repository hygiene/docs).
    - Contributors and AI agents do **not** commit or push directly to `test` or `main` unless explicitly authorized.
2. **Pull Request Firewall into `test`**:
    - Opening a PR targeting `test` triggers automated pre-merge verification: backend unit, contract, and governance drift tests (`functions-unit-tests.yml`) and Firebase Emulator E2E tests (`e2e-emulators.yml`).
    - Cross-domain PRs (e.g., touching `functions/contracts.py`, `firestore.rules`, or both `frontend/` and `functions/`) require review from the affected domain owner.
    - For frontend PRs, Firebase Hosting Preview Channels may be used to inspect UI changes on a temporary preview URL prior to merging into `test`.
3. **Staging Auto-Deploy (`test`) & Dev Acceptance Lifecycle**:
    - **`test` (Shared Integration & Staging Branch)**: Merging a PR into `test` automatically deploys to the `sesdc-toolkit2` staging environment via `firebase-dev-deploy.yml` and `firebase-functions-deploy.yml`.
    - **4-Stage Dev Acceptance Lifecycle**: All deliverables in `workplan/blueprint.md` progress through:
        1. `In Progress` (on scoped branch)
        2. `On test (Staging)` (merged to `test`, deployed to staging for integration testing)
        3. `Dev Accepted [FE/BE Sign-Off]` (verified on staging and accepted by the relevant developer(s))
        4. `Promoted to main` (production release)
    - **Graduating from Preliminary to Canon**: Any item marked **Preliminary** (such as frontend conventions, charting workflows, or Runtime Admin Viewer designs) only becomes authoritative **Canon** in this governance document once co-designed, deployed to `test`, and marked `Dev Accepted`.
4. **Production (`main`)**:
    - `main` is reserved for stable, `Dev Accepted` releases promoted from `test`.

### Tiered Agent Autonomy & Approval Guardrails ("Traffic Light" Matrix)
AI agents operating in this repository must follow the 3-tier approval protocol (enforced via `GEMINI.md` and `workplan/governance.md`):

| Zone | Agent Requirement | Scope of Actions |
| :--- | :--- | :--- |
| **🟢 Green Zone**<br>*(Autonomous Execution)* | Proceed directly, verify with tests, and report results. | • Internal code/model implementation within the active scoped directory (e.g., `functions/engine/`) preserving existing contracts.<br>• Adding/updating unit, contract, governance, or emulator tests (`functions/tests/`, `tests/`).<br>• Running read-only audits, searches, and test suites (`pytest`, `vitest`).<br>• Routine reflexive updates to `workplan/blueprint.md` trackers for approved work. |
| **🟡 Yellow Zone**<br>*(Propose & Confirm)* | Pause and present a brief 2–3 bullet impact summary; wait for user confirmation before applying. | • **Additive Contract/Schema Extensions**: Adding new optional fields to `functions/contracts.py` or `functions/firestore_helpers.py`.<br>• **Dependency Updates**: Modifying `functions/requirements.txt`, root `package.json`, or `frontend/package.json`.<br>• **Phase-Gate Transitions**: Moving a provisional phase in `workplan/blueprint.md` into active implementation.<br>• **Bulk File Cleanup**: Deleting files/directories (including audited Bucket A/B legacy vestiges). |
| **🔴 Red Zone**<br>*(Hard Stop — Explicit Sign-Off)* | Mandatory stop; explain blast radius, security/cost impact, or cross-dev impact and wait for explicit approval. | • **Cross-Domain Edits**: Modifying `frontend/**` during a backend task (or `functions/**` during a frontend task) without the owning developer's sign-off.<br>• **Breaking Contract Changes**: Renaming, removing, or changing types of existing fields in `functions/contracts.py` (`storagePath`, `csvKeys`, `csvBundle`, `EXPECTED_CSV_COLUMNS`).<br>• **Security, IAM & Infra Configs**: Modifying `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`, or `.github/workflows/*.yml`.<br>• **Cloud Cost, Quotas & Services**: Changing function memory/timeout/concurrency, provisioning new GCP services (Cloud Run, BigQuery, Pub/Sub), or changing external API (`NLR_API_KEY`) call patterns.<br>• **Git Push & Deployments**: Executing `git push`, `firebase deploy`, or merging branches into `test` or `main`. |

### Environment, Prerequisites & Local Setup
- **Required Runtime Versions**:
    - **Node.js**: `20` (for frontend builds, Firebase CLI, and Vitest execution).
    - **Python**: `3.13` (for Firebase Cloud Functions and simulation execution, matching `python313` in `firebase.json`).
    - **Java**: `21` (Temurin distribution; required by `firebase-tools` to run the local/CI Firestore emulator).
- **Initial Repository Setup**:
    1. Clone the repository and check out a scoped branch from `test`.
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

### Frontend Standards (Preliminary — Subject to Frontend Developer Review)
> **Preliminary Status (Not Yet Canon)**: All frontend standards, directory layouts, routing conventions, component boundaries, state/database wrappers, styling choices, and charting libraries (`uPlot`) described below represent the current baseline only. They are **preliminary** and will not be established as authoritative canon until reviewed, revised, and marked `Dev Accepted` on `test` with the frontend developer.

- **Project Layout (Preliminary)**: Entry point is currently `frontend/src/main.tsx`. Routing is managed in `frontend/src/app.tsx` using `LocationProvider`, `Router`, and `Route` from `preact-iso`.
- **Component Architecture (Preliminary)**:
    - Page-level components currently reside in `frontend/src/pages`.
    - Reusable leaf components currently reside in `frontend/src/components`.
    - Firestore access is currently encapsulated in `frontend/src/database/firestore.ts` rather than calling the SDK directly inside UI components; always guard authenticated calls with `auth.currentUser` checks and make reads resilient to missing fields.
- **Styling (Preliminary)**: Current baseline uses vanilla CSS files in `frontend/src/css/` (subject to frontend developer preference).

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
    - **Wire Format (Preliminary Frontend Alignment)**: Serve downsampled, columnar numeric JSON arrays (`[timestamps[], series1[], ...]`) for interactive charting (currently `uPlot`, subject to frontend developer input), reserving CSV generation strictly for on-demand user file downloads.

### Frontend–Backend Contract Standards
- **Decoupled Evolution**: Frontend and backend must communicate through explicit, versioned data contracts (`functions/contracts.py`) covering HTTP request payloads, HTTP response envelopes, CSV column headers, and Firestore metadata schemas. *(Future contract shapes for Tier-1/Tier-3 UI consumption and admin endpoints remain preliminary pending co-design with the frontend developer).*
- **Additive Backward Compatibility**: Backend changes must preserve existing contract fields (`storagePath`, `csvKeys`, `csvBundle`, and CSV column schemas) until coordinated migrations occur (🔴 Red Zone); new capabilities (such as `summaryKpis`, `tier1Summaries`, `runId`, columnar series, or status fields) must be introduced additively (🟡 Yellow Zone).
- **Contract Testing**: Every backend PR/push must pass automated contract unit tests in `functions/tests/test_contracts.py` that verify request parsing and response serialization against canonical frontend payload fixtures.

### Iterative Workplan, Phase-Gate & Reflexive Governance
- **Rolling-Wave Planning**: Future phases in `workplan/blueprint.md` are intentionally treated as evolving directional outlines rather than fixed, predetermined specifications.
- **Phase-Transition Requirement (🟡 Yellow Zone)**: As any current phase nears completion—or before beginning work on the next phase—contributors and AI agents must:
    1. Audit the actual state of the codebase (both `frontend/` and `functions/`) against `workplan/governance.md` and `workplan/blueprint.md`.
    2. Re-evaluate assumptions, technical constraints, parallel developer progress, and interface contracts based on lessons learned in the completing phase.
    3. Revise and fully flesh out the upcoming phase in `workplan/blueprint.md` into concrete, testable deliverables (and adjust or re-order later phases as needed) and confirm with the user before writing implementation code.
- **Reflexive Governance Co-Update Rule**: Governance is a living system. Any commit or agent turn that adds or modifies a `.github/workflows/*.yml` file, runtime version (`firebase.json`), backend secret (`SecretParam`), `Protocol` interface (`functions/engine/protocols.py`), component model (`functions/engine/models/`), or architectural approach **must reflexively update `workplan/governance.md`, `workplan/blueprint.md`, and `functions/tests/test_governance.py` in the same change**.
- **Bidirectional Drift Enforcement (`functions/tests/test_governance.py`)**: Automated `pytest` assertions verify both that **code obeys governance** (lazy imports, `Protocol` conformance, seeded PRNG) and that **governance docs stay in sync with code** (every workflow, runtime version, secret, protocol, and component model in the repo must be documented in `workplan/governance.md` and `workplan/blueprint.md`).

## CI/CD, Testing & Deployment
- **Tools**: Managed via **GitHub Actions** (`.github/workflows/`), deploying to the `sesdc-toolkit2` Firebase project.
- **Workflows**:
    - `firebase-dev-deploy.yml`: Automatically builds the frontend (`frontend/`) with `VITE_FIREBASE_*` secrets and deploys to Firebase Hosting (`--only hosting`) when changes are merged/pushed to the `test` branch.
    - `firebase-functions-deploy.yml`: Sets up a Python 3.13 virtual environment, installs `functions/requirements.txt`, and deploys Firebase Cloud Functions (`--only functions`) when changes modifying `functions/**` are merged/pushed to `test` or via manual `workflow_dispatch`.
    - `e2e-emulators.yml`: Runs end-to-end (E2E) tests (`npm run test:e2e`) against the Firebase Auth and Firestore emulators on pushes and pull requests to `test`, or via manual `workflow_dispatch`.
    - `functions-unit-tests.yml`: Runs backend Python unit tests (`pytest`) on pull requests to `test`, pushes to `test` modifying `functions/**`, or via manual `workflow_dispatch`.
- **Testing Commands**:
    - **Frontend Unit Tests**: `npm run test:unit` (`vitest run`).
    - **Emulator E2E Tests**: `npm run test:e2e` (or `npm run test:emulators` — runs `vitest` inside `firebase emulators:exec --only auth,firestore --project demo-sesdc-toolkit`). In local dev mode (`import.meta.env.DEV`), `window.FirestoreSmokeTest` is also available in the browser console.
    - **Backend Unit, Contract & Governance Tests**: `npm run test:functions` (or `cd functions && python -m pytest tests/ -v`).
- **Required GitHub Secrets**: `FIREBASE_TOKEN` for Firebase CLI deployment authentication, along with `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` for frontend builds.
