"""Diesel generator component model and dispatch calculations."""

from __future__ import annotations

from typing import Sequence

import numpy as np

from engine.state import SimulationState
from utils import safe_float

diesel_losses = {
    "engine_efficiency": 0.85,
    "generator_efficiency": 0.90,
    "transmission_losses": 0.95,
    "converter": 0.98,
}


def calculate_diesel_energy(
    fuel_consumption: float,
    generator_output: float,
    losses: Sequence[float],
) -> float:
    """Calculate diesel energy in Watts for scalar fuel consumption."""
    return float(fuel_consumption * generator_output * np.prod(losses))


def calculate_hourly_diesel_energy(
    fuel_consumption: Sequence[float],
    generator_output: float,
    losses: Sequence[float],
) -> list[float]:
    """Calculate hourly diesel energy across a sequence of fuel consumption values."""
    loss_factor = float(np.prod(losses))
    return [float(fc * generator_output * loss_factor) for fc in fuel_consumption]


def net_energy_for_graph(
    solar_power: np.ndarray | Sequence[float],
    load_values: np.ndarray | Sequence[float],
    wind_values: np.ndarray | Sequence[float],
    diesel_values: np.ndarray | Sequence[float],
    time_interval: float = 1,
) -> np.ndarray:
    """Calculate hourly net power (solar + wind + diesel - load) with NaN safety."""
    solar_arr = np.nan_to_num(np.asarray(solar_power, dtype=float))
    load_arr = np.nan_to_num(np.asarray(load_values, dtype=float))
    wind_arr = np.nan_to_num(np.asarray(wind_values, dtype=float))
    diesel_arr = np.nan_to_num(np.asarray(diesel_values, dtype=float))
    return solar_arr + wind_arr + diesel_arr - load_arr


class GeneratorModel:
    """Modular Diesel Generator component model."""

    def step(self, state: SimulationState) -> None:
        """Compute hourly diesel dispatch (kW) and net energy on `state`."""
        if state.using_generator and state.generator_inputs:
            gen_capacity = safe_float(state.generator_inputs.get("capacity"))
            loss_vals = list(diesel_losses.values())
            max_output_kw = (gen_capacity * float(np.prod(loss_vals))) / 1000.0
            deficit = state.load_values - state.solar_power - state.wind_power
            state.diesel_power = np.where(
                deficit > 0.0,
                np.minimum(deficit, max_output_kw),
                0.0,
            )
        else:
            state.diesel_power = np.zeros(state.n_rows, dtype=float)

        state.net_energy = net_energy_for_graph(
            state.solar_power,
            state.load_values,
            state.wind_power,
            state.diesel_power,
        )
