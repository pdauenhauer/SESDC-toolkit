"""Modular simulation engine package for the SESDC toolkit."""

from engine.clock import SimulationEngine
from engine.kpis import SummaryKPIEvaluator, compute_summary_kpis, compute_tier1_summaries
from engine.protocols import (
    BehavioralAgentProtocol,
    ComponentModelProtocol,
    EvaluativeAgentProtocol,
    SimulationRepositoryProtocol,
)
from engine.state import SimulationState

__all__ = [
    "BehavioralAgentProtocol",
    "ComponentModelProtocol",
    "EvaluativeAgentProtocol",
    "SimulationEngine",
    "SimulationRepositoryProtocol",
    "SimulationState",
    "SummaryKPIEvaluator",
    "compute_summary_kpis",
    "compute_tier1_summaries",
]
