# SESDC-toolkit
### A lightweight and simple toolkit for designing microgrids, Courtesy of Kilowatts for Humanity

## Overview & Project Scope
The **SESDC-toolkit** is a cloud-native web application designed to help community leaders, NGOs, students, and project developers model, simulate, and evaluate custom off-grid microgrid systems—particularly for rural electrification in the Global South. Built on a **"thin client, powerful server"** architecture, it enables users on low-bandwidth or resource-constrained devices to run multi-year energy and financial pre-feasibility simulations in the cloud.

### Core Capabilities
- **Custom Microgrid Design (`Workbench`)**: Configure hierarchical electrical loads, solar PV arrays, wind turbines, battery storage, and backup diesel generators tailored to real-world locations using National Solar Radiation Database (NSRDB) weather data.
- **Physics & Financial Simulation Engine**: Models hourly renewable generation, coupled renewable-first battery/generator dispatch, curtailment, unmet load, and 20-year financial projections (CAPEX, OPEX, fuel costs, and tariff revenues).
- **Interactive Visualization & Export**: Displays high-level performance KPIs, 20-year financial summaries, interactive time-series charts (`uPlot`), and downloadable CSV reports.

---

## Current State (High-Level)
- **Frontend (`frontend/`)**: Migrated to **Preact + TypeScript + Vite**, featuring Firebase Authentication, Firestore project persistence, an interactive component configuration `Workbench`, CSV data preview/export, and `uPlot` time-series visualization.
- **Simulation Backend (`functions/`)**: Runs on **Python 3.13 Firebase Cloud Functions** with a modular, protocol-driven simulation core (`functions/engine/`):
  - Vectorized `NumPy` solar (`PVModel`) and wind (`WindModel`) models, a `Numba`-ready single-pass coupled dispatch kernel (`CoupledDispatchModel`), and 20-year financial modeling (`FinancialModel`).
  - Versioned Frontend–Backend API contracts (`functions/contracts.py`) and offline-testable persistence adapters (`functions/repository.py`).
  - Hybrid persistence storing compact Tier-1 KPIs and 20-year/monthly summaries (`summaryKpis`, `tier1Summaries`) in **Cloud Firestore** alongside compressed `.csv.gz` simulation bundles in **Google Cloud Storage**.
- **Next Milestones (Roadmap)**:
  - **Phase 2**: Multi-year behavioral agents (`Operator_Agent`, `Customer_Agent`), agent comprehension layer, and stochastic stress-test event scheduling (`EventScheduler`).
  - **Phase 3**: Cloud scale-out with canonical Apache Parquet / BigQuery time-series storage, parallel scenario sweeps (`multiprocessing`), and asynchronous **Pub/Sub -> Cloud Run** execution.

---

## 2025–2026 Team
Bryan Kim, Evan Mickens, Jackson Gibbs, Victor Wong

---

## Getting Started & Documentation
- **Setup, Environment Variables & Engineering Standards**: See [workplan/governance.md](workplan/governance.md) for local setup prerequisites (Node.js 20, Python 3.13, Java 21), Firebase CLI & Emulator instructions, required `.env` variables (`frontend/.env` and `functions/.env`), and testing commands.
- **System Architecture & Phased Roadmap**: See [workplan/blueprint.md](workplan/blueprint.md) for the architectural blueprint, 3-tier storage strategy, and migration progress tracker.
- **End-User Guide**: See [USER-GUIDE.md](USER-GUIDE.md) for instructions on using the web application.

### Quick Test Commands
```bash
# Run backend Python unit, contract & governance tests
npm run test:functions

# Run frontend unit tests
npm run test:unit

# Run Firestore & Auth emulator E2E tests
npm run test:e2e
```

---

## Tools and Languages Used
<img src="https://img.shields.io/badge/Python-FFD43B?style=for-the-badge&logo=python&logoColor=blue" />
<img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=orange" />
<img src="https://img.shields.io/badge/preact-6f42c1?style=for-the-badge&logo=preact&logoColor=white" />
<img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" />
