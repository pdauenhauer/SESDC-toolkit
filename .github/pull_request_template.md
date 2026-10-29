## Summary & Scope Lock
- **Domain / Layer**: `[ ] Backend (be/*)  [ ] Frontend (fe/*)  [ ] Contract/Schema  [ ] Chore/Docs (chore/*)`
- **AI Tool / Model Used (if applicable)**: `e.g., Zed + Gemini Argon / VS Code + Claude / Manual`
- **Highest Autonomy Zone Touched**: `[ ] 🟢 Green  [ ] 🟡 Yellow (Confirmed)  [ ] 🔴 Red (Explicitly Signed Off)`

### Objective & Key Changes
- 

---

## Multi-Agent Coordination & Pre-Flight Checklist
- [ ] **Single-Layer Scope**: Changes stay within the declared `Allowed Write` directories without opportunistic out-of-scope refactoring.
- [ ] **Cross-Domain Boundary Check**: Does NOT touch both `frontend/**` and `functions/**` (or if it does, affected domain owner review is requested).
- [ ] **Contract Isolation (`functions/contracts.py`)**: Existing keys (`storagePath`, `csvKeys`, `csvBundle`, `EXPECTED_CSV_COLUMNS`) remain backward-compatible, or coordinated migration was explicitly approved.
- [ ] **Cross-Agent Handoff Log**: Updated **Section 8 (`Cross-Agent Handoff & Breaking Spec Log`)** in `workplan/blueprint.md` if contracts, auth, shared state, or cross-dev assumptions changed.
- [ ] **Reflexive Governance**: Updated `workplan/governance.md`, `workplan/blueprint.md`, and `functions/tests/test_governance.py` if protocols, models, secrets, workflows, or standards changed.

## Verification Gates Run Locally
- [ ] `npm run test:functions` (`pytest` unit, contract & governance drift suite)
- [ ] `cd frontend && npm run build` (TypeScript + Vite build check, if `frontend/` touched)
- [ ] `npm run test:e2e` / `npm run test:unit` (if Firestore/Auth/UI behavior touched)

> **Merge Reminder**: Use **Squash and Merge** when merging into `test` to keep integration history clean for AI context windows.
