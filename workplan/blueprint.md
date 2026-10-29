# Architectural Blueprint: Next-Generation SESDC Toolkit

## Context

Access to electricity is not universal in the global south - unlike the norm in developed countries where access to high quality, reliable power is often taken for granted.  Over 700 million people lack access altogether and many more still depend on electricity that is significantly limited by quantity and reliability.

In remote regions, there are many obstacles to electricity access.  Rural electrification is stymied by high costs of service, low ability to pay, institutional/government structures, and because many solutions that were designed for developed markets are not appropriate for first access.

Mini-/micro-grids (MGs) and other off-grid solutions like solar home systems or point of use solar supply for productive uses offer a lower cost, and increasingly lowest cost, solution to traditional rural electrification efforts.

Rural MGs depend on the local community for support, both from a governance perspective, but also for practical operations.  The community is the main source of demand for the goods/services enabled by electricity access - they provide monies for the charging, lighting, agricultural processing, refrigeration, and other services that simultaneously drive transformational change.  Yet the ongoing survival of a MG project in this setting is precarious.  It can fail for any number of interrelated reasons, for example: insufficient revenue recovery, technical/equipment failures, poor ownership models, and loss of social support.  Strategic and practical operator decision making over the life of a project can prevent/mitigate some of the challenges and adapt to maximize the project’s performance.  For these projects the challenge of sustainability is the first order challenge in order to unlock the potential benefits such as widespread economic and human development.

What is needed
The first stage of a MG project is a pre-feasibility assessment - a review of the energy requirements, system requirements, and likely system and project configuration to meet requirements.

### Requirements
- Desired solution is a low-cost web-application that simulates a project energy and financial scenarios
- End-users are community members in the Global South with supporting organizations (NGOs) that may have little to no experience with energy projects
- End-user consumer technology (mobiles, computers) is limited in computational, storage, memory, and bandwidth.

---

## 1. Executive Summary & Vision
This document outlines the architecture for a scalable, cloud-native, agent-based platform for simulating decoupled energy projects. The primary vision is to create a powerful tool that is not only capable of complex, long-term energy modeling but is also accessible to users with limited computational resources.

The architecture is founded on four key principles:
- **Modularity & Structural Typing**: The simulation core is composed of independent, swappable components and agents conforming to strict `typing.Protocol` interfaces.
- **Scalability**: The serverless cloud infrastructure automatically scales with demand, from zero to thousands of simulations, without manual intervention.
- **Performance (Data-Oriented Design)**: A hybrid two-timescale execution strategy combines NumPy vectorization, Numba JIT-compiled coupled dispatch kernels over contiguous arrays, and server-side aggregation.
- **Accessibility**: A "thin client, powerful server" model ensures that all computationally intensive work is performed in the cloud, making the tool accessible from any modern web browser, regardless of local device power.

## 2. System Architecture Overview
The system operates on a client-server model. A lightweight web frontend provides the user interface, while a powerful serverless backend handles all simulation and data processing tasks.

- **Client (The Browser — Preliminary)**: A lightweight web application allows users to configure simulation parameters, launch runs, and visualize results without performing heavy local calculations. *(All client-side UI, UX, framework, and visualization details are preliminary pending input from the frontend developer).*
- **Server (Google Cloud)**: A suite of serverless services that work in concert:
    - An API layer receives requests from the client and validates them against the API contract.
    - A long-running task service executes multi-year agent simulations and scenario sweeps.
    - A 3-tier hybrid data storage system manages simulation metadata, compact summaries, operational run ledgers, weather caches, and columnar time-series results behind a clean `SimulationRepository` abstraction.
- **Data Flow**: The client sends small configuration requests to the server. The server runs the entire simulation in memory using typed NumPy arrays, persists compact summaries to Firestore and canonical hourly time-series to columnar storage (Parquet on GCS / BigQuery), and returns only lightweight, pre-aggregated or downsampled numeric arrays to the client for visualization.
- **Frontend–Backend Contract Isolation**: Communication between client and server is governed by explicit, versioned API contracts (`functions/contracts.py`) so frontend and backend development can proceed independently without breaking integrations.

## 3. Frontend & Visualization Architecture (Preliminary — Subject to Frontend Developer Review & Co-Design)
> **Preliminary Status (Not Yet Canon)**: All frontend architectural items, framework/library selections, visualization strategies, and feature proposals in this section—and across this blueprint—are **preliminary baselines and discussion seeds**. None of the frontend specifications are established as canon until reviewed, brainstormed, deployed to `test`, and marked `Dev Accepted` with the frontend developer.

- **Framework (Preliminary Baseline)**: Currently Preact + TypeScript (React-compatible ecosystem), bundled with Vite.
    - *Rationale*: Modern component-based UI frameworks enable the creation of a rich, responsive user interface with minimal bundle size, ideal for low-bandwidth environments and student-led development (subject to frontend developer review).
- **Visualization Strategy (`uPlot` + Pre-Aggregated Summaries — Preliminary)**:
    - *Interactive Time-Series Charts (`uPlot` — Preliminary)*: `uPlot` is currently used as the baseline interactive charting engine (`UPlotChart.tsx`, `SimulationGraphsPanel.tsx`, `GraphsTab.tsx`) because of its tiny footprint, low CPU/memory overhead on older devices, and native support for columnar numeric arrays (`[timestamps[], series1[], ...]`). Charting library choices, signal interactions, and downsampling UX remain open to frontend developer input.
    - *Summary & Report Views (Preliminary)*: High-level KPIs, 20-year financial projections, and monthly summaries are designed to render from lightweight pre-aggregated Tier-1 data (`tier1Summaries` and `summaryKpis`), with exact UI layouts to be defined by the frontend developer.
- **Runtime Admin Viewer (Preliminary Seeded Proposal)**:
    - *Purpose*: A proposed role-gated administrative interface focused on four operational "Jobs to be Done": **Support & Triage**, **Curation & Hygiene**, **Cost/Quota Protection**, and **Adoption/Bottleneck Discovery**.
    - *Design Philosophy (Preliminary)*: Focus custom UI on domain-specific state and high-leverage actions (simulation run ledger, one-click failure replay, cross-user project cloning, starter template promotion, and storage/weather cache hygiene), while delegating raw infrastructure telemetry via direct deep-links to native Firebase and GCP Consoles. To be co-designed and refined with the frontend developer.
- **Hosting**: Firebase Hosting.
    - *Rationale*: Firebase Hosting provides a simple, secure, and globally distributed CDN for the web application. Its seamless integration with the backend and generous free tier make it a cost-effective and low-maintenance choice.

## 4. Backend Architecture

### 4.1 Service & Persistence Architecture
- **API Layer**: Cloud Functions for Firebase (Python 3.13).
    - *Rationale*: Cloud Functions act as the secure HTTP endpoints for the application. They verify caller identity (`functions/caller_auth.py`), validate user requests via `SimulationRequestContract`, and either execute fast single-run simulations or enqueue heavy multi-scenario jobs.
- **Long-Running Task Execution**: Google Cloud Run, triggered via Pub/Sub.
    - *Rationale*: Multi-year agent simulations and Monte Carlo sensitivity sweeps can exceed standard HTTP function timeouts. The "HTTP Function -> Pub/Sub -> Cloud Run" pattern provides asynchronous background processing with configurable CPU/memory and concurrency.
- **Repository & Adapter Pattern (`functions/repository.py`)**:
    - *Rationale*: Persistence operations (simulation runs, Tier-1 summaries, weather cache lookups, and operational run ledgers) are abstracted behind `SimulationRepositoryProtocol` (`InMemorySimulationRepository` for offline `pytest` and local emulators; `GcpSimulationRepository` for Firestore/GCS/BigQuery). This guarantees 100% offline testability and compliance with `governance.md`.

### 4.2 Simulation Core Architecture (Data-Oriented & Protocol-Driven)
The core simulation is a modular Python application designed for both behavioral realism and numerical speed:
- **Structural Protocols (`functions/engine/protocols.py`)**: Defines `@runtime_checkable` `typing.Protocol` interfaces (`ComponentModelProtocol`, `BehavioralAgentProtocol`, `EvaluativeAgentProtocol`, `SimulationRepositoryProtocol`) for static type safety and plug-and-play modularity.
- **Two-Timescale Simulation Engine ("Clock")**:
    1. *Vectorized Exogenous Pass*: Weather-driven potential generation (`PVModel`, `WindModel`) is computed across the time horizon using vectorized NumPy array operations.
    2. *Compiled Coupled Dispatch Kernel (`CoupledDispatchModel` / `run_coupled_dispatch_kernel`)*: State-dependent hourly loops (battery SoC charge/discharge, diesel backup, curtailed renewable power, and unmet load) execute in a single-pass, Numba `@njit`-compatible kernel over contiguous `float64` arrays. Unlike legacy sequential dispatch, the coupled kernel prioritizes discharging stored renewable battery energy (enforcing both charge and discharge kW ratings) before firing the backup diesel generator.
    3. *Agent Decision Boundaries (`EpochModifiers`)*: Behavioral Agents (`Operator_Agent`, `Customer_Agent`), degradation models, and `EventScheduler` shocks execute at epoch boundaries (daily/monthly/annually), updating numeric modifier vectors on `EpochModifiers` (`solar_derating`, `wind_derating`, `battery_soh`, `load_multiplier`, `generator_available`).
- **State Object (`SimulationState` & `EpochModifiers`)**: A Structure-of-Arrays (SoA) dataclass holding contiguous NumPy arrays (including `curtailed_power`), multi-year `EpochModifiers`, compact Tier-1 summaries (`tier1_summaries`), evaluative KPIs (`summary_kpis`), and an isolated, seeded pseudo-random number generator (`rng = np.random.default_rng(seed)`) for 100% deterministic reproducibility.
- **Component Models**: Independent modules representing system physics, dispatch, and financials (`PVModel`, `WindModel`, `CoupledDispatchModel`, `BatteryModel`, `GeneratorModel`, `FinancialModel`), plus the multi-year pass (`DegradationModel` ageing assets through `EpochModifiers`, and `MultiYearDispatchModel` re-dispatching each of the 20 project years into `hourly_year_NN` tables and `yearly_summary`).
- **Behavioral Agents**: Dynamic actors (`Operator_Agent`, `Customer_Agent`) that make operational/tariff/demand decisions and adapt over time.
- **Comprehension Layer**: An agent-specific perception filter on `SimulationState` that models information latency, measurement error, and cognitive/operational bias using the state's seeded `rng`.
- **Evaluative Agents**: Read-only observers (`compute_summary_kpis`, `SummaryKPIEvaluator`, and sustainability evaluators) that synthesize `SimulationState` into high-level KPIs and health scores.
- **Event Scheduler**: A priority timeline used to inject discrete, scheduled or stochastic events into the simulation (e.g., external economic shocks, fuel price spikes, or equipment derating/failures).

## 5. Data & Storage Architecture (3-Tier Hybrid Strategy)
Rather than serializing multiple redundant datasets into text CSV blobs, the system uses a three-tier storage and delivery model optimized for speed, low bandwidth, cost, and analytical query capabilities:

1. **Tier 1 — Metadata, KPIs, Compact Summaries & Operational Ledger (in Cloud Firestore)**:
    - *What is stored*: User inputs, run status (`queued` | `running` | `completed` | `failed`), scalar summary KPIs (`summaryKpis`), small pre-aggregated summary series (`tier1Summaries`: 20-year annual `financial_expenses` and `revenue` arrays [20 rows], and 12-month solar averages), and lightweight operational run ledger records (`admin_run_logs`).
    - *Rationale*: These datasets total less than 15 KB per run as native JSON. Storing them directly in Firestore (`users/{uid}/projects/{pid}` or a `simulations/{runId}` subcollection) allows the frontend and admin viewer to render KPIs, financial charts, and run diagnostics **instantly** without invoking a Cloud Function, downloading GCS blobs, or parsing CSV text.
2. **Tier 2 — Canonical Hourly Time-Series (Apache Parquet on GCS + Google BigQuery)**:
    - *What is stored*: A single canonical hourly table per simulation run (8,760 to 175,200 rows) stored as a typed, compressed **Apache Parquet** file (`{run_id}_hourly.parquet`) in Google Cloud Storage and loaded/mounted into **Google BigQuery** (partitioned by time and clustered by `simulation_run_id`).
    - *Rationale*: Eliminates the 6 redundant derived CSV files (`daily_averages`, `twenty_year_daily`, `solar_heatmap`, `monthly_heatmap`, etc.). Parquet is 5–10x smaller and 10x faster to read/write than `.csv.gz`, preserves strict numeric types, supports reading only selected columns (column projection), and bridges natively into BigQuery with zero transformation overhead.
3. **Tier 3 — Columnar Wire Delivery & On-Demand CSV Export (Preliminary Frontend Alignment)**:
    - *Interactive Chart Delivery (Preliminary)*: Backend endpoints are planned to serve downsampled, time-windowed **columnar JSON arrays** (`[timestamps[], load_kW[], solar_kW[], ...]`) matching `uPlot`'s input format to avoid client-side CSV parsing on low-power devices. Exact payload shapes and query parameters will be finalized with the frontend developer.
    - *On-Demand CSV Export*: CSV is treated strictly as an **end-user export format** (generated on the fly or served via signed URL only when a user clicks "Download CSV"), never as an internal storage or default API wire format.

## 6. Performance & Optimization Strategy

### Core Calculation Speed
- **Vectorization (NumPy)**: Used for all non-state-dependent calculations (`PVModel`, `WindModel`).
- **Single-Pass Coupled Dispatch Kernel (Numba `@njit`)**: `run_coupled_dispatch_kernel` in `functions/engine/models/dispatch.py` executes battery charge/discharge, curtailment, diesel backup, and unmet load in a single pass over contiguous `float64` arrays, using `@numba.njit(cache=True)` automatically when `numba` is installed.

### Scenario Throughput
- **Parallelization (`multiprocessing`)**: Used to execute multiple independent simulation scenarios in parallel on multi-core Cloud Run instances, with isolated `np.random.SeedSequence` streams per worker and lazy serialization (skipping CSV string formatting during intermediate Monte Carlo runs).

### End-User Experience
- **Server-Side Aggregation & Downsampling**: All queries and downsampling against the hourly Parquet/BigQuery dataset are performed on the server. The backend sends only small, pre-aggregated (`tier1Summaries`) or viewport-downsampled numeric arrays to the client, ensuring a responsive experience even on low-bandwidth connections.

## 7. Phased Implementation Plan (Rolling-Wave, Guardrailed & Dev-Acceptance Driven)

> **Expectation for Future Phased Work & Multi-Developer Agentic Coordination**:
> 1. **Rolling-Wave Planning**: Future phases (`Phase 1C` through `Phase 4` and the `Parallel Frontend Track`) are **intentionally provisional**. All frontend-related items are **strictly preliminary** until co-designed with the frontend developer.
> 2. **Mandatory Pre-Flight Scope Lock & Tiered Agent Autonomy**: Contributors and AI agents (across Zed + Argon, VS Code + Claude/Copilot, etc.) must execute the **6-Point Pre-Flight Checklist** (`workplan/governance.md`), output a **Pre-Flight Scope Banner** before editing files, and obey the **🟢 Green / 🟡 Yellow / 🔴 Red** autonomy matrix synchronized across `GEMINI.md`, `AGENTS.md`, `CLAUDE.md`, `.rules`, and `.github/copilot-instructions.md`.
> 3. **Scoped Branching, Cross-Agent Handoff Log & 4-Stage Dev Acceptance**:
>    - Work is developed as single-layer tasks on domain-scoped branches (`be/<topic>`, `fe/<topic>`, `chore/<topic>`), recorded in the **Cross-Agent Handoff & Breaking Spec Log** (Section 8) when contracts or structural patterns change, and squash-merged via PR into `test` (auto-deploying to `sesdc-toolkit2` staging).
>    - Every phase and deliverable tracks its acceptance state: `In Progress` → `On test (Staging)` → `Dev Accepted [FE/BE Sign-Off]` → `Promoted to main`. Preliminary frontend items graduate to **Canon** only upon reaching `Dev Accepted`.

---

### Phase 1A: Backend Modularization, Vectorization & Interface Contracts (Completed — Zero Frontend Impact)
*Goal: Refactor the simulation core into modular components with vectorized math and lock in a stable Frontend–Backend contract with a comprehensive unit test suite.*
- **Frontend–Backend Interface Contracts**: Implemented explicit request, response, and CSV schema contracts in `functions/contracts.py` that guarantee backward compatibility with the frontend (`storagePath`, `csvKeys`, `csvBundle`) while adding `summaryKpis`, `runId`, and `schemaVersion`.
- **Modular Simulation Refactor**: Decomposed `functions/simulation.py` and `functions/calculations.py` into `functions/engine/` (`SimulationEngine`, `SimulationState`, `compute_summary_kpis`, and `PVModel`, `WindModel`, `GeneratorModel`, `BatteryModel`, `FinancialModel`) while keeping `run_simulation()` and `calculations.py` re-exports backward-compatible.
- **Vectorize Solar & Wind Calculations**: Replaced `DataFrame.iterrows()` loops in solar and wind power calculations with vectorized NumPy operations.
- **Unit & Contract Test Suite**: Added `pytest` unit and contract test suites (`test_contracts.py`, `test_models.py`, `test_engine.py`) verifying component models, full-year engine execution, and frontend-backend contract compliance.
- **Summary KPI Persistence**: Computed summary KPIs (`SimulationSummaryKPIs`) during simulation runs and persisted them additively in Firestore (`save_last_simulation_run`).

### Phase 1B: Structural Protocols, Coupled Dispatch Kernel, Epoch Modifiers, Repository Pattern & Tier-1 Summaries (Completed — Zero Frontend Impact)
*Goal: Establish modern Python structural typing (`Protocol`), a Numba-ready Coupled Dispatch Kernel fixing battery/generator dispatch order and discharge rate limits, `EpochModifiers` for multi-year agent hooks, deterministic PRNG seeding, offline-testable `SimulationRepository` adapters, and Tier-1 native JSON summary structures.*
- **Structural Protocols (`functions/engine/protocols.py`)**: Defined `@runtime_checkable` `ComponentModelProtocol`, `BehavioralAgentProtocol`, `EvaluativeAgentProtocol`, and `SimulationRepositoryProtocol`.
- **Coupled Renewable-First Dispatch Kernel (`functions/engine/models/dispatch.py`)**: Implemented `CoupledDispatchModel` and `run_coupled_dispatch_kernel` (`@njit`-ready), fixing the legacy sequential bug so stored battery energy is discharged (with proper kW discharge limits) *before* firing backup diesel generation, and tracking `curtailed_power`.
- **EpochModifiers & Project Overhead Costs (`functions/engine/state.py`, `functions/engine/models/financial.py`)**: Added `EpochModifiers` (`solar_derating`, `wind_derating`, `battery_soh`, `load_multiplier`, `generator_available`) and wired project-level fixed costs (`other_capex`, `labor_cost`, `land_leasing_cost`, `licensing_cost`) into `FinancialModel`.
- **Deterministic Seeded PRNG on `SimulationState`**: Added `seed` and `rng: np.random.Generator` (`np.random.default_rng`) to `SimulationState` and `SimulationRequestContract`.
- **Tier-1 Compact Summary Contract (`Tier1SimulationSummaries`)**: Added structured 20-year financial (`financial_expenses_20yr`, `revenue_20yr`) and 12-month solar summary series (`monthly_solar_averages`) to `functions/contracts.py`, `SimulationState`, `SimulationResponseContract` (`tier1Summaries`), and Firestore (`save_last_simulation_run`).
- **Repository Pattern (`functions/repository.py`)**: Implemented `InMemorySimulationRepository` and `GcpSimulationRepository` so simulation persistence is decoupled from live GCP services during unit/integration tests.

---

### Phase 1C: Multi-Agent Coordination Activation, Repository Hygiene, Weather Cache & Admin Run Ledger (Next Up — Priority Foundation)
*Goal: Activate cross-developer multi-AI guardrails before parallel work accelerates, clean out legacy student vestiges, protect external NSRDB weather API quotas via caching, and record backend run diagnostics for the Runtime Admin Viewer MVP.*

#### 0. Phase 1C.0 — Multi-Developer Agentic Coordination & Guardrail Activation (Priority 0 Prerequisite)
- **Baseline Governance, `origin/test` Sync & Multi-Tool Shims (`Completed on chore/agentic-coordination — Ready for PR to test`)**:
    - Consolidated multi-tool coordination rules into `workplan/governance.md` (6-Point Pre-Flight Scope Lock, Dependency/Blast-Radius Audit, Agent-Ready Task Card standard, Squash-and-Merge hygiene) and removed standalone `workplan/agentic_coordination.md`.
    - Embedded the **Cross-Agent Handoff & Breaking Spec Log** in Section 8 of `workplan/blueprint.md`.
    - Replaced the obsolete `qwen2.5-coder` `.rules` file and added synchronized multi-tool entrypoint shims (`AGENTS.md`, `CLAUDE.md`, `.rules`, `.github/copilot-instructions.md`) alongside `GEMINI.md`, enforced by `functions/tests/test_governance.py`.
    - Hardened `.gitignore` (`venv/`, `functions/venv/`, OS clutter, local AI tool state), added `.github/pull_request_template.md`, and aligned `origin/test` to `main` (`4fefee3b`) so all scoped PRs target a clean, up-to-date integration baseline.
- **Immediate Coordination Follow-Ups (Prioritized Next)**:
    1. **Non-Argon Agent Self-Detection & Shim Refinement (🟡 Yellow Zone — First Non-Argon Session)**: When a contributor first runs a non-Gemini/Argon workflow (e.g., **VS Code + Claude / Copilot**), have the agent self-detect its runtime environment and propose any needed tool-specific refinements to `CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md` while keeping `workplan/governance.md` authoritative.
    2. **Automated Style Normalization & Shared Contract Export**: Add `ruff` (`ruff check` + `ruff format --check`) to `functions/` to normalize stylistic differences across LLMs, and add an automated schema/type export hook from `functions/contracts.py` (co-selecting a frontend formatter + TypeScript contract consumption pattern during **Frontend Sync 1**).

#### 1. Defensive Repository & Legacy Vestige Cleanup (3-Stage Protocol)
- **Stage 1 — Automated Reference Audit & Triage Matrix (Completed — Read-Only Findings Recorded Below)**:
    - **Bucket A — Confirmed Dead / Safe Immediate Removal (0 Active References)**:
        - *Legacy Vanilla Website (`public/`, 32 files)*: `public/index.html`, `public/404.html`, `public/pages/*.html`, `public/js/*.js`, `public/css/*.css`, `public/media/*`. Zero references across `frontend/`, `functions/`, `tests/`, or `.github/workflows/`; `firebase.json` deploys `frontend/dist`.
        - *Empty Nested Directory (`SESDC-toolkit/`)*: Empty nested directory at repository root.
        - *Duplicate Root Python Dependencies (`requirements.txt`)*: Root `pip freeze` dump; unused by CI/CD or Cloud Functions (`functions/requirements.txt` is authoritative).
        - *Obsolete Agent Rules (`.rules` — Resolved in Phase 1C.0)*: Replaced stale `SESDC-toolkit/` + `qwen2.5-coder` instructions with a synchronized Zed governance pointer shim verified by `test_governance.py`.
        - *Dead Backend Scripts & Static Artifacts in `functions/`*:
            - `functions/financial_calculations.py` & `functions/20_year_financial_expenses.png` (0 imports; standalone student script with hardcoded values that writes a local PNG via `matplotlib`).
            - `functions/graph.py` & `functions/firebase_storage_setup.py` (0 imports in active modules; legacy server-side `matplotlib`/`seaborn` PNG plotters looking for local `serviceAccount.json`, superseded by `uPlot` and `functions/storage.py`).
            - `functions/test.csv` (0 references; static student test CSV).
        - *OS & Emulator Debug Clutter*: `.DS_Store`, `functions/.DS_Store`, `public/.DS_Store`, `firestore-debug.log`, `pglite-debug.log`.
    - **Bucket B — Root Config Slimming & Caught Hidden Couplings**:
        - *Caught Build-Time Coupling — KEEP `USER-GUIDE.md`*: Referenced in `frontend/src/pages/UserGuide.tsx` (`import guideMarkdown from '../../../USER-GUIDE.md?raw'`). Must **not** be deleted (can be relocated inside `frontend/src/` later in coordination with the frontend developer).
        - *Root `package.json` Dependency Slimming*: Root `tests/*.ts` only import `vitest` and `firebase/*`. Unused UI/server packages at root (`@google-cloud/storage`, `@tailwindcss/postcss`, `tailwindcss`, `autoprefixer`, `postcss`, `http-server`, `papaparse`) are candidates for removal from root `package.json`.
    - **Bucket C — Frontend Internal Vestiges (`frontend/src/` — Preliminary / Hold for Co-Review with Frontend Dev in Sync 1)**:
        - *3 Unreferenced CSS Files (0 imports)*: `frontend/src/css/project-outputs.css`, `frontend/src/css/project-selection-test.css`, `frontend/src/css/project-selection.css`.
        - *3 Unreferenced Components (0 imports)*: `frontend/src/components/projectModalTailwind.tsx`, `frontend/src/components/ProjectWizard/LoadProfileChart.tsx`, `frontend/src/components/ProjectWizard/steps/NameStep.tsx`.
        - *9 Unreferenced Media Assets in `frontend/src/media/` (0 references)*: `boxes-3.svg`, `circle-user-2.svg`, `circle-user.svg`, `green.png`, `house-2.svg`, `info.svg`, `mail-4.svg`, `milad-fakurian-Kd2MCCeEhrc-unsplash-2.jpg`, `placeholder_user.png`.
- **Stage 2 — Quarantined Removal & Multi-Gate Verification (🟡 Yellow Zone — Pending User Confirmation)**:
    - Remove remaining Bucket A & B vestiges on a scoped branch and verify zero regressions across `pytest` (`functions/tests/`), `npm run build` (`frontend/`), and emulator E2E tests (`tests/`).
- **Stage 3 — Governance-as-Code Lock-In (`functions/tests/test_governance.py` & `.gitignore`)**:
    - Extend `test_governance.py` to permanently forbid duplicate root `requirements.txt`, legacy `public/` directories, nested repository clones, dead backend plotting scripts, and committed debug/OS artifacts (`*.log`, `.DS_Store`).

#### 2. NSRDB Weather Cache Adapter (`functions/nlr.py`, `functions/repository.py`)
- Cache fetched NSRDB weather data by rounded `(latitude, longitude)` key through `SimulationRepositoryProtocol` (`InMemorySimulationRepository` & `GcpSimulationRepository`) so repeated simulations at the same site bypass external HTTP calls, protect `NLR_API_KEY` rate limits during workshops, and execute 5–10x faster.

#### 3. Backend Admin Run Ledger & Failure Capture Hook (`functions/handlers.py`, `functions/repository.py`, `functions/contracts.py`)
- Record lightweight structured run telemetry (`runId`, `userId`, `projectId`, `status`, `weatherCacheHit`, `weatherFetchMs`, `engineComputeMs`, `storageWriteMs`, `errorMessage`, and failing `SimulationRequestContract` snapshot) via `SimulationRepositoryProtocol` so backend observability is active immediately and ready for the **Runtime Admin Viewer MVP (Sync 1)**.

---

### Phase 2A: Multi-Year Epoch Clock, Comprehension Layer & Event Scheduler (Provisional — 🟡 Yellow-Zone Phase Gate Required)
*Goal: Upgrade the multi-year simulation pass (`DegradationModel` / `MultiYearDispatchModel`) into a full epoch-callback loop with imperfect agent perception and scheduled/stochastic shock injection.*
- **Multi-Year Epoch Clock (`functions/engine/clock.py`, `functions/engine/state.py`, `functions/engine/models/horizon.py`)**: Unify `SimulationEngine` and `MultiYearDispatchModel` across configurable multi-year horizons (`N` years × 8,760 hours) with epoch boundary callbacks (daily/monthly/annual).
- **Comprehension Layer (`functions/engine/comprehension.py`)**: Implement agent perception filters on `SimulationState` modeling measurement noise, reporting latency, and forecast bias using `state.rng`.
- **Event Scheduler (`functions/engine/events.py`)**: Implement a deterministic priority timeline injecting scheduled or stochastic shocks (equipment derating/outages, fuel price spikes, weather anomalies) into `EpochModifiers`.

### Phase 2B: Behavioral & Evaluative Agents (Provisional — 🟡 Yellow-Zone Phase Gate Required)
*Goal: Implement adaptive `Operator_Agent` and `Customer_Agent` decision rules and sustainability evaluators on top of the Phase 2A multi-year clock, locking in the canonical time-series schema.*
- **Behavioral Agents (`Operator_Agent`, `Customer_Agent`)**: Implement `BehavioralAgentProtocol` actors that adjust tariffs, O&M spending, reserve margins, and `EpochModifiers.load_multiplier` across the 20-year horizon.
- **Evaluative Agents (`functions/engine/kpis.py`)**: Expand `EvaluativeAgentProtocol` observers to compute multi-year sustainability, reliability, and financial health scores, and lock in the final canonical hourly + annual schema in `functions/contracts.py`.

---

### Phase 3: Tier-2 Parquet Storage, Tier-3 Columnar API & On-Demand CSV Export (Provisional — Zero New Cloud Infra)
*Goal: Deliver full storage compression and low-bandwidth client performance using existing Cloud Functions and GCS before provisioning any heavy batch infrastructure.*
- **Tier 2 Storage (Canonical Parquet on GCS)**: Replace the legacy `.csv.gz` bundle (including `hourly_year_02`…`hourly_year_20`) with a single typed `{run_id}_hourly.parquet` artifact in GCS via `SimulationRepositoryProtocol` (testable offline with `pyarrow` + `InMemorySimulationRepository`).
- **Tier 3 API (Windowed Columnar JSON & On-Demand CSV Export)**: Serve downsampled, time-windowed columnar numeric arrays (`[timestamps[], series1[], ...]`) from Cloud Functions and move CSV generation to an on-demand export endpoint.

---

### Phase 4: Cloud Scale-Out — Multiprocessing, Cloud Run Workers & BigQuery Analytics (Provisional — 🔴 Red-Zone Infrastructure Gate)
*Goal: Scale the mature 20-year agent engine to massive multi-scenario Monte Carlo sweeps and cross-project SQL analytics in the cloud.*
- **Scenario Parallelization (`multiprocessing`)**: Parallelize multi-scenario sensitivity and Monte Carlo sweeps across CPU cores using isolated `SeedSequence` streams.
- **Asynchronous Execution (Pub/Sub -> Cloud Run)**: Containerize heavy batch simulation workers on Cloud Run triggered via Pub/Sub to bypass HTTP function timeouts.
- **BigQuery Native/External Table Bridge**: Mount GCS Parquet artifacts into partitioned, clustered BigQuery tables for cross-run and cohort-wide analytical queries.
- **Production CI/CD Expansion**: Extend GitHub Actions workflows for Cloud Run deployments and `main` branch production release gates.

---

### Parallel Track: Frontend Development & Runtime Admin Viewer (Preliminary Placeholder — Not Canon Until Co-Designed & `Dev Accepted` on `test`)
> **Preliminary Status & Parallel Execution**: Everything in this track is a **preliminary placeholder and brainstorming seed** organized around **3 Backend Sync Milestones** so the frontend developer can work in parallel on `fe/<topic>` branches without blocking on backend phases. Items graduate to **Canon** only after co-design, deployment to `test`, and `Dev Accepted` sign-off.

#### Frontend Sync 1 (Unblocked Immediately / Pairs with Phase 1B & Phase 1C)
- **Non-Argon AI Tool Onboarding, Formatter & Contract Type Sync (Phase 1C.0 Alignment)**:
    - On the first VS Code + Claude (or Zed) frontend agent session, let the agent self-detect its IDE/model harness and propose any needed `CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md` adapter refinements (🟡 Yellow Zone).
    - Co-select a universal frontend formatter (`Biome` or `Prettier`) and agree on generated TypeScript contract definitions (`contracts.py` -> TypeScript/JSON Schema) so frontend and backend LLMs never drift on payload keys or formatting.
- **Co-Design & Internal `frontend/` Vestige Cleanup (Bucket C — Preliminary)**:
    - Review and confirm the Stage 1 audited student-era media assets (9 unreferenced files in `frontend/src/media/`), dead CSS files (`project-outputs.css`, `project-selection-test.css`, `project-selection.css`), and unreferenced components (`projectModalTailwind.tsx`, `LoadProfileChart.tsx`, `NameStep.tsx`) with the frontend developer, and decide whether to relocate `USER-GUIDE.md` inside `frontend/src/`.
- **Tier-1 Instant Summary Rendering (Preliminary)**:
    - Wire existing Firestore `summaryKpis` and `tier1Summaries` (completed in Phase 1B) into overview cards and 20-year financial/monthly solar charts.
- **Seeded Feature Proposal — Runtime Admin Viewer MVP (Preliminary)**:
    - Designed around four operational "Jobs to be Done" (**Support & Triage**, **Curation & Hygiene**, **Cost/Quota Protection**, and **Adoption/Bottleneck Discovery**):
    1. **Simulation Run Ledger & One-Click Failure Replay**: Filterable table consuming Phase 1C run ledger records (`runId`, user, project, status, `weatherCacheHit`, `weatherFetchMs`, `engineComputeMs`, `storageWriteMs`), with one-click download of failing `SimulationRequestContract` JSON payloads for `pytest` reproduction.
    2. **Cross-Tenant Project Browser & "Clone to Admin"**: Browse/search all projects with summary tags and a one-click **"Clone to My Account"** action for zero-risk support debugging.
    3. **Curated "Starter Templates" & Asset Promotion**: Toggle to promote exemplary projects into public **Global Starter Templates** (`isTemplate: true`, e.g., *Rural Health Clinic*, *Agri-Processing Mill*).
    4. **Storage, Quota & Weather Cache Hygiene Panel**: Display daily NSRDB API call counts, cached weather coordinates from Phase 1C, and controls to prune orphaned GCS blobs or stale test runs.
    5. **Native Console Deep-Links**: Direct header links to Firebase Auth Console, Cloud Functions Error Logs (`severity>=ERROR`), and GCP Billing.

#### Frontend Sync 2 (Pairs with Phase 2A & Phase 2B)
- **Multi-Year Agent & Scenario Configuration UI (Preliminary)**:
    - Co-design user-friendly controls for operator/customer agent parameters, shock scenario presets (`EventScheduler`), and multi-year sustainability health score cards.
- **Broader Admin Capabilities (Preliminary)**:
    - Expand the Runtime Admin Viewer with User Directory & Cohort Organization (`admin`, `researcher`, `standard` roles, workshop cohorts) and Workflow Completion Funnel analytics.

#### Frontend Sync 3 (Pairs with Phase 3)
- **Tier-3 Windowed Charting & On-Demand CSV Export (Preliminary)**:
    - Connect interactive time-series charts (`SimulationGraphsPanel.tsx`, `GraphsTab.tsx`) to the Phase 3 Tier-3 windowed columnar JSON endpoint, wire the "Download CSV" button to the on-demand export endpoint, and track low-bandwidth client render telemetry.

---

## 8. Audit, Migration & Dev Acceptance Tracking
*This section tracks cross-agent handoff context, the exact current state of the repository, and its 4-stage Dev Acceptance status (`In Progress` → `On test (Staging)` → `Dev Accepted` → `Promoted to main`).*

### Cross-Agent Handoff & Breaking Spec Log
*Maintain the 10 most recent structural, contract, or governance updates here (newest first). Every AI agent MUST read this log during Pre-Flight and append an entry when completing changes that affect contracts, auth, shared state, or parallel workflows.*

- **`[2026-10-28] chore/agentic-coordination (Governance / Multi-Tool Coordination — Argon)`**
    - **Changes**: Absorbed multi-agent coordination rules into `workplan/governance.md` (6-Point Pre-Flight Scope Lock, Dependency/Blast-Radius Audit, Agent-Ready Task Card, Squash-and-Merge hygiene); replaced stale `.rules` and added synchronized shims (`AGENTS.md`, `CLAUDE.md`, `.rules`, `.github/copilot-instructions.md`) + `.github/pull_request_template.md` + hardened `.gitignore`; locked sync checks into `functions/tests/test_governance.py`; aligned `origin/test` to `main` (`4fefee3b`).
    - **Action / Context for Parallel Devs**: Branch new work (`be/*`, `fe/*`, `chore/*`) from `origin/test` (`4fefee3b`). Non-Gemini/Argon agents (e.g., Claude in VS Code) should self-detect their IDE/model on first session and propose any needed `CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md` refinements (🟡 Yellow Zone).
- **`[2026-10-28] PR #88 / new-fixes -> main (Full-Stack: 20-Year Horizon, Caller Auth & Graphs v2)`**
    - **Changes**: Added `DegradationModel` & `MultiYearDispatchModel` (`functions/engine/models/horizon.py`), `yearly_summary` + on-demand `hourly_year_02`…`hourly_year_20` keys (`?keys=` in `get_stored_simulation`), Firebase ID token verification (`functions/caller_auth.py`), and frontend v2 graph components (`DemandComponentsCard.tsx`, `HeatmapCard.tsx`, `YearBar.tsx`, `GraphsTab.tsx`).
    - **Action / Context for Parallel Devs**: All requests to `run_simulation_post` and `get_stored_simulation` now require `Authorization: Bearer <idToken>` matching `userId` (401/403 enforced). Phase 2A multi-year clock work should build directly on `DegradationModel` / `MultiYearDispatchModel` in `functions/engine/models/horizon.py`.

### Current Codebase State (Audit Summary)
- **Multi-Tool Agent Governance (`workplan/governance.md`, `GEMINI.md`, `AGENTS.md`, `CLAUDE.md`, `.rules`, `.github/copilot-instructions.md`)**: Unified under a single authoritative governance canon with 6-point Pre-Flight Scope Locks, Traffic-Light autonomy zones, Cross-Agent Handoff logging, Non-Argon Self-Detection onboarding, and automated drift enforcement in `functions/tests/test_governance.py`.
- **Frontend (`frontend/` — Preliminary Baseline, Subject to Frontend Developer Review)**: Currently uses **Preact + TypeScript + Vite** with authentication, project management, hierarchical load `Workbench`, CSV preview/download (`SimulationResults.tsx`), and interactive `uPlot` time-series and heatmap charts (`SimulationGraphsPanel.tsx`, `GraphsTab.tsx`, `DemandComponentsCard.tsx`, `HeatmapCard.tsx`, `YearBar.tsx`). *(Note: Frontend files are treated as 🔴 Red-Zone off-limits during backend tasks to avoid conflicts with parallel frontend development; all frontend architectural patterns and proposed features—including the Runtime Admin Viewer and `frontend/` Bucket C asset cleanup—are preliminary and not established as canon until co-designed with the frontend developer and marked `Dev Accepted` on `test`).*
- **Backend API, Auth, Contracts & Repository (`functions/main.py`, `functions/handlers.py`, `functions/caller_auth.py`, `functions/contracts.py`, `functions/repository.py`)**: Exposes Python 3.13 HTTP Cloud Functions (`run_simulation_post` and `get_stored_simulation`) protected by Firebase Bearer token caller verification (`caller_auth.py`), validated contracts (`SimulationRequestContract`, `SimulationResponseContract`, `StoredSimulationResponseContract`, `Tier1SimulationSummaries`), and a pluggable `SimulationRepositoryProtocol` (`InMemorySimulationRepository` / `GcpSimulationRepository`).
- **Simulation Core (`functions/engine/`, `functions/simulation.py`, `functions/calculations.py`)**: Refactored into modular `SimulationEngine` ("Clock"), `SimulationState` (with `EpochModifiers`, `curtailed_power`, and deterministic `np.random.Generator` seeding), `protocols.py` (`ComponentModelProtocol`, `BehavioralAgentProtocol`, `EvaluativeAgentProtocol`, `SimulationRepositoryProtocol`), `compute_summary_kpis`, `compute_tier1_summaries`, and component models (`PVModel`, `WindModel`, `CoupledDispatchModel`, `GeneratorModel`, `BatteryModel`, `FinancialModel`, `DegradationModel`, `MultiYearDispatchModel`). Epoch callbacks, comprehension layer, and event scheduler are scoped for Phase 2A; behavioral and evaluative agents are scoped for Phase 2B.
- **Data Storage (`functions/storage.py`, `functions/firestore_helpers.py`, `functions/repository.py`)**: Records **Tier-1** `summaryKpis` and `tier1Summaries` (20-year financials and monthly solar averages) directly in **Firestore** alongside backward-compatible `.csv.gz` bundles (including on-demand `hourly_year_02`…`hourly_year_20` and `yearly_summary`) in **Google Cloud Storage**. Weather caching and admin run ledger hooks are scoped for Phase 1C; Tier-2 Parquet and Tier-3 columnar JSON / on-demand CSV export are scoped for Phase 3; Cloud Run + BigQuery scale-out is scoped for Phase 4.
- **Testing (`tests/`, `functions/tests/`)**: Vitest + Firebase Emulators test Firestore rules and project CRUD (`e2e-emulators.yml`). `pytest` tests contracts (`test_contracts.py`), caller auth (`test_handlers_auth.py`), modular component models & coupled dispatch (`test_models.py`), 20-year degradation & multi-year dispatch (`test_horizon.py`), protocols, repository adapters, deterministic seeding, Tier-1 summaries, and full-year engine execution (`test_engine.py`), bidirectional governance & multi-tool shim compliance (`test_governance.py`), NSRDB resampling (`test_nlr.py`), Firestore helpers (`test_firestore_helpers.py`), storage (`test_storage.py`), and utilities (`test_utils.py`).

### Key Discrepancies Checklist
- [x] **Frontend Framework & Interactive Charts (Preliminary Baseline)**: Preact + TypeScript + Vite + `uPlot` currently in place (`frontend/`); subject to frontend developer review and `Dev Accepted` sign-off before establishing as canon.
- [x] **Frontend–Backend Interface Contracts (Phase 1A)**: Request, response, CSV header, KPI, and Tier-1 summary contracts implemented in `functions/contracts.py` and verified by `functions/tests/test_contracts.py`.
- [x] **Modular Engine & Vectorized Component Models (Phase 1A)**: `SimulationEngine`, `SimulationState`, and vectorized `PVModel`, `WindModel`, `GeneratorModel`, `BatteryModel`, `FinancialModel` implemented in `functions/engine/`.
- [x] **Structural Protocols, Coupled Dispatch Kernel, Epoch Modifiers, Deterministic PRNG, Repository Adapter & Tier-1 Summaries (Phase 1B)**: Implemented in `functions/engine/protocols.py`, `functions/engine/models/dispatch.py`, `functions/engine/state.py`, `functions/repository.py`, and `functions/engine/kpis.py`.
- [x] **Multi-Developer Agentic Coordination Baseline, `origin/test` Alignment & Multi-Tool Shims (Phase 1C.0 — Baseline)**: `origin/test` aligned to `main` (`4fefee3b`), plus 6-Point Pre-Flight Scope Lock, Cross-Agent Handoff Log, Non-Argon Self-Detection onboarding, `.gitignore` hardening, `.github/pull_request_template.md`, and synchronized shims (`GEMINI.md`, `AGENTS.md`, `CLAUDE.md`, `.rules`, `.github/copilot-instructions.md`) enforced via `functions/tests/test_governance.py`. *(Follow-ups remaining: first non-Argon session shim check, `ruff` + contract TS export).*
- [ ] **Repo Hygiene, Weather Cache & Admin Run Ledger Hook (Phase 1C.1–1C.3)**: Stage 1 Read-Only Audit recorded (Buckets A, B, C; `.rules` resolved in Phase 1C.0). Pending Stage 2/3 cleanup (`public/`, `SESDC-toolkit/`, root `requirements.txt`, dead scripts in `functions/`, debug logs, `test_governance.py` lock-in), NSRDB weather caching, and backend admin run ledger logging.
- [ ] **Multi-Year Clock, Comprehension Layer & Event Scheduler (Phase 2A)**: Extend `SimulationEngine` + `horizon.py` with epoch boundary callbacks, `ComprehensionLayer`, and `EventScheduler` shock injection.
- [ ] **Behavioral & Evaluative Agents (Phase 2B)**: Implement `Operator_Agent`, `Customer_Agent`, and `EvaluativeAgentProtocol` scorers on `EpochModifiers`.
- [ ] **Tier-2 Parquet & Tier-3 Columnar API (Phase 3 — Zero New Infra)**: Transition from `.csv.gz` blobs to single `{run_id}_hourly.parquet` in GCS, windowed columnar JSON endpoint, and on-demand CSV export.
- [ ] **Cloud Scale-Out & CI/CD (Phase 4 — 🔴 Red-Zone Infra)**: Add `multiprocessing` sweeps, **Pub/Sub -> Cloud Run** workers, **BigQuery** table mounting, and Cloud Run / `main` release workflows.
- [ ] **Parallel Frontend Development Track & Runtime Admin Viewer (Preliminary Placeholder)**: Co-design and implement across **Sync 1** (Non-Argon shim check, formatter/contract sync, Bucket C asset cleanup, Tier-1 summaries, Runtime Admin Viewer MVP), **Sync 2** (multi-year agent/shock UI), and **Sync 3** (Tier-3 windowed charts & on-demand CSV export).

### Progress & Dev Acceptance Tracker
- [x] **Phase 1A: Backend Modularization, Vectorization & Interface Contracts** — *Status: Completed & Verified (`pytest`)*
- [x] **Phase 1B: Structural Protocols, Coupled Dispatch Kernel, Epoch Modifiers, Repository Pattern & Tier-1 Summaries** — *Status: Completed & Verified (`pytest`)*
- [x] **Phase 1C.0 (Baseline): Multi-Developer Agentic Coordination, `origin/test` Sync, Pre-Flight Scope Lock & Multi-Tool Shims** — *Status: Pushed on `chore/agentic-coordination` & Verified (`pytest`) -> Ready for PR to `test` -> `Dev Accepted` (Follow-ups: Non-Argon first-run shim check, `ruff` + TS contract export)*
- [x] **Phase 1C.1 (Stage 1): Defensive Repository Read-Only Reference Audit & Triage Matrix** — *Status: Completed & Recorded*
- [ ] **Phase 1C (Remaining): Stage 2/3 Repo Cleanup, NSRDB Weather Cache & Admin Run Ledger Hook** — *Status: Next Up (🟡 Yellow-Zone Confirmation Required) -> `On test (Staging)` -> `Dev Accepted`*
- [ ] **Phase 2A: Multi-Year Epoch Clock, Comprehension Layer & Event Scheduler** — *Status: Provisional (🟡 Yellow-Zone Phase Gate) -> `In Progress` -> `On test (Staging)` -> `Dev Accepted`*
- [ ] **Phase 2B: Behavioral & Evaluative Agents** — *Status: Provisional (🟡 Yellow-Zone Phase Gate) -> `In Progress` -> `On test (Staging)` -> `Dev Accepted`*
- [ ] **Phase 3: Tier-2 Parquet Storage, Tier-3 Columnar API & On-Demand CSV Export** — *Status: Provisional (🟡 Yellow-Zone Phase Gate) -> `In Progress` -> `On test (Staging)` -> `Dev Accepted`*
- [ ] **Phase 4: Cloud Scale-Out (Multiprocessing, Pub/Sub -> Cloud Run & BigQuery)** — *Status: Provisional (🔴 Red-Zone Infrastructure Gate) -> `In Progress` -> `On test (Staging)` -> `Dev Accepted`*
- [ ] **Parallel Frontend Track (Sync 1, Sync 2, Sync 3) & Runtime Admin Viewer** — *Status: Preliminary Placeholder (Co-Design with Frontend Dev -> `On test (Staging)` -> `Dev Accepted [Graduates to Canon]`)*
