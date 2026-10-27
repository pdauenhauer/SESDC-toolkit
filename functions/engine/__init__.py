"""Modular simulation engine package for the SESDC toolkit."""

from engine.clock import SimulationEngine
from engine.kpis import SummaryKPIEvaluator, compute_summary_kpis, compute_tier1_summaries
from engine.models.dispatch import CoupledDispatchModel, run_coupled_dispatch_kernel
from engine.protocols import (
    BehavioralAgentProtocol,
    ComponentModelProtocol,
    EvaluativeAgentProtocol,
    SimulationRepositoryProtocol,
)
from engine.state import EpochModifiers, SimulationState

__all__ = [
    "BehavioralAgentProtocol",
    "ComponentModelProtocol",
    "CoupledDispatchModel",
    "EpochModifiers",
    "EvaluativeAgentProtocol",
    "SimulationEngine",
    "SimulationRepositoryProtocol",
    "SimulationState",
    "SummaryKPIEvaluator",
    "compute_summary_kpis",
    "compute_tier1_summaries",
    "run_coupled_dispatch_kernel",
]
