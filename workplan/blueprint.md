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

- **Client (The Browser)**: A modern web application allows users to configure simulation parameters, launch runs, and visualize results. It performs no calculations itself.
- **Server (Google Cloud)**: A suite of serverless services that work in concert:
    - An API layer receives requests from the client and validates them against the API contract.
    - A long-running task service executes multi-year agent simulations and scenario sweeps.
    - A 3-tier hybrid data storage system manages simulation metadata, compact summaries, and columnar time-series results behind a clean `SimulationRepository` abstraction.
- **Data Flow**: The client sends small configuration requests to the server. The server runs the entire simulation in memory using typed NumPy arrays, persists compact summaries to Firestore and canonical hourly time-series to columnar storage (Parquet on GCS / BigQuery), and returns only lightweight, pre-aggregated or downsampled numeric arrays to the client for visualization.
- **Frontend–Backend Contract Isolation**: Communication between client and server is governed by explicit, versioned API contracts (`functions/contracts.py`) so frontend and backend development can proceed independently without breaking integrations.

## 3. Frontend & Visualization Architecture
- **Framework**: Preact + TypeScript (React-compatible ecosystem), bundled with Vite.
    - *Rationale*: Modern component-based UI frameworks enable the creation of a rich, responsive user interface with minimal bundle size, ideal for low-bandwidth environments and student-led development.
- **Visualization Strategy (`uPlot` + Pre-Aggregated Summaries)**:
    - *Interactive Time-Series Charts (`uPlot`)*: `uPlot` is used as the primary interactive charting engine (`UPlotChart.tsx`, `SimulationGraphsPanel.tsx`) because of its tiny footprint, low CPU/memory overhead on older devices, and native support for columnar numeric arrays (`[timestamps[], series1[], ...]`). It supports toggling signals, zooming/panning across simulation windows, and viewport-aware downsampling so full datasets do not need to be rendered at once.
    - *Summary & Report Views*: High-level KPIs, 20-year financial projections, and monthly summaries are rendered from lightweight pre-aggregated Tier-1 data (`tier1Summaries` and `summaryKpis`).
- **Hosting**: Firebase Hosting.
    - *Rationale*: Firebase Hosting provides a simple, secure, and globally distributed CDN for the web application. Its seamless integration with the backend and generous free tier make it a cost-effective and low-maintenance choice.

## 4. Backend Architecture

### 4.1 Service & Persistence Architecture
- **API Layer**: Cloud Functions for Firebase (Python 3.13).
    - *Rationale*: Cloud Functions act as the secure HTTP endpoints for the application. They validate user requests via `SimulationRequestContract`, authenticate users, and either execute fast single-run simulations or enqueue heavy multi-scenario jobs.
- **Long-Running Task Execution**: Google Cloud Run, triggered via Pub/Sub.
    - *Rationale*: Multi-year agent simulations and Monte Carlo sensitivity sweeps can exceed standard HTTP function timeouts. The "HTTP Function -> Pub/Sub -> Cloud Run" pattern provides asynchronous background processing with configurable CPU/memory and concurrency.
- **Repository & Adapter Pattern (`functions/repository.py`)**:
    - *Rationale*: Persistence operations are abstracted behind `SimulationRepositoryProtocol` (`InMemorySimulationRepository` for offline `pytest` and local emulators; `GcpSimulationRepository` for Firestore/GCS/BigQuery). This guarantees 100% offline testability and compliance with `governance.md`.

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

1. **Tier 1 — Metadata, KPIs & Compact Summaries (in Cloud Firestore)**:
    - *What is stored*: User inputs, run status (`queued` | `running` | `completed` | `failed`), scalar summary KPIs (`summaryKpis`), and small pre-aggregated summary series (`tier1Summaries`: 20-year annual `financial_expenses` and `revenue` arrays [20 rows], and 12-month solar averages).
    - *Rationale*: These datasets total less than 15 KB per run as native JSON. Storing them directly in Firestore (`users/{uid}/projects/{pid}` or a `simulations/{runId}` subcollection) allows the frontend to render KPIs, financial charts, and overview dashboards **instantly** without invoking a Cloud Function, downloading GCS blobs, or parsing CSV text.
2. **Tier 2 — Canonical Hourly Time-Series (Apache Parquet on GCS + Google BigQuery)**:
    - *What is stored*: A single canonical hourly table per simulation run (8,760 to 175,200 rows) stored as a typed, compressed **Apache Parquet** file (`{run_id}_hourly.parquet`) in Google Cloud Storage and loaded/mounted into **Google BigQuery** (partitioned by time and clustered by `simulation_run_id`).
    - *Rationale*: Eliminates the 6 redundant derived CSV files (`daily_averages`, `twenty_year_daily`, `solar_heatmap`, `monthly_heatmap`, etc.). Parquet is 5–10x smaller and 10x faster to read/write than `.csv.gz`, preserves strict numeric types, supports reading only selected columns (column projection), and bridges natively into BigQuery with zero transformation overhead.
3. **Tier 3 — Columnar Wire Delivery & On-Demand CSV Export**:
    - *Interactive Chart Delivery*: Backend endpoints serve downsampled, time-windowed **columnar JSON arrays** (`[timestamps[], load_kW[], solar_kW[], ...]`) directly matching `uPlot`'s native input format, avoiding client-side CSV parsing on low-power devices.
    - *On-Demand CSV Export*: CSV is treated strictly as an **end-user export format** (generated on the fly or served via signed URL only when a user clicks "Download CSV"), never as an internal storage or default API wire format.

## 6. Performance & Optimization Strategy

### Core Calculation Speed
- **Vectorization (NumPy)**: Used for all non-state-dependent calculations (`PVModel`, `WindModel`).
- **Single-Pass Coupled Dispatch Kernel (Numba `@njit`)**: `run_coupled_dispatch_kernel` in `functions/engine/models/dispatch.py` executes battery charge/discharge, curtailment, diesel backup, and unmet load in a single pass over contiguous `float64` arrays, using `@numba.njit(cache=True)` automatically when `numba` is installed.

### Scenario Throughput
- **Parallelization (`multiprocessing`)**: Used to execute multiple independent simulation scenarios in parallel on multi-core Cloud Run instances, with isolated `np.random.SeedSequence` streams per worker and lazy serialization (skipping CSV string formatting during intermediate Monte Carlo runs).

### End-User Experience
- **Server-Side Aggregation & Downsampling**: All queries and downsampling against the hourly Parquet/BigQuery dataset are performed on the server. The backend sends only small, pre-aggregated (`tier1Summaries`) or viewport-downsampled numeric arrays to the client, ensuring a responsive experience even on low-bandwidth connections.

## 7. Phased Implementation Plan (Rolling-Wave & Contract-Driven)

> **Expectation for Future Phased Work (Rolling-Wave Planning)**:
> Future phases in this blueprint (`Phase 2`, `Phase 3`, and beyond) are **intentionally provisional** and are not fully predetermined. Architectural details, priorities, and scope may shift as the project evolves and as parallel frontend/backend work progresses.
>
> **When a phase nears completion (or before starting the next phase), developers and AI agents MUST:**
> 1. **Audit** the current repository state, active tests, CI/CD workflows, and Frontend–Backend contracts (`functions/contracts.py`).
> 2. **Re-evaluate** the assumptions and scope of the upcoming phase based on lessons learned, performance observations, and team priorities.
> 3. **Flesh out and revise** the next phase into detailed, actionable tasks, module boundaries, and test criteria in this document—and adjust subsequent phases accordingly—before implementing new features.

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

### Phase 2: Multi-Year Epoch Clock, Behavioral Agents & Event Scheduler (Next Up — Provisional, To Be Fleshed Out at Phase Gate)
*Goal: Build Behavioral Agents, Comprehension Layer, and Stress-Test Events on top of `EpochModifiers` and `CoupledDispatchModel`, locking in the final time-series schema before BigQuery/Cloud Run deployment.*
- **Behavioral Agents (`Operator_Agent`, `Customer_Agent`)**: Implement `BehavioralAgentProtocol` actors that adjust tariffs, dispatch reserves, and `EpochModifiers.load_multiplier` across the 20-year horizon.
- **Comprehension Layer & Event Scheduler**: Implement imperfect agent perception filters (`ComprehensionLayer` using `state.rng`) and discrete shock injection (`EventScheduler` mutating `EpochModifiers` for equipment failures, fuel price spikes, weather anomalies).
- **Evaluative Agents**: Expand `engine/kpis.py` into `EvaluativeAgentProtocol` implementations producing sustainability and financial health scores, and lock in the final canonical time-series schema in `contracts.py`.

### Phase 3: Cloud Scale-Out, Parquet/BigQuery Pipeline, Multiprocessing & Frontend Sync (Provisional — Directional Outline)
*Goal: Scale the finalized multi-year agent engine to massive datasets and parallel scenario sweeps in the cloud, and synchronize the frontend with Tier-1 summaries and Tier-3 columnar `uPlot` endpoints.*
- **Scenario Parallelization (`multiprocessing`)**: Parallelize multi-scenario sensitivity and Monte Carlo runs across CPU cores using isolated `SeedSequence` streams.
- **Tier 2 Storage (Canonical Parquet on GCS -> BigQuery)**: Replace the legacy 8-file `.csv.gz` bundle with a single `{run_id}_hourly.parquet` artifact in GCS bridged to a partitioned, clustered **BigQuery** table.
- **Tier 3 API (Windowed Columnar `uPlot` JSON & On-Demand CSV Export)**: Serve downsampled columnar numeric arrays (`[timestamps[], series1[], ...]`) to `SimulationGraphsPanel.tsx` and move CSV generation to an on-demand export endpoint.
- **Asynchronous Execution (Pub/Sub -> Cloud Run) & CI/CD**: Deploy containerized Cloud Run workers triggered via Pub/Sub for long-running scenario batches, and extend GitHub Actions workflows for Cloud Run and `main` branch production releases.

---

## 8. Audit & Migration Tracking
*This section tracks the exact current state of the repository against the Target Blueprint.*

### Current Codebase State (Audit Summary)
- **Frontend (`frontend/`)**: Migrated to **Preact + TypeScript + Vite** with authentication, project management, hierarchical load `Workbench`, CSV preview/download (`SimulationResults.tsx`), and interactive `uPlot` time-series charts (`SimulationGraphsPanel.tsx`). *(Note: Frontend files are currently frozen in this workspace to avoid conflicts with active parallel frontend development; the Project Wizard is deprioritized).*
- **Backend API, Contracts & Repository (`functions/main.py`, `functions/handlers.py`, `functions/contracts.py`, `functions/repository.py`)**: Exposes Python 3.13 HTTP Cloud Functions (`run_simulation_post` and `get_stored_simulation`) backed by validated contracts (`SimulationRequestContract`, `SimulationResponseContract`, `StoredSimulationResponseContract`, `Tier1SimulationSummaries`) and a pluggable `SimulationRepositoryProtocol` (`InMemorySimulationRepository` / `GcpSimulationRepository`).
- **Simulation Core (`functions/engine/`, `functions/simulation.py`, `functions/calculations.py`)**: Refactored into modular `SimulationEngine` ("Clock"), `SimulationState` (with `EpochModifiers`, `curtailed_power`, and deterministic `np.random.Generator` seeding), `protocols.py` (`ComponentModelProtocol`, `BehavioralAgentProtocol`, `EvaluativeAgentProtocol`, `SimulationRepositoryProtocol`), `compute_summary_kpis`, `compute_tier1_summaries`, and component models (`PVModel`, `WindModel`, `CoupledDispatchModel`, `GeneratorModel`, `BatteryModel`, `FinancialModel`). Behavioral agents, comprehension layer, and event scheduler are scoped for Phase 2.
- **Data Storage (`functions/storage.py`, `functions/firestore_helpers.py`, `functions/repository.py`)**: Records **Tier-1** `summaryKpis` and `tier1Summaries` (20-year financials and monthly solar averages) directly in **Firestore** alongside backward-compatible `.csv.gz` bundles in **Google Cloud Storage**. Migration of Tier-2 (single canonical **Parquet** on GCS / **BigQuery**) and Tier-3 (columnar JSON wire format + on-demand CSV export) is scoped in Phase 3 once Phase 2 locks in the agent time-series schema.
- **Testing (`tests/`, `functions/tests/`)**: Vitest + Firebase Emulators test Firestore rules and project CRUD (`e2e-emulators.yml`). `pytest` tests contracts (`test_contracts.py`), modular component models & coupled dispatch (`test_models.py`), protocols, repository adapters, deterministic seeding, Tier-1 summaries, and full-year engine execution (`test_engine.py`), bidirectional governance compliance (`test_governance.py`), Firestore helpers (`test_firestore_helpers.py`), storage (`test_storage.py`), and utilities (`test_utils.py`).

### Key Discrepancies Checklist
- [x] **Frontend Framework & Interactive Charts**: Preact + TypeScript + Vite + `uPlot` implemented (`frontend/`).
- [x] **Frontend–Backend Interface Contracts (Phase 1A)**: Request, response, CSV header, KPI, and Tier-1 summary contracts implemented in `functions/contracts.py` and verified by `functions/tests/test_contracts.py`.
- [x] **Modular Engine & Vectorized Component Models (Phase 1A)**: `SimulationEngine`, `SimulationState`, and vectorized `PVModel`, `WindModel`, `GeneratorModel`, `BatteryModel`, `FinancialModel` implemented in `functions/engine/`.
- [x] **Structural Protocols, Coupled Dispatch Kernel, Epoch Modifiers, Deterministic PRNG, Repository Adapter & Tier-1 Summaries (Phase 1B)**: Implemented in `functions/engine/protocols.py`, `functions/engine/models/dispatch.py`, `functions/engine/state.py`, `functions/repository.py`, and `functions/engine/kpis.py`.
- [ ] **Behavioral Agents, Comprehension Layer & Event Scheduler (Phase 2)**: Need `Operator_Agent`, `Customer_Agent`, `Comprehension Layer`, and `Event Scheduler` operating on `EpochModifiers`.
- [ ] **Tier-2/Tier-3 Storage & Async Cloud Execution (Phase 3)**: Transition from 8 `.csv.gz` blobs to canonical **Parquet** in GCS / **BigQuery**, columnar JSON `uPlot` endpoints, `multiprocessing`, and **Pub/Sub -> Cloud Run**.
- [ ] **CI/CD & Infrastructure (Phase 3)**: Extend GitHub Actions workflows to cover **Cloud Run** container builds/deployments and production release gates on `main`.

### Progress Tracker & Next Phase Gate
- [x] Phase 1A: Backend Modularization, Vectorization & Interface Contracts (Completed)
- [x] Phase 1B: Structural Protocols, Coupled Dispatch Kernel, Epoch Modifiers, Repository Pattern & Tier-1 Summaries (Completed)
- [ ] **Phase-Gate Review**: Re-audit codebase & requirements, then fully scope and flesh out **Phase 2 (Behavioral Agents, Comprehension Layer & Event Scheduler)** before implementation.
- [ ] Phase 2: Behavioral Agents, Comprehension Layer & Event Scheduler (Provisional)
- [ ] Phase 3: Cloud Scale-Out, Parquet/BigQuery Pipeline, Multiprocessing & Frontend Sync (Provisional)
