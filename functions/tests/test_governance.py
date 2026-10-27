"""Automated Governance-as-Code test suite enforcing `workplan/governance.md` invariants."""

from __future__ import annotations

import ast
import inspect
from pathlib import Path

import engine.models as models_pkg
from engine.protocols import ComponentModelProtocol

FUNCTIONS_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = FUNCTIONS_DIR.parent
ENGINE_DIR = FUNCTIONS_DIR / "engine"
WORKPLAN_DIR = REPO_ROOT / "workplan"

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


class TestGovernanceCompliance:
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
                    # Detect `np.random.<func>(...)` where <func> is not `default_rng` or `SeedSequence`
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
