# SESDC-Toolkit — Claude Workspace Instructions (`CLAUDE.md`)

Welcome! Multiple developers collaborate on `SESDC-toolkit` using different IDEs and frontier models (including **VS Code + Claude** and **Zed + Gemini Argon**). To prevent cross-branch collisions and architectural drift, you MUST follow the authoritative governance canon:
1. **[workplan/governance.md](workplan/governance.md)** — Architecture, **6-Point Pre-Flight Scope Lock**, **Traffic-Light Autonomy Matrix** (`Green Zone` / `Yellow Zone` / `Red Zone`), single-layer task chunking, and contract standards.
2. **[workplan/blueprint.md](workplan/blueprint.md)** — Phased roadmap, `Preliminary` frontend status & `Dev Accepted` lifecycle, and the **Cross-Agent Handoff & Breaking Spec Log** (Section 8).
3. **[contracts/simulation-contracts.d.ts](contracts/simulation-contracts.d.ts)** — Auto-generated, machine-verified TypeScript mirror of `functions/contracts.py` (exact request payloads, `summaryKpis`, `tier1Summaries`, and CSV column schemas).

---

## 1. Claude / VS Code Self-Detection & Adapter Refinement (🟡 Yellow Zone)
This baseline `CLAUDE.md` shim was bootstrapped before a live Claude + VS Code session ran in this repo.
- **On your first session**, inspect how you are invoked (e.g., Claude Code CLI/extension, VS Code Copilot with Claude, Cline/Roo) and check whether concise Claude- or VS Code-specific instructions would improve reliability (such as targeted file-reading patterns, sub-task chunking sizes, or local `.claude/` settings).
- If refinements are helpful, **pause under the 🟡 Yellow Zone**, present a 2–3 bullet summary to the developer, and update `CLAUDE.md` while keeping all canonical project standards in `workplan/governance.md` (note: `functions/tests/test_governance.py` enforces alignment across all agent shims).

## 2. Mandatory Pre-Flight Scope Lock (Run Before Every Task)
Before editing any file, run the 6-point Pre-Flight check in `workplan/governance.md` and output this banner:
```markdown
**Pre-Flight Scope Lock**
- **Branch**: `[be|fe|chore]/<topic>` (MUST NOT be `main` or `test`) | **Autonomy Zone**: `[🟢 Green | 🟡 Yellow | 🔴 Red]`
- **Allowed Write**: `<explicit target files/dirs>` | **Read-Only Context**: `<contracts/simulation-contracts.d.ts, workplan/blueprint.md>` | **Forbidden**: `<cross-domain & Red-Zone paths>`
- **Verification Gate**: `<exact test/build commands + blueprint Section 8 Handoff Log check>`
```

## 3. Core Guardrail Summary
- **Strict Blast Radius**: Focus edits strictly inside `Allowed Write`. Do **not** opportunistically refactor surrounding files. Modifying `functions/**` during a `fe/*` frontend task (or `frontend/**` during a `be/*` backend task) is a **🔴 Red Zone** hard stop requiring explicit cross-developer sign-off.
- **Traffic-Light Zones**:
  - **🟢 Green Zone**: Scoped internal edits preserving contracts, unit/emulator tests, local test runs, routine tracker updates.
  - **🟡 Yellow Zone** *(Pause & Confirm)*: Additive fields in `functions/contracts.py` (regenerate `contracts/simulation-contracts.d.ts`), dependency edits (`package.json`, `requirements.txt`), `blueprint.md` phase transitions, bulk file cleanup, or updating agent shims.
  - **🔴 Red Zone** *(Hard Stop)*: Cross-domain edits, breaking `functions/contracts.py` changes, `firestore.rules`, `storage.rules`, `firebase.json`, `.github/CODEOWNERS`, `.github/workflows/*.yml`, GCP cost/quota changes, `git push`, or `firebase deploy`.
- **Cross-Agent Memory**: Always read **Section 8 (`Cross-Agent Handoff & Breaking Spec Log`)** of `workplan/blueprint.md` at session start so you immediately see recent backend/contract changes made by Argon (and append an entry when your changes affect contracts, auth, or shared assumptions).
- **Local Verification Gates**:
  - Backend / Governance: `npm run test:functions` (runs `pytest`, including `test_contracts.py` and `test_governance.py`).
  - Frontend: `cd frontend && npm run build` and `npm run test:unit` (or `npm run test:e2e` with Firebase Emulators).
