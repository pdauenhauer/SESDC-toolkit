# SESDC-Toolkit — Universal Multi-Agent Entrypoint (`AGENTS.md`)

All AI coding agents operating in this repository (Zed Assistant, Cursor, VS Code extensions, Cline/Roo, Codex, Windsurf, Aider, etc.) MUST read and obey the single authoritative project canon:
1. **[workplan/governance.md](workplan/governance.md)** — Engineering standards, **6-Point Pre-Flight Scope Lock**, **Traffic-Light Autonomy Matrix** (`Green Zone` / `Yellow Zone` / `Red Zone`), single-layer task chunking, and contract rules.
2. **[workplan/blueprint.md](workplan/blueprint.md)** — System architecture, `Preliminary` frontend status & `Dev Accepted` lifecycle, rolling-wave phases, and the **Cross-Agent Handoff & Breaking Spec Log** (Section 8).

---

## 1. Self-Detection & Non-Argon Tool Onboarding (Check First)
These multi-tool shims were initially bootstrapped with Gemini/Argon. **At the start of your session, identify your own model and IDE harness:**
- If you are **not** running as Gemini/Argon (for example, **Claude in VS Code**, GitHub Copilot, Cursor, or another frontier model) and notice missing tool-specific conventions (e.g., context-window chunking guidance, `.vscode/` or `.claude/` workspace hooks, or local test runner flags), **pause under the 🟡 Yellow Zone** and propose concise adapter refinements to `CLAUDE.md`, `AGENTS.md`, or `.github/copilot-instructions.md` with your human developer.
- Never duplicate or contradict `workplan/governance.md`—all shared architectural and governance rules remain centralized there and are verified against drift by `functions/tests/test_governance.py`.

## 2. Mandatory Pre-Flight Checklist (Before Any File Edit)
Before modifying any file, verify all 6 checks from `workplan/governance.md` and emit a **Pre-Flight Scope Banner**:
1. **Branch Check**: Confirm `git branch --show-current` is a domain-scoped branch (`be/<topic>`, `fe/<topic>`, `chore/<topic>`)—**never** edit directly on `main` or `test`.
2. **Handoff Sync**: Read the **Cross-Agent Handoff & Breaking Spec Log** in Section 8 of `workplan/blueprint.md`.
3. **Blast-Radius Lock**: Declare `Allowed Write` paths, `Read-Only Context` paths, and `Forbidden` paths (`frontend/**` is 🔴 Red Zone during `be/*` work; `functions/**` is 🔴 Red Zone during `fe/*` work). Do not refactor files outside your `Allowed Write` scope.
4. **Contract Isolation**: Never invent or alter shared Frontend–Backend fields unilaterally; human sign-off in `functions/contracts.py` comes first.
5. **Single-Layer & Autonomy Check**: Modify only **one layer** (*Contract*, *Backend*, or *Frontend*) per PR and classify actions into **🟢 Green Zone** (autonomous within scope), **🟡 Yellow Zone** (pause & confirm additive contracts, deps, phase transitions, file deletions, or shim updates), or **🔴 Red Zone** (hard stop for cross-domain edits, breaking contracts, `firestore.rules`/`storage.rules`/`firebase.json`/`.github/workflows/*.yml`, cloud costs/quotas, or `git push`/deploys).
6. **Post-Run Gate & Handoff**: Run the domain test suite (`npm run test:functions` for backend/governance; `cd frontend && npm run build` + `npm run test:unit` for frontend) and update the **Cross-Agent Handoff Log** in `workplan/blueprint.md` Section 8 when contracts, auth, or cross-dev assumptions change.
