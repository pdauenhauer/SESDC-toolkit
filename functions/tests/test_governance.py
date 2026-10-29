"""Automated Governance-as-Code and Bidirectional Drift test suite.

Enforces two-way alignment between the codebase and `workplan/governance.md` + `workplan/blueprint.md`:
1. Code -> Docs compliance (lazy imports, deterministic PRNG, structural Protocol typing, workplan & gitignore hygiene).
2. Docs <-> Code reflexive sync (workflows, runtime versions, secrets, protocols, models, autonomy zones, Pre-Flight Scope Lock, Cross-Agent Handoff Log, and multi-tool agent shims).
"""

from __future__ import annotations

import ast
import inspect
import json
import re
from pathlib import Path

import engine.models as models_pkg
import engine.protocols as protocols_mod
from engine.protocols import ComponentModelProtocol

FUNCTIONS_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = FUNCTIONS_DIR.parent
ENGINE_DIR = FUNCTIONS_DIR / "engine"
WORKPLAN_DIR = REPO_ROOT / "workplan"
WORKFLOWS_DIR = REPO_ROOT / ".github" / "workflows"
FIREBASE_JSON = REPO_ROOT / "firebase.json"

AGENT_SHIM_FILES = (
    REPO_ROOT / "GEMINI.md",
    REPO_ROOT / "AGENTS.md",
    REPO_ROOT / "CLAUDE.md",
    REPO_ROOT / ".rules",
    REPO_ROOT / ".github" / "copilot-instructions.md",
)

FORBIDDEN_OBSOLETE_SHIM_TERMS = (
    "qwen2.5-coder",
    "SESDC-toolkit/",
)

FORBIDDEN_TOP_LEVEL_HEAVY_IMPORTS = {
    "numpy",
    "pandas",
    "numba",
    "pyarrow",
    "google.cloud",
}

FORBIDDEN_GLOBAL_NP_RANDOM_CALLS = {
    "seed",
    "rand",
    "randn",
    "normal",
    "uniform",
    "randint",
    "choice",
    "random",
}


def _get_top_level_imports(py_file: Path) -> set[str]:
    """Return top-level imported module names (excluding imports inside functions/classes/TYPE_CHECKING)."""
    tree = ast.parse(py_file.read_text(encoding="utf-8"), filename=str(py_file))
    imported: set[str] = set()
    for node in tree.body:
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported.add(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module)
    return imported


class TestCodeObeysGovernance:
    def test_cold_start_no_heavy_top_level_imports_in_entrypoints(self):
        """Enforce `governance.md` Cold-Start Optimization: no heavy imports at top-level of main.py or handlers.py."""
        for filename in ("main.py", "handlers.py"):
            py_file = FUNCTIONS_DIR / filename
            top_imports = _get_top_level_imports(py_file)
            for mod in top_imports:
                for forbidden in FORBIDDEN_TOP_LEVEL_HEAVY_IMPORTS:
                    assert not (
                        mod == forbidden or mod.startswith(f"{forbidden}.")
                    ), f"{filename} has forbidden top-level heavy import '{mod}' (must be lazy-loaded)"

    def test_deterministic_prng_no_global_random_in_engine(self):
        """Enforce `governance.md` Deterministic Reproducibility: engine modules must use `state.rng`."""
        for py_file in ENGINE_DIR.rglob("*.py"):
            tree = ast.parse(py_file.read_text(encoding="utf-8"), filename=str(py_file))
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        assert alias.name != "random", (
                            f"{py_file.name} imports stdlib 'random'; use `state.rng` (np.random.default_rng) instead"
                        )
                elif isinstance(node, ast.ImportFrom) and node.module == "random":
                    raise AssertionError(
                        f"{py_file.name} imports from stdlib 'random'; use `state.rng` instead"
                    )
                elif isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
                    val = node.func.value
                    if (
                        isinstance(val, ast.Attribute)
                        and val.attr == "random"
                        and isinstance(val.value, ast.Name)
                        and val.value.id in ("np", "numpy")
                    ):
                        assert node.func.attr not in FORBIDDEN_GLOBAL_NP_RANDOM_CALLS, (
                            f"{py_file.name} calls global `np.random.{node.func.attr}()`; use `state.rng` instead"
                        )

    def test_all_engine_component_models_implement_protocol(self):
        """Enforce `governance.md` Structural Typing: all `*Model` classes in `engine.models` must satisfy `ComponentModelProtocol`."""
        model_classes = [
            obj
            for name, obj in inspect.getmembers(models_pkg, inspect.isclass)
            if name.endswith("Model")
        ]
        assert len(model_classes) >= 5
        for cls in model_classes:
            instance = cls()
            assert isinstance(instance, ComponentModelProtocol), (
                f"{cls.__name__} does not conform to ComponentModelProtocol"
            )

    def test_workplan_contains_only_authoritative_documents(self):
        """Enforce consolidated documentation hygiene in `workplan/`."""
        md_files = {p.name for p in WORKPLAN_DIR.glob("*.md")}
        assert md_files == {"blueprint.md", "governance.md"}, (
            f"workplan/ should contain only blueprint.md and governance.md, found: {sorted(md_files)}"
        )

    def test_gitignore_protects_venvs_os_clutter_and_local_ai_state(self):
        """Enforce `.gitignore` hygiene so AI agents never stage virtualenvs, OS clutter, or local AI session state."""
        gitignore_text = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
        for required_pattern in ("venv/", "functions/venv/", ".DS_Store", "desktop.ini", ".claude/"):
            assert required_pattern in gitignore_text, (
                f".gitignore is missing required safety pattern '{required_pattern}'"
            )


class TestReflexiveGovernanceSync:
    """Bidirectional drift checks: fail if code/workflows/configs/shims evolve without updating governance.md & blueprint.md."""

    def test_all_github_workflows_documented_in_governance(self):
        """Every `.yml`/`.yaml` file in `.github/workflows/` must be documented in `workplan/governance.md`."""
        governance_text = (WORKPLAN_DIR / "governance.md").read_text(encoding="utf-8")
        workflow_files = [
            p.name
            for p in list(WORKFLOWS_DIR.glob("*.yml")) + list(WORKFLOWS_DIR.glob("*.yaml"))
        ]
        assert len(workflow_files) > 0
        for wf_name in workflow_files:
            assert wf_name in governance_text, (
                f"Workflow '{wf_name}' exists in .github/workflows/ but is not documented in workplan/governance.md. "
                "Please reflexively update workplan/governance.md."
            )

    def test_firebase_json_python_runtime_matches_governance(self):
        """The Python runtime in `firebase.json` must match the runtime documented in `workplan/governance.md`."""
        firebase_cfg = json.loads(FIREBASE_JSON.read_text(encoding="utf-8"))
        governance_text = (WORKPLAN_DIR / "governance.md").read_text(encoding="utf-8")
        functions_cfg = firebase_cfg.get("functions", [])
        if isinstance(functions_cfg, list) and functions_cfg:
            runtime = functions_cfg[0].get("runtime", "")
            match = re.match(r"^python(\d)(\d+)$", runtime)
            if match:
                formatted_version = f"{match.group(1)}.{match.group(2)}"
                assert formatted_version in governance_text, (
                    f"firebase.json specifies runtime '{runtime}' ({formatted_version}), "
                    "but workplan/governance.md was not updated to reflect this version."
                )

    def test_all_protocols_and_models_documented_in_governance_and_blueprint(self):
        """Every `*Protocol` in `engine/protocols.py` and `*Model` in `engine/models/` must be documented in `governance.md` and `blueprint.md`."""
        governance_text = (WORKPLAN_DIR / "governance.md").read_text(encoding="utf-8")
        blueprint_text = (WORKPLAN_DIR / "blueprint.md").read_text(encoding="utf-8")

        protocol_names = [
            name
            for name, obj in inspect.getmembers(protocols_mod, inspect.isclass)
            if name.endswith("Protocol") and name != "Protocol"
        ]
        assert len(protocol_names) >= 4
        for proto_name in protocol_names:
            assert proto_name in governance_text, (
                f"Protocol '{proto_name}' is defined in engine/protocols.py but missing from workplan/governance.md."
            )
            assert proto_name in blueprint_text, (
                f"Protocol '{proto_name}' is defined in engine/protocols.py but missing from workplan/blueprint.md."
            )

        model_names = [
            name
            for name, obj in inspect.getmembers(models_pkg, inspect.isclass)
            if name.endswith("Model")
        ]
        for model_name in model_names:
            assert model_name in governance_text, (
                f"Component model '{model_name}' is defined in engine/models/ but missing from workplan/governance.md."
            )
            assert proto_name in blueprint_text and model_name in blueprint_text, (
                f"Component model '{model_name}' is defined in engine/models/ but missing from workplan/blueprint.md."
            )

    def test_all_handler_secrets_documented_in_governance(self):
        """Every `SecretParam('...')` declared in `functions/handlers.py` must be documented in `workplan/governance.md`."""
        handlers_text = (FUNCTIONS_DIR / "handlers.py").read_text(encoding="utf-8")
        governance_text = (WORKPLAN_DIR / "governance.md").read_text(encoding="utf-8")
        secrets = re.findall(r'SecretParam\(\s*["\']([^"\']+)["\']\s*\)', handlers_text)
        for secret_name in secrets:
            assert secret_name in governance_text, (
                f"SecretParam '{secret_name}' is used in functions/handlers.py but is not documented in workplan/governance.md."
            )

    def test_agent_autonomy_zones_and_dev_acceptance_documented(self):
        """Enforce that the Green/Yellow/Red autonomy zones, Preliminary frontend status, and Dev Accepted lifecycle stay synced across GEMINI.md, governance.md, and blueprint.md."""
        gemini_text = (REPO_ROOT / "GEMINI.md").read_text(encoding="utf-8")
        governance_text = (WORKPLAN_DIR / "governance.md").read_text(encoding="utf-8")
        blueprint_text = (WORKPLAN_DIR / "blueprint.md").read_text(encoding="utf-8")

        for zone in ("Green Zone", "Yellow Zone", "Red Zone"):
            assert zone in gemini_text, f"Missing '{zone}' in GEMINI.md"
            assert zone in governance_text, f"Missing '{zone}' in workplan/governance.md"

        for required_term in ("Dev Accepted", "Preliminary"):
            assert required_term in gemini_text, f"Missing '{required_term}' in GEMINI.md"
            assert required_term in governance_text, f"Missing '{required_term}' in workplan/governance.md"
            assert required_term in blueprint_text, f"Missing '{required_term}' in workplan/blueprint.md"

    def test_pre_flight_and_cross_agent_handoff_log_enforced(self):
        """Enforce that the Pre-Flight Scope Lock, Cross-Agent Handoff Log, and PR template stay active."""
        governance_text = (WORKPLAN_DIR / "governance.md").read_text(encoding="utf-8")
        blueprint_text = (WORKPLAN_DIR / "blueprint.md").read_text(encoding="utf-8")
        pr_template = REPO_ROOT / ".github" / "pull_request_template.md"

        assert pr_template.exists(), "Missing .github/pull_request_template.md"
        for required_phrase in ("Pre-Flight", "Cross-Agent Handoff & Breaking Spec Log"):
            assert required_phrase in governance_text, (
                f"Missing '{required_phrase}' in workplan/governance.md"
            )
            assert required_phrase in blueprint_text, (
                f"Missing '{required_phrase}' in workplan/blueprint.md"
            )

    def test_multi_tool_agent_shims_synced_and_free_of_obsolete_rules(self):
        """Enforce that all multi-tool shims (GEMINI.md, AGENTS.md, CLAUDE.md, .rules, copilot-instructions.md) exist, point to governance.md & blueprint.md, include Traffic-Light guardrails + Pre-Flight checks, and contain no obsolete qwen2.5 rules."""
        for shim_path in AGENT_SHIM_FILES:
            assert shim_path.exists(), f"Missing multi-tool agent shim: {shim_path.relative_to(REPO_ROOT)}"
            text = shim_path.read_text(encoding="utf-8")

            for obsolete in FORBIDDEN_OBSOLETE_SHIM_TERMS:
                assert obsolete not in text, (
                    f"Agent shim '{shim_path.name}' contains obsolete rule reference '{obsolete}'"
                )

            for required_ref in (
                "governance.md",
                "blueprint.md",
                "Pre-Flight",
                "Green Zone",
                "Yellow Zone",
                "Red Zone",
            ):
                assert required_ref in text, (
                    f"Agent shim '{shim_path.relative_to(REPO_ROOT)}' is missing required governance reference '{required_ref}'"
                )
