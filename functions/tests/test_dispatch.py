"""Tests for the hourly dispatch and the 20-year simulation loop."""

import io
import os
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from calculations import (  # noqa: E402
    asset_age,
    degradation_factor,
    dispatch_year,
    generator_max_output_kw,
)

BATTERY = {"max_kwh": 10.0, "min_frac": 0.1, "rate_kw": 4.0}


def _balance(load, solar, wind, d):
    """Energy each hour: renewables used + battery out + diesel + unmet == load."""
    renew_used = np.minimum(load, solar + wind)
    return renew_used + d["battery_discharge"] + d["diesel"] + d["unmet"]


def test_unmet_without_battery_is_the_shortfall():
    load = np.array([5.0, 5.0, 5.0])
    solar = np.array([0.0, 3.0, 6.0])
    d = dispatch_year(load, solar, np.zeros(3), gen_max_kw=1.0, battery=None)
    np.testing.assert_allclose(d["diesel"], [1.0, 1.0, 0.0])
    np.testing.assert_allclose(d["unmet"], [4.0, 1.0, 0.0])
    np.testing.assert_allclose(d["excess"], [0.0, 0.0, 1.0])


def test_battery_discharges_before_generator():
    load = np.array([0.0, 3.0])
    solar = np.array([8.0, 0.0])  # hour 0 charges 4 kWh (rate-limited)
    d = dispatch_year(load, solar, np.zeros(2), gen_max_kw=10.0, battery=BATTERY)
    assert d["battery_charge"][0] == pytest.approx(4.0)
    assert d["battery_discharge"][1] == pytest.approx(3.0)
    assert d["diesel"][1] == pytest.approx(0.0)


def test_discharge_is_rate_limited_and_respects_min_soc():
    load = np.full(6, 9.0)
    d = dispatch_year(load, np.zeros(6), np.zeros(6), gen_max_kw=0.0, battery=BATTERY, soc_start=10.0)
    assert d["battery_discharge"].max() <= BATTERY["rate_kw"] + 1e-9
    assert d["battery_soc"].min() >= BATTERY["max_kwh"] * BATTERY["min_frac"] - 1e-9
    # 10 kWh start, 1 kWh floor: 9 kWh available in total.
    assert d["battery_discharge"].sum() == pytest.approx(9.0)


def test_every_hour_balances():
    rng = np.random.default_rng(1)
    load = rng.uniform(0, 8, 500)
    solar = rng.uniform(0, 10, 500)
    wind = rng.uniform(0, 2, 500)
    d = dispatch_year(load, solar, wind, gen_max_kw=3.0, battery=BATTERY)
    np.testing.assert_allclose(_balance(load, solar, wind, d), load, atol=1e-9)
    assert (d["unmet"] >= -1e-12).all() and (d["diesel"] <= 3.0 + 1e-9).all()


def test_degradation_resets_on_replacement():
    assert asset_age(9, 10) == 9 and asset_age(10, 10) == 0
    assert degradation_factor(0.015, 10, 10) == pytest.approx(1.0)
    assert degradation_factor(0.015, 9, 10) < degradation_factor(0.015, 1, 10)
    # No lifespan: never replaced.
    assert asset_age(15, 0) == 15


def test_generator_derate_matches_losses():
    assert generator_max_output_kw(1000) == pytest.approx(0.85 * 0.90 * 0.95 * 0.98)


def _synthetic_inputs():
    n = 8760
    dt = pd.date_range("2021-01-01", periods=n, freq="h")
    hour = dt.hour.values
    df = pd.DataFrame({
        "Datetime": dt.strftime("%m/%d/%Y %H:%M"),
        "Irradiance (W/m2)": np.clip(np.sin((hour - 6) / 12 * np.pi), 0, 1) * 800,
        "Temp_C (oC)": np.full(n, 25.0),
        "Wind_speed(m/s)": np.full(n, 6.0),
    })
    load = [2, 2, 2, 2, 2, 3, 4, 5, 4, 3, 3, 3, 3, 3, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2]
    return df, load


def test_twenty_year_run_outputs():
    from simulation import run_simulation

    df, load = _synthetic_inputs()
    out = run_simulation(
        df, load,
        using_solar=True, solar_inputs={"solar_array_size": 12000, "losses": [0.02, 0.05, 0.005, 0.03, 0.04],
                                        "capex": 12000, "opex": 100, "lifespan": 25, "replacement_cost": 0},
        using_wind=False, wind_inputs=None,
        using_generator=True, generator_inputs={"capacity": 2000, "capex": 1000, "opex": 50, "lifespan": 10,
                                                "replacement_cost": 800, "fuel_price": 1.5},
        using_battery=True, battery_inputs={"charge_capacity": 4, "maximum_storage": 20, "battery_type": "lithium-ion",
                                            "capex": 6000, "opex": 50, "lifespan": 10, "replacement_cost": 5000},
        financial_inputs={"inflation": 3.0, "energy_price": 0.3},
    )
    summary = pd.read_csv(io.StringIO(out["yearly_summary"]))
    assert len(summary) == 20
    assert summary["solar_kWh"].iloc[-1] < summary["solar_kWh"].iloc[0]
    # The battery is replaced after 10 years, so year 11 has full capacity again.
    assert summary["battery_usable_kWh"].iloc[10] == pytest.approx(20.0)
    assert summary["battery_usable_kWh"].iloc[9] < 20.0
    for key in ["hourly_simulation", "hourly_year_02", "hourly_year_20"]:
        assert out[key], key
    hourly = pd.read_csv(io.StringIO(out["hourly_simulation"]))
    assert {"battery_discharge_kW", "excess_kW"} <= set(hourly.columns)
    served = hourly["load_serviced_kW"].sum()
    assert served == pytest.approx(summary["served_kWh"].iloc[0], rel=1e-3)
    # Revenue now follows each year's served energy.
    revenue = pd.read_csv(io.StringIO(out["revenue"]))
    assert revenue["annual_revenue"].iloc[0] == pytest.approx(summary["served_kWh"].iloc[0] * 0.3, rel=1e-6)
