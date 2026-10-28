"""Structural typing protocols (`typing.Protocol`) for models, agents, and repositories."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:
    from engine.state import SimulationState


@runtime_checkable
class ComponentModelProtocol(Protocol):
    """Protocol for physical and financial simulation component models."""

    def step(self, state: "SimulationState") -> None:
        """Mutate `state` in-place for the current simulation horizon or epoch."""
        ...


@runtime_checkable
class BehavioralAgentProtocol(Protocol):
    """Protocol for dynamic behavioral actors (e.g., Operator_Agent, Customer_Agent)."""

    def perceive(self, state: "SimulationState") -> dict[str, Any]:
        """Extract an agent-specific (potentially noisy or delayed) view from `state`."""
        ...

    def decide(self, perception: dict[str, Any]) -> dict[str, Any]:
        """Return policy parameter updates for the next simulation epoch."""
        ...


@runtime_checkable
class EvaluativeAgentProtocol(Protocol):
    """Protocol for read-only evaluative observers synthesizing KPIs or health scores."""

    def evaluate(self, state: "SimulationState") -> dict[str, Any]:
        """Read `state` without mutating physical arrays and return synthesized metrics."""
        ...


@runtime_checkable
class SimulationRepositoryProtocol(Protocol):
    """Protocol abstracting simulation persistence across InMemory/Emulator and GCP backends."""

    def save_run(
        self,
        user_id: str,
        project_id: str,
        run_id: int,
        csv_bundle: dict[str, str | None],
        summary_kpis: dict[str, Any] | None = None,
        tier1_summaries: dict[str, Any] | None = None,
    ) -> str | None:
        """Persist simulation artifacts and metadata; return primary storage path."""
        ...

    def get_stored_csv_bundle(
        self, user_id: str, project_id: str, keys: list[str] | None = None
    ) -> dict[str, str]:
        """Fetch stored CSVs for `(user_id, project_id)`: just `keys` when given,
        otherwise every table except the on-demand per-year hourly tables."""
        ...
