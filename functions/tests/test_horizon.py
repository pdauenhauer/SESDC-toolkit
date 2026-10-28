"""20-year hourly pass: DegradationModel + MultiYearDispatchModel."""

import io

import numpy as np
import pandas as pd
import pytest

from contracts import EXPECTED_CSV_COLUMNS, validate_csv_bundle_schema
from engine.models.horizon import (
    BATTERY_DEGRADATION_PER_YEAR,
    SOLAR_DEGRADATION_PER_YEAR,
    degradation_factor,
)
from simulation import run_simulation_with_state


def _weather(days=365):
    hours = days * 24
    hour_of_day = np.arange(hours) % 24
    irradiance = np.where((hour_of_day >= 6) & (hour_of_day < 18), 600.0, 0.0)
    return pd.DataFrame({
        "Datetime": pd.date_range("2025-01-01", periods=hours, freq="h").strftime("%m/%d/%Y %H:%M"),
        "Irradiance (W/m2)": irradiance,
        "Temp_C (oC)": np.full(hours, 25.0),
        "Wind_speed(m/s)": np.full(hours, 3.0),
    })


def _run(battery_life=10, solar_life=25):
    solar = {"losses": [0.02] * 5, "solar_array_size": 8000.0, "capex": 1, "opex": 0,
             "lifespan": solar_life, "replacement_cost": 0}
    battery = {"charge_capacity": 3.0, "maximum_storage": 10.0, "battery_type": "lithium-ion",
               "capex": 1, "opex": 0, "lifespan": battery_life, "replacement_cost": 0}
    generator = {"capacity": 3000.0, "capex": 1, "opex": 0, "lifespan": 10, "replacement_cost": 0}
    return run_simulation_with_state(
        _weather(), [2.0] * 24,
        True, solar, False, None, True, generator, True, battery,
        {"inflation": 3.0, "energy_price": 0.2},
    )


@pytest.fixture(scope="module")
def run():
    return _run()


def test_degradation_resets_at_replacement():
    assert degradation_factor(0.015, 0, 10) == 1.0
    assert degradation_factor(0.015, 9, 10) == pytest.approx(0.985 ** 9)
    assert degradation_factor(0.015, 10, 10) == 1.0  # replaced
    assert degradation_factor(0.005, 19, 0) == pytest.approx(0.995 ** 19)  # no lifespan given


def test_twenty_years_with_year_one_unchanged(run):
    csv_bundle, state = run
    assert len(state.horizon_hourly) == 20
    assert [r["year"] for r in state.yearly_summary] == list(range(1, 21))
    # Year 1 is the baseline run, so hourly_simulation is untouched.
    assert state.yearly_summary[0]["diesel_kWh"] == pytest.approx(float(np.sum(state.diesel_power)))
    assert state.horizon_hourly[0]["soc"] is not None
    assert "hourly_year_02" in csv_bundle and "hourly_year_20" in csv_bundle
    assert "hourly_year_01" not in csv_bundle
    validate_csv_bundle_schema(csv_bundle)


def test_later_years_age_the_assets(run):
    _, state = run
    y1, y20 = state.yearly_summary[0], state.yearly_summary[19]
    assert y20["solar_kWh"] == pytest.approx(y1["solar_kWh"] * (1 - SOLAR_DEGRADATION_PER_YEAR) ** 19, rel=1e-6)
    # Battery is replaced after 10 years, so year 11 is back to full capacity.
    assert state.yearly_summary[9]["battery_usable_kWh"] == pytest.approx(10.0 * (1 - BATTERY_DEGRADATION_PER_YEAR) ** 9)
    assert state.yearly_summary[10]["battery_usable_kWh"] == pytest.approx(10.0)
    # Less solar means more diesel to cover the same load.
    assert y20["diesel_kWh"] > y1["diesel_kWh"]
    for row in state.yearly_summary:
        assert row["served_kWh"] + row["unmet_kWh"] == pytest.approx(row["load_kWh"])
        assert row["fuel_liters"] == pytest.approx(row["diesel_kWh"] * 0.30)


def test_battery_stays_within_its_usable_range(run):
    _, state = run
    for y, hourly in enumerate(state.horizon_hourly):
        usable = state.yearly_summary[y]["battery_usable_kWh"]
        assert hourly["soc"].max() <= usable + 1e-9
        assert hourly["soc"].min() >= 0.1 * usable - 1e-9


def test_year_tables_share_the_hourly_columns(run):
    csv_bundle, _ = run
    df = pd.read_csv(io.StringIO(csv_bundle["hourly_year_10"]))
    assert list(df.columns) == EXPECTED_CSV_COLUMNS["hourly_simulation"]
    assert len(df) == 8760
    summary = pd.read_csv(io.StringIO(csv_bundle["yearly_summary"]))
    assert list(summary.columns) == EXPECTED_CSV_COLUMNS["yearly_summary"]
