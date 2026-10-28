# SESDC-Toolkit — Mandatory Agent & Developer Governance Instructions

All AI agents and contributors working in this repository MUST follow the rules and workflows defined in:
1. **[workplan/governance.md](workplan/governance.md)** — Engineering standards, architecture, multi-developer workflow, agent autonomy guardrails, and contract rules.
2. **[workplan/blueprint.md](workplan/blueprint.md)** — System architecture, 3-tier storage strategy, rolling-wave phase plan, and migration/acceptance tracker.

---

## 1. Pre-Flight Checklist (Before Proposing or Writing Code)
1. **Read Authoritative Docs**: Always inspect `workplan/governance.md` and `workplan/blueprint.md` at the start of a task to align with current standards, active domain ownership, and the current phase.
2. **Rolling-Wave Phase Gate**: Check Section 7 and Section 8 of `workplan/blueprint.md`.
   - Future phases are intentionally provisional, and all frontend items are **preliminary** until ratified with the frontend developer.
   - When a phase nears completion—or before starting a phase marked *Provisional*—re-audit the repository, evaluate assumptions and parallel frontend/backend status, and **flesh out the detailed phase plan in `workplan/blueprint.md` with the user before writing implementation code**.

---

## 2. Tiered Agent Autonomy & Approval Matrix ("Traffic Light" Guardrails)

To maintain high day-to-day velocity while protecting critical architectural, security, and cross-developer boundaries, all agent actions are governed by three autonomy zones:

### 🟢 Green Zone — Autonomous Execution (Proceed Without Stopping)
Agents may execute these actions directly, verify with automated tests, and report the outcome:
- Implementing or refactoring internal module logic within the active scoped directory (e.g., `functions/engine/` during backend work) that preserves existing contracts.
- Adding or updating unit, contract, governance, or emulator E2E tests (`functions/tests/`, `tests/`).
- Running read-only repository audits, searches, linters, and local test suites (`pytest`, `vitest`).
- Routine reflexive updates to `workplan/blueprint.md` progress trackers and `workplan/governance.md` for already-approved tasks.

### 🟡 Yellow Zone — Propose Plan & Confirm (Brief Impact Summary Required)
Agents must pause briefly, present a concise 2–3 bullet impact summary, and obtain user confirmation before applying:
- **Additive Contract or Schema Extensions**: Adding new optional fields to `functions/contracts.py` or Firestore helpers (`functions/firestore_helpers.py`).
- **Dependency Changes**: Adding, upgrading, or removing packages in `functions/requirements.txt`, root `package.json`, or `frontend/package.json`.
- **Phase-Gate Transitions**: Moving a provisional phase in `workplan/blueprint.md` into active implementation.
- **Bulk File Cleanup / Deletions**: Deleting files or directories (including audited Bucket A/B legacy vestiges).

### 🔴 Red Zone — Hard Stop & Explicit Human Sign-Off Required (High Blast Radius)
Agents MUST stop, explain the blast radius, security/cost implications, or cross-team impact, and wait for explicit approval before touching:
- **Cross-Domain Ownership Boundaries**: Modifying `frontend/**` during a backend task (or `functions/**` during a frontend task) without explicit authorization from the owning developer.
- **Breaking Contract Changes**: Renaming, removing, or changing types of existing fields in `functions/contracts.py` (`storagePath`, `csvKeys`, `csvBundle`, `EXPECTED_CSV_COLUMNS`).
- **Security, IAM & Infrastructure Configs**: Modifying `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`, or `.github/workflows/*.yml`.
- **Cloud Cost, Quotas & External Services**: Changing Cloud Function memory/timeout/concurrency limits, provisioning new GCP resources (Cloud Run, BigQuery, Pub/Sub), or altering external API (`NLR_API_KEY`) call patterns that affect rate limits or billing.
- **Git Push, Branch Merges & Deployments**: Running `git push`, `firebase deploy`, or merging branches into `test` or `main`.

---

## 3. Multi-Developer Branching & `test` Dev Acceptance Protocol
- **Scoped Feature Branches**: Developers and agents work on scoped branches (`be/<topic>`, `fe/<topic>`, `chore/<topic>`) rather than committing directly onto `test` or `main`.
- **Pull Request Firewall into `test`**: Merging into `test` requires passing backend unit/contract/governance tests (`functions-unit-tests.yml`) and emulator E2E tests (`e2e-emulators.yml`). Optional Firebase Hosting Preview Channels may be used on frontend PRs to preview UI changes prior to merge.
- **Staging Auto-Deploy & Dev Acceptance Gate**:
  - Merging to `test` auto-deploys to the shared staging environment (`sesdc-toolkit2`).
  - Deliverables follow a 4-step acceptance lifecycle in `workplan/blueprint.md`: `In Progress` → `On test (Staging)` → `Dev Accepted [FE/BE Sign-Off]` → `Promoted to main`.
  - Items marked **Preliminary** (such as frontend standards and UI/Admin features) only graduate to authoritative **Canon** in `workplan/governance.md` once verified on `test` and marked `Dev Accepted`.

---

## 4. Implementation Invariants (During Coding)
- **Frontend–Backend Contract Isolation (`functions/contracts.py`)**:
  - Never break existing keys (`storagePath`, `csvKeys`, `csvBundle`) or required CSV column headers (`EXPECTED_CSV_COLUMNS`) until a coordinated frontend/backend migration is explicitly requested and approved (🔴 Red Zone).
  - Introduce new response fields (e.g., `summaryKpis`, `tier1Summaries`, `runId`) additively (🟡 Yellow Zone) and cover them in `functions/tests/test_contracts.py`.
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

## 5. Reflexive Governance Loop (Mandatory Co-Update Protocol)
Whenever any code change, refactor, workflow update, or architectural discussion revises our approach, you MUST reflexively perform this **3-part co-update in the same turn**:
1. **Update `workplan/governance.md`** if any engineering standard, `Protocol` interface, component model, CI/CD workflow (`.github/workflows/*.yml`), runtime version (`firebase.json`), secret (`SecretParam`), or storage convention was added or modified.
2. **Update `workplan/blueprint.md`** if any architectural component, storage tier, phase scope, or migration/acceptance status changed.
3. **Update `functions/tests/test_governance.py`** if a new architectural invariant or standard was introduced, so that the rule is permanently enforced as code.

---

## 6. Post-Flight Verification Gate (Before Completing a Task)
1. **Run Backend Unit, Contract & Bidirectional Governance Tests**:
   - Execute `python -m pytest tests/ -v` from `functions/`.
   - Note: `test_governance.py` runs **bidirectional drift checks** that will fail if `.github/workflows/`, `firebase.json`, `protocols.py`, `engine/models/`, or `handlers.py` secrets are out of sync with `workplan/governance.md` and `workplan/blueprint.md`.
2. **Run Frontend / Emulator Tests (When Frontend Changes Are in Scope)**:
   - Execute `npm run test:unit` or `npm run test:e2e`.
3. **Verify Audit & Progress Tracker**:
   - Confirm Section 7 and Section 8 of `workplan/blueprint.md` accurately reflect the verified state and Dev Acceptance status of the work.
