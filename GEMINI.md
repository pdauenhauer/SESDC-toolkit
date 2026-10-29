# SESDC-Toolkit — Mandatory Agent & Developer Governance Instructions

All AI agents and contributors working in this repository MUST follow the authoritative rules and workflows defined in:
1. **[workplan/governance.md](workplan/governance.md)** — Engineering standards, architecture, multi-developer workflow, Pre-Flight Scope Lock, agent autonomy guardrails, and contract rules.
2. **[workplan/blueprint.md](workplan/blueprint.md)** — System architecture, 3-tier storage strategy, rolling-wave phase plan, **Cross-Agent Handoff & Breaking Spec Log** (Section 8), and acceptance tracker.

*(Synchronized multi-tool shims `AGENTS.md`, `CLAUDE.md`, `.rules`, and `.github/copilot-instructions.md` route non-Gemini IDEs and models to these exact same rules).*

---

## 1. Mandatory 6-Point Pre-Flight Checklist & Scope-Lock Banner
Before proposing edits or modifying any file, every agent session MUST execute this 6-point check and output a compact **Pre-Flight Scope Banner**:
1. **Branch & Working-Tree Check**: Run `git branch --show-current` and `git status`. **Hard stop** if on `main` or `test`, or if unrelated untracked clutter is present. Work only on domain-scoped branches (`be/<topic>`, `fe/<topic>`, `chore/<topic>`).
2. **Cross-Agent Handoff & Blueprint Sync**: Read `workplan/governance.md` and Sections 7–8 of `workplan/blueprint.md`—especially the **Cross-Agent Handoff & Breaking Spec Log**—to absorb recent backend/frontend updates from parallel contributors.
3. **Blast-Radius & Directory Lock**: Explicitly restrict write access to the active task directory (`Allowed Write`), keep surrounding modules strictly `Read-Only Context`, and treat cross-domain folders (`frontend/**` during `be/*`; `functions/**` during `fe/*`) as **🔴 Red-Zone Forbidden**.
4. **Contract-First Verification**: Agents never negotiate cross-domain API or schema boundaries unilaterally. Shared payload changes must be ratified by humans in `functions/contracts.py` (🟡 Yellow if additive, 🔴 Red if breaking) before parallel UI/BE coding begins.
5. **Single-Layer Chunking & Traffic-Light Classification**: Confirm the task modifies **at most one layer** (*Contract/Schema*, *Backend Logic*, or *Frontend UI*) per PR/commit and classify actions into **🟢 Green / 🟡 Yellow / 🔴 Red**. Also check the Rolling-Wave Phase Gate (`Preliminary` frontend status and `Provisional` future phases).
6. **Local Verification Gate Selection**: State the exact local test/build commands required before committing (`npm run test:functions`, `cd frontend && npm run build`, `npm run test:e2e`).

```markdown
**Pre-Flight Scope Lock**
- **Branch**: `be/<topic>` | **Autonomy Zone**: 🟢 Green (or 🟡 Yellow / 🔴 Red)
- **Allowed Write**: `<explicit paths>` | **Read-Only Context**: `<paths>` | **Forbidden**: `<cross-domain/Red paths>`
- **Verification Gate**: `<exact local test/build commands + blueprint Handoff Log check>`
```

### Multi-Tool Self-Detection Note
If you are running as a **non-Gemini/Argon** agent (e.g., Claude in VS Code via Claude Code, GitHub Copilot, Cline/Roo, or Cursor), inspect your own IDE/model environment at session start. If tool-specific adapter settings or context-chunking refinements would improve safety or developer ergonomics, pause under the **🟡 Yellow Zone** and propose concise updates to your tool's shim (`CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md`) while keeping `workplan/governance.md` and `workplan/blueprint.md` as the sole canon.

---

## 2. Tiered Agent Autonomy & Approval Matrix ("Traffic Light" Guardrails)

### 🟢 Green Zone — Autonomous Execution (Proceed Without Stopping)
Agents may execute these actions directly, verify with automated tests, and report the outcome:
- Implementing or refactoring internal module logic within the active scoped directory (e.g., `functions/engine/` during backend work) that preserves existing contracts.
- Adding or updating unit, contract, governance, or emulator E2E tests (`functions/tests/`, `tests/`).
- Running read-only repository audits, searches, linters, and local test suites (`pytest`, `vitest`).
- Routine reflexive updates to `workplan/blueprint.md` progress trackers, the Cross-Agent Handoff Log, and `workplan/governance.md` for already-approved tasks.

### 🟡 Yellow Zone — Propose Plan & Confirm (Brief Impact Summary Required)
Agents must pause briefly, present a concise 2–3 bullet impact summary, and obtain user confirmation before applying:
- **Additive Contract or Schema Extensions**: Adding new optional fields to `functions/contracts.py` or Firestore helpers (`functions/firestore_helpers.py`).
- **Dependency Changes**: Adding, upgrading, or removing packages in `functions/requirements.txt`, root `package.json`, or `frontend/package.json`.
- **Phase-Gate Transitions**: Moving a provisional phase in `workplan/blueprint.md` into active implementation.
- **Tool-Shim Customizations**: Refining `CLAUDE.md`, `AGENTS.md`, `.rules`, or `.github/copilot-instructions.md` when onboarding a non-Argon IDE/agent workflow.
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
- **Scoped Feature Branches**: Developers and agents work on domain-scoped branches (`be/<topic>`, `fe/<topic>`, `chore/<topic>`), committing verified micro-commits locally and squash-merging PRs into `test` rather than committing directly onto `test` or `main`.
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
Whenever any code change, refactor, workflow update, or architectural discussion revises our approach, you MUST reflexively perform this **co-update in the same turn**:
1. **Update `workplan/governance.md`** if any engineering standard, `Protocol` interface, component model, CI/CD workflow (`.github/workflows/*.yml`), runtime version (`firebase.json`), secret (`SecretParam`), or coordination rule was added or modified.
2. **Update `workplan/blueprint.md`** (including the **Cross-Agent Handoff & Breaking Spec Log** in Section 8) if any architectural component, contract, auth check, storage tier, phase scope, or acceptance status changed.
3. **Update `functions/tests/test_governance.py`** if a new architectural invariant or standard was introduced, so that the rule is permanently enforced as code.

---

## 6. Post-Flight Verification Gate (Before Completing a Task)
1. **Run Backend Unit, Contract & Bidirectional Governance Tests**:
   - Execute `python -m pytest tests/ -v` from `functions/` (or `npm run test:functions`).
   - Note: `test_governance.py` runs **bidirectional drift checks** that will fail if `.github/workflows/`, `firebase.json`, `protocols.py`, `engine/models/`, `handlers.py` secrets, or multi-tool agent shims are out of sync with `workplan/governance.md` and `workplan/blueprint.md`.
2. **Run Frontend / Emulator Tests (When Frontend Changes Are in Scope)**:
   - Execute `cd frontend && npm run build` and `npm run test:unit` / `npm run test:e2e`.
3. **Verify Handoff Log & Progress Tracker**:
   - Confirm Section 7 and Section 8 (Cross-Agent Handoff Log + Dev Acceptance status) of `workplan/blueprint.md` accurately reflect the verified state of the work.
