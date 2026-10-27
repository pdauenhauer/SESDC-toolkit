# SESDC-Toolkit — Mandatory Agent & Developer Governance Instructions

All AI agents and contributors working in this repository MUST follow the rules and workflows defined in:
1. **[workplan/governance.md](workplan/governance.md)** — Engineering standards, architecture, environment setup, and contract rules.
2. **[workplan/blueprint.md](workplan/blueprint.md)** — System architecture, 3-tier storage strategy, rolling-wave phase plan, and migration audit tracker.

---

## 1. Pre-Flight Checklist (Before Proposing or Writing Code)
1. **Read Authoritative Docs**: Always inspect `workplan/governance.md` and `workplan/blueprint.md` at the start of a task to align with current standards and the active phase.
2. **Rolling-Wave Phase Gate**: Check Section 7 and Section 8 of `workplan/blueprint.md`.
   - Future phases are intentionally provisional.
   - When a phase nears completion—or before starting a phase marked *Provisional*—re-audit the repository, evaluate assumptions and parallel frontend/backend status, and **flesh out the detailed phase plan in `workplan/blueprint.md` with the user before writing implementation code**.

---

## 2. Implementation Invariants (During Coding)
- **Frontend–Backend Contract Isolation (`functions/contracts.py`)**:
  - Never break existing keys (`storagePath`, `csvKeys`, `csvBundle`) or required CSV column headers (`EXPECTED_CSV_COLUMNS`) until a coordinated frontend/backend migration is explicitly requested.
  - Introduce new response fields (e.g., `summaryKpis`, `tier1Summaries`, `runId`) additively and cover them in `functions/tests/test_contracts.py`.
- **Simulation Engine Standards (`functions/engine/`)**:
  - **Structural Typing**: All component models, behavioral agents, evaluative agents, and persistence adapters must conform to `@runtime_checkable` `typing.Protocol` interfaces in `functions/engine/protocols.py`.
  - **Data-Oriented State**: Keep `SimulationState` (`functions/engine/state.py`) as contiguous NumPy arrays (Structure of Arrays); never serialize intermediate calculations to CSV strings.
  - **Deterministic Reproducibility**: All stochastic operations must use the seeded `state.rng` (`np.random.default_rng(seed)`) on `SimulationState`. Never use stdlib `random` or unseeded global `np.random.*` functions.
- **Repository Pattern & Offline Testability (`functions/repository.py`)**:
  - Access external cloud services (Firestore, GCS, BigQuery, Pub/Sub) through `SimulationRepositoryProtocol` adapters so unit tests run 100% offline.
- **Cold-Start Protection (`functions/main.py` & `functions/handlers.py`)**:
  - Never import heavy libraries (`numpy`, `pandas`, `numba`, `pyarrow`, `google.cloud`) at module top-level in `functions/main.py` or `functions/handlers.py`; keep them lazy-loaded inside execution paths.
- **Documentation Hygiene (`workplan/`)**:
  - Keep `workplan/governance.md` and `workplan/blueprint.md` as the sole markdown documents in `workplan/`. Consolidate new architectural or operational rules into those two files rather than creating fragmented `.md` files.

---

## 3. Post-Flight Verification Gate (Before Completing a Task)
1. **Run Backend Unit, Contract & Governance Tests**:
   - Execute `python -m pytest tests/ -v` from `functions/` (including `test_governance.py` and `test_contracts.py`).
2. **Run Frontend / Emulator Tests (When Frontend Changes Are in Scope)**:
   - Execute `npm run test:unit` or `npm run test:e2e`.
3. **Update Audit & Progress Tracker**:
   - Keep Section 7 and Section 8 of `workplan/blueprint.md` up to date when milestones are completed.
