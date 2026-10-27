"""Solar PV component model and vectorized solar power calculations."""

from __future__ import annotations

from typing import Sequence

import numpy as np
import pandas as pd

from engine.state import SimulationState

# Standard Test Conditions and Ross temperature coefficient
ross_coef = 0.0563
STCIrr = 1000
STCTemp = 25

panel_losses = {
    "loss_type": ["wire_losses", "Module_mismatch", "Module_Aging", "Dust/Dirt", "converter"],
    "loss_value": [0.1, 0.1, 0.08, 0.11, 0.05],
}

panel_char = [680, 17.363, 4.607, 21.427, 4.921]
panel_coef = [0.06, -0.33, -0.45]
coef = panel_coef[2]


def process_csv(file) -> pd.DataFrame:
    """Read and validate weather CSV input."""
    df = pd.read_csv(file, parse_dates=["Datetime"])
    if "Irradiance (W/m2)" not in df.columns or "Temp_C (oC)" not in df.columns:
        raise ValueError("CSV must contain 'Irradiance (W/m2)' and 'Temp_C (oC)' columns")
    return df


def calculate_solar_energy(
    irradiance: float | np.ndarray,
    ambient_temp_C: float | np.ndarray,
    panel_name_plate_W: float,
    losses: Sequence[float] | np.ndarray,
    temp_coef: float = coef,
    stc_irr: float = STCIrr,
    stc_temp: float = STCTemp,
) -> float | np.ndarray:
    """Calculate solar power output (in W if panel_name_plate_W is W).

    Supports both scalar values and vectorized NumPy arrays.
    """
    ambient_temp_C_adj = ambient_temp_C + (ross_coef * irradiance)
    loss_factor = float(np.prod(1.0 - np.asarray(losses, dtype=float)))
    p_out = (
        (irradiance / stc_irr)
        * (panel_name_plate_W + (panel_name_plate_W * (temp_coef / 100.0) * (ambient_temp_C_adj - stc_temp)))
        * loss_factor
    )
    return p_out


def calculate_hourly_solar_energy(
    data: pd.DataFrame,
    panel_name_plate_W: float,
    losses: Sequence[float],
    temp_coef: float = coef,
    stc_irr: float = STCIrr,
    stc_temp: float = STCTemp,
) -> list[float]:
    """Vectorized calculation of hourly solar energy across all rows of `data`."""
    if len(data) == 0:
        return []
    irradiance = data["Irradiance (W/m2)"].to_numpy(dtype=float)
    ambient_temp_C = data["Temp_C (oC)"].to_numpy(dtype=float)
    outputs = calculate_solar_energy(
        irradiance,
        ambient_temp_C,
        panel_name_plate_W,
        losses,
        temp_coef,
        stc_irr,
        stc_temp,
    )
    return np.asarray(outputs, dtype=float).tolist()


class PVModel:
    """Modular Solar PV component model."""

    def step(self, state: SimulationState) -> None:
        """Compute hourly solar power (kW) on `state` if solar is enabled."""
        if not state.using_solar or not state.solar_inputs:
            state.solar_power = np.zeros(state.n_rows, dtype=float)
            return

        irradiance = state.nlr_df["Irradiance (W/m2)"].to_numpy(dtype=float)
        ambient_temp_C = state.nlr_df["Temp_C (oC)"].to_numpy(dtype=float)
        raw_watts = calculate_solar_energy(
            irradiance,
            ambient_temp_C,
            float(state.solar_inputs["solar_array_size"]),
            state.solar_inputs["losses"],
            coef,
            STCIrr,
            STCTemp,
        )
        state.solar_power = np.asarray(raw_watts, dtype=float) / 1000.0
