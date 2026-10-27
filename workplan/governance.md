# Design Governance Document - SESDC-toolkit

## Overview
This document captures the current design, architectural, and operational practices for the SESDC-toolkit project. It serves as a central reference for engineering standards and project lifecycle management.

## Project Architecture
The project is a microgrid design toolkit featuring a decoupled frontend and backend architecture:
- **Frontend**: Built with **Preact + TypeScript**, bundled using **Vite**.
- **Backend**: Powered by **Firebase** and **Google Cloud Platform**.
    - **API Layer**: Firebase Cloud Functions (Python) handle requests and initiate tasks.
    - **Task Execution**: Long-running simulations are orchestrated via **Pub/Sub** and executed on **Google Cloud Run** to bypass standard function timeouts.
    - **Data Storage**: A hybrid model using **Cloud Firestore** for simulation metadata/KPIs and **Google BigQuery** for massive time-series result analysis.
- **Language Stack**: Python (Simulation & Functions), TypeScript (Frontend), and SQL-like rules for Firestore/Storage.

## Development Workflow
### Branching Strategy
- **Working Branch**: `test` is the primary branch for active development.
- **Production**: `main` is reserved for substantial, stable changes.

### Environment & Setup
- **Local Development**: Developers use the Firebase Emulator Suite (Auth, Firestore, Functions, Storage) to simulate the production environment locally.
- **Environment Variables**: Managed via `docs/ENV-VARS.md`. Configuration for the frontend is injected during the Vite build process using `VITE_FIREBASE_*` secrets.

### Frontend Standards
- **Project Layout**: Entry point is `frontend/src/main.tsx`. Routing is managed in `frontend/src/app.tsx` using `preact-iso`.
- **Component Architecture**: 
    - Page-level components reside in `frontend/src/pages`.
    - Reusable leaf components reside in `frontend/src/components`.
- **Styling**: Current practice favors vanilla CSS files in `frontend/src/css/`.

### Backend & Simulation Standards
- **Architecture**: The simulation core must follow a **modular, agent-based** design using a central **"Clock" engine** and a unified **State Object**.
- **Performance**: Utilize **NumPy** for vectorization and **Numba (JIT)** for performance-critical state-dependent loops. Use **multiprocessing** for parallel scenario execution.
- **Data Integrity**: Avoid storing large raw result datasets as CSV blobs in Firestore. Stream raw results to **BigQuery** and fetch aggregated summaries via the backend.
- **Database**: Firestore is used for primary metadata and real-time status updates.

## CI/CD & Deployment
- **Tools**: Managed via **GitHub Actions**.
- **Workflows**:
    - `firebase-dev-deploy.yml`: Automatically builds and deploys the frontend to Firebase Hosting on pushes to the `test` branch.
    - `e2e-emulators.yml`: Runs end-to-end (E2E) tests against the Firebase emulator suite on pushes and pull requests to `test`.
- **Testing**: Vitest is used for the test suite.

## Operational Guidelines
- **Dependency Management**: Use `npm install` for root and frontend dependencies. 
- **Firebase Initialization**: Follow the specific prompts in `docs/PROJECT-INIT.md` to ensure consistent emulator and rule configurations.
- **Security**: Never overwrite existing rules during `firebase init` unless explicitly planned.
