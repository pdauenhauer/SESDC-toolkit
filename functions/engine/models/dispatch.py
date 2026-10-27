"""Coupled Renewable-First (Load-Following) Dispatch Model & Numba-ready numeric kernel."""

from __future__ import annotations

import numpy as np

from engine.models.generator import diesel_losses, net_energy_for_graph
from engine.state import SimulationState
from utils import safe_float

try:
    from numba import njit as _njit
except ImportError:  # pragma: no cover - fallback when numba is not installed
    def _njit(*args, **kwargs):
        def _decorator(fn):
            return fn
        if len(args) == 1 and callable(args[0]):
            return args[0]
        return _decorator


@_njit(cache=True)
def run_coupled_dispatch_kernel(
    load_kw: np.ndarray,
    solar_kw: np.ndarray,
    wind_kw: np.ndarray,
    using_battery: bool,
    batt_power_cap_kw: float,
    batt_max_kwh: float,
    batt_min_kwh: float,
    initial_soc_kwh: float,
    using_generator: bool,
    max_diesel_kw: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, float]:
    """Pure numeric, single-pass coupled dispatch kernel (Numba `@njit` compatible).

    Dispatches renewable surplus to battery storage first (tracking curtailed excess),
    and covers renewable deficits with battery discharge first (capped by both
    `batt_power_cap_kw` and `batt_min_kwh`) before firing the backup diesel generator.

    Returns:
        `(diesel_kw, battery_soc_kwh, load_not_serviced_kw, curtailed_kw, final_soc_kwh)`
    """
    n = len(load_kw)
    diesel_kw = np.zeros(n, dtype=np.float64)
    battery_soc = np.zeros(n, dtype=np.float64)
    unmet_load = np.zeros(n, dtype=np.float64)
    curtailed = np.zeros(n, dtype=np.float64)

    soc = initial_soc_kwh if using_battery else 0.0

    for t in range(n):
        ren_gen = solar_kw[t] + wind_kw[t]
        req_load = load_kw[t]
        balance = ren_gen - req_load

        if balance >= 0.0:
            # Renewable surplus: charge battery up to power rating and max storage
            if using_battery and batt_max_kwh > 0.0:
                headroom = batt_max_kwh - soc
                charge_kw = balance
                if charge_kw > batt_power_cap_kw:
                    charge_kw = batt_power_cap_kw
                if charge_kw > headroom:
                    charge_kw = headroom
                if charge_kw < 0.0:
                    charge_kw = 0.0
                soc += charge_kw
                curtailed[t] = balance - charge_kw
            else:
                curtailed[t] = balance
            battery_soc[t] = soc
        else:
            # Renewable deficit: discharge battery first, then fire diesel generator
            deficit = -balance
            if using_battery and batt_max_kwh > 0.0:
                available_soc = soc - batt_min_kwh
                discharge_kw = deficit
                if discharge_kw > batt_power_cap_kw:
                    discharge_kw = batt_power_cap_kw
                if discharge_kw > available_soc:
                    discharge_kw = available_soc
                if discharge_kw < 0.0:
                    discharge_kw = 0.0
                soc -= discharge_kw
                deficit -= discharge_kw

            if using_generator and deficit > 0.0 and max_diesel_kw > 0.0:
                gen_out = deficit if deficit <= max_diesel_kw else max_diesel_kw
                diesel_kw[t] = gen_out
                deficit -= gen_out

            unmet_load[t] = deficit
            battery_soc[t] = soc

    return diesel_kw, battery_soc, unmet_load, curtailed, soc


class CoupledDispatchModel:
    """Modular Coupled Battery + Diesel Dispatch model conforming to `ComponentModelProtocol`.

    Executes the single-pass `run_coupled_dispatch_kernel` across the simulation horizon,
    enforcing both battery charge and discharge kW limits and prioritizing stored renewable
    energy before dispatching backup diesel generation.
    """

    def step(self, state: SimulationState) -> None:
        using_battery = bool(state.using_battery and state.battery_inputs)
        batt_power_cap_kw = 0.0
        batt_max_kwh = 0.0
        batt_min_kwh = 0.0
        initial_soc = 0.0

        if using_battery and state.battery_inputs:
            batt_power_cap_kw = safe_float(state.battery_inputs.get("charge_capacity"))
            batt_max_kwh = safe_float(state.battery_inputs.get("maximum_storage"))
            btype = str(state.battery_inputs.get("battery_type", "lithium-ion") or "lithium-ion")
            batt_min_kwh = 0.1 * batt_max_kwh if btype == "lithium-ion" else 0.5 * batt_max_kwh
            initial_soc = batt_min_kwh

        using_generator = bool(state.using_generator and state.generator_inputs)
        max_diesel_kw = 0.0
        if using_generator and state.generator_inputs:
            gen_capacity = safe_float(state.generator_inputs.get("capacity"))
            loss_vals = list(diesel_losses.values())
            max_diesel_kw = (gen_capacity * float(np.prod(loss_vals))) / 1000.0

        diesel_kw, battery_soc, unmet_load, curtailed, _ = run_coupled_dispatch_kernel(
            np.asarray(state.load_values, dtype=np.float64),
            np.asarray(state.solar_power, dtype=np.float64),
            np.asarray(state.wind_power, dtype=np.float64),
            using_battery,
            float(batt_power_cap_kw),
            float(batt_max_kwh),
            float(batt_min_kwh),
            float(initial_soc),
            using_generator,
            float(max_diesel_kw),
        )

        state.diesel_power = diesel_kw
        state.battery_soc = battery_soc
        state.load_not_serviced = unmet_load
        state.curtailed_power = curtailed
        state.hourly_load_serviced = state.load_values - state.load_not_serviced
        state.net_energy = net_energy_for_graph(
            state.solar_power,
            state.load_values,
            state.wind_power,
            state.diesel_power,
        )
