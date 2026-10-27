"""Battery energy storage system (ESS) component model and dispatch calculations."""

from __future__ import annotations

from typing import Sequence

import numpy as np

from engine.state import SimulationState
from utils import safe_float


class EnergyStorageSystem:
    """Stateful battery energy storage system tracking hourly State of Charge (SoC)."""

    def __init__(self, capacity: float, max_storage: float, battery_type: str):
        self.capacity = capacity
        if battery_type == "lithium-ion":
            self.min_storage = 0.1 * max_storage
        else:
            self.min_storage = 0.5 * max_storage

        self.storage = self.min_storage
        self.charging = False
        self.max_storage = max_storage

    def charge(self, energy: float) -> float:
        if not (self.storage == self.max_storage):
            self.storage = min(
                self.max_storage,
                self.storage + self.capacity,
                self.storage + energy,
            )
        return self.storage

    def discharge(self, demand: float) -> float:
        if not (self.storage == self.min_storage):
            self.storage = max(self.storage + demand, self.min_storage)
        return self.storage


def calculate_net_energy(
    energy_system: EnergyStorageSystem,
    hourly_net: Sequence[float] | np.ndarray,
    time_interval: float = 1,
) -> np.ndarray:
    """Simulate battery SoC across timesteps given `hourly_net` power balance."""
    n = len(hourly_net)
    net_energy = np.zeros(n, dtype=float)
    for i in range(n):
        val = float(hourly_net[i])
        if val < 0:
            net_energy[i] = energy_system.discharge(val)
        else:
            net_energy[i] = energy_system.charge(val)
    return net_energy


def calc_load_not_serviced(
    time_points: Sequence[int] | np.ndarray,
    battery_charge: Sequence[float] | np.ndarray,
    battery_type: str,
    max_storage: float,
    net_energy: Sequence[float] | np.ndarray,
) -> list[float]:
    """Calculate hourly load not serviced (kW) when battery hits minimum SoC."""
    n = len(time_points)
    load_not_serviced = [0] * n
    min_soc = 0.1 * max_storage if battery_type == "lithium-ion" else 0.5 * max_storage

    for i in range(1, n):
        v_a_d = battery_charge[i - 1] + net_energy[i]
        if v_a_d <= min_soc:
            load_not_serviced[i] = min_soc - v_a_d

    return load_not_serviced


class BatteryModel:
    """Modular Battery Storage component model."""

    def step(self, state: SimulationState) -> None:
        """Compute hourly battery SoC and load not serviced on `state`."""
        if state.using_battery and state.battery_inputs:
            charge_cap = safe_float(state.battery_inputs.get("charge_capacity"))
            max_storage = safe_float(state.battery_inputs.get("maximum_storage"))
            btype = str(state.battery_inputs.get("battery_type", "lithium-ion") or "lithium-ion")

            batt = EnergyStorageSystem(
                capacity=charge_cap,
                max_storage=max_storage,
                battery_type=btype,
            )
            state.battery_soc = np.asarray(
                calculate_net_energy(batt, state.net_energy.tolist()),
                dtype=float,
            )
            state.load_not_serviced = np.asarray(
                calc_load_not_serviced(
                    state.time_points,
                    state.battery_soc,
                    btype,
                    max_storage,
                    state.net_energy,
                ),
                dtype=float,
            )
        else:
            state.battery_soc = np.zeros(state.n_rows, dtype=float)
            state.load_not_serviced = np.zeros(state.n_rows, dtype=float)

        state.hourly_load_serviced = state.load_values - state.load_not_serviced
