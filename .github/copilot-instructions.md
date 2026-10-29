# SESDC-Toolkit — VS Code / GitHub Copilot Agent Instructions

All AI assistants running in VS Code (including **GitHub Copilot Chat / Agent Mode** with Claude, GPT, or Gemini models) MUST adhere to the repository's single authoritative governance canon:
1. **[workplan/governance.md](../workplan/governance.md)** — Engineering standards, **6-Point Pre-Flight Scope Lock**, **Traffic-Light Autonomy Matrix** (`Green Zone` / `Yellow Zone` / `Red Zone`), single-layer task chunking, and contract standards.
2. **[workplan/blueprint.md](../workplan/blueprint.md)** — System architecture, `Preliminary` frontend status & `Dev Accepted` lifecycle, phased workplan, and the **Cross-Agent Handoff & Breaking Spec Log** (Section 8).

## 1. Self-Detection & VS Code Adapter Onboarding (🟡 Yellow Zone)
These baseline instructions were initialized before an active VS Code + Claude/Copilot agent session ran in this workspace.
- Detect your own model/IDE environment at session start. If VS Code-specific instructions or prompt conventions would improve coordination or safety, **pause under the 🟡 Yellow Zone** and propose concise updates to `.github/copilot-instructions.md` or `CLAUDE.md` with the developer—without duplicating or contradicting `workplan/governance.md`.

## 2. Mandatory Pre-Flight & Guardrails
- **Never Edit on `main` or `test`**: Always check `git branch --show-current` first (`be/<topic>`, `fe/<topic>`, `chore/<topic>`), read the **Cross-Agent Handoff Log** in `workplan/blueprint.md` Section 8, and emit the **Pre-Flight Scope Banner** (`Branch | Autonomy Zone | Allowed Write | Read-Only Context | Forbidden | Verification Gate`) before editing files.
- **Traffic-Light Guardrails**:
  - **🟢 Green Zone**: Internal module changes inside `Allowed Write` preserving contracts, unit/E2E tests, local test execution.
  - **🟡 Yellow Zone** *(Pause & Confirm)*: Additive `functions/contracts.py` fields, dependency updates, phase transitions in `workplan/blueprint.md`, file deletions, or agent shim updates.
  - **🔴 Red Zone** *(Hard Stop)*: Cross-domain edits (`frontend/**` during `be/*` work or `functions/**` during `fe/*` work), breaking `functions/contracts.py` changes, `firestore.rules`, `storage.rules`, `firebase.json`, `.github/workflows/*.yml`, cloud cost/quota changes, `git push`, or `firebase deploy`.
- **Verification**: Run `npm run test:functions` (backend/governance) and/or `cd frontend && npm run build` + `npm run test:unit` (frontend), and log structural/contract updates in `workplan/blueprint.md` Section 8.
