"""Run energy-system simulation via the modular `SimulationEngine` (lazy heavy imports)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from engine.state import SimulationState


def run_simulation_with_state(
    nlr_df,
    load_list,
    using_solar,
    solar_inputs,
    using_wind,
    wind_inputs,
    using_generator,
    generator_inputs,
    using_battery,
    battery_inputs,
    financial_inputs,
    seed: int = 42,
) -> tuple[dict[str, str | None], "SimulationState"]:
    """Run the modular simulation engine and return both `(csv_bundle, state)`."""
    from engine.clock import SimulationEngine
    from engine.state import SimulationState

    state = SimulationState.initialize(
        nlr_df=nlr_df,
        load_list=load_list,
        using_solar=using_solar,
        solar_inputs=solar_inputs,
        using_wind=using_wind,
        wind_inputs=wind_inputs,
        using_generator=using_generator,
        generator_inputs=generator_inputs,
        using_battery=using_battery,
        battery_inputs=battery_inputs,
        financial_inputs=financial_inputs,
        seed=seed,
    )
    engine = SimulationEngine()
    engine.run(state)
    csv_bundle = engine.to_csv_bundle(state)
    return csv_bundle, state


def run_simulation(
    nlr_df,
    load_list,
    using_solar,
    solar_inputs,
    using_wind,
    wind_inputs,
    using_generator,
    generator_inputs,
    using_battery,
    battery_inputs,
    financial_inputs,
    seed: int = 42,
) -> dict[str, str | None]:
    """Run the full energy-system simulation and return a dict of CSV strings.

    Keys in the returned dict (any may be None when not applicable):
        input_data            - raw NLR + load data
        hourly_simulation     - per-timestep simulation results
        daily_averages        - daily-averaged values
        twenty_year_daily     - 20-year daily load-serviced projection
        financial_expenses    - 20-year CAPEX/OPEX breakdown
        revenue               - 20-year revenue projection
        solar_heatmap         - 365x24 hourly solar matrix
        monthly_heatmap       - 12x31 avg-daily solar matrix
    """
    csv_bundle, _ = run_simulation_with_state(
        nlr_df,
        load_list,
        using_solar,
        solar_inputs,
        using_wind,
        wind_inputs,
        using_generator,
        generator_inputs,
        using_battery,
        battery_inputs,
        financial_inputs,
        seed=seed,
    )
    return csv_bundle
