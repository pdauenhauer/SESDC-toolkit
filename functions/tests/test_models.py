"""Unit tests for modular component models (`engine.models`)."""

import numpy as np
import pandas as pd
import pytest

from calculations import (
    EnergyStorageSystem,
    STCIrr,
    STCTemp,
    calc_daily_energy,
    calc_load_not_serviced,
    calculate_20_year_expenses,
    calculate_hourly_solar_energy,
    calculate_hourly_wind_energy,
    calculate_net_energy,
    calculate_power_output,
    calculate_solar_energy,
    coef,
    compute_20_year_revenue,
    net_energy_for_graph,
    normalize_inflation,
    predict20years,
)


class TestSolarModel:
    def test_zero_irradiance_produces_zero_power(self):
        out = calculate_solar_energy(0.0, 25.0, 5000.0, [0.1, 0.1], coef, STCIrr, STCTemp)
        assert out == 0.0

    def test_vectorized_hourly_solar_matches_scalar(self):
        df = pd.DataFrame({
            "Irradiance (W/m2)": [0.0, 250.0, 500.0, 800.0, 1000.0],
            "Temp_C (oC)": [20.0, 22.0, 25.0, 30.0, 35.0],
        })
        losses = [0.10, 0.05, 0.08]
        panel_w = 4000.0

        vec_out = calculate_hourly_solar_energy(df, panel_w, losses, coef, STCIrr, STCTemp)
        scalar_out = [
            calculate_solar_energy(
                row["Irradiance (W/m2)"],
                row["Temp_C (oC)"],
                panel_w,
                losses,
                coef,
                STCIrr,
                STCTemp,
            )
            for _, row in df.iterrows()
        ]
        np.testing.assert_allclose(vec_out, scalar_out, rtol=1e-12)


class TestWindModel:
    def test_wind_power_curve_regions(self):
        # Below cut-in -> 0
        assert calculate_power_output(2.0, 2500.0, 3.0, 12.0, 25.0) == 0
        # Above cut-out -> 0
        assert calculate_power_output(26.0, 2500.0, 3.0, 12.0, 25.0) == 0
        # At or above rated speed -> rated power
        assert calculate_power_output(12.0, 2500.0, 3.0, 12.0, 25.0) == 2500.0
        assert calculate_power_output(20.0, 2500.0, 3.0, 12.0, 25.0) == 2500.0
        # Midpoint between cut-in (3) and rated (12) is 7.5 -> (0.5)^3 = 0.125 * rated_power
        assert calculate_power_output(7.5, 2500.0, 3.0, 12.0, 25.0) == pytest.approx(312.5)

    def test_vectorized_hourly_wind_matches_scalar(self):
        df = pd.DataFrame({
            "Wind_speed(m/s)": [0.0, 2.9, 3.0, 7.5, 12.0, 18.0, 25.0, 25.1],
        })
        vec_out = calculate_hourly_wind_energy(df, 3, 2500.0, 3.0, 12.0, 25.0)
        scalar_out = [
            calculate_power_output(ws, 2500.0, 3.0, 12.0, 25.0) * 3
            for ws in df["Wind_speed(m/s)"]
        ]
        np.testing.assert_allclose(vec_out, scalar_out, rtol=1e-12)


class TestBatteryAndDispatchModel:
    def test_lithium_ion_vs_lead_acid_min_soc(self):
        li = EnergyStorageSystem(capacity=50.0, max_storage=200.0, battery_type="lithium-ion")
        la = EnergyStorageSystem(capacity=50.0, max_storage=200.0, battery_type="lead-acid")
        assert li.min_storage == pytest.approx(20.0)
        assert la.min_storage == pytest.approx(100.0)

    def test_charge_and_discharge_clamping(self):
        batt = EnergyStorageSystem(capacity=30.0, max_storage=100.0, battery_type="lithium-ion")
        # Starts at min_storage = 10.0; charge by 50 kW is capped by charge capacity (30 kW) -> 40.0
        assert batt.charge(50.0) == pytest.approx(40.0)
        # Discharge by -50 kW clamps at min_storage (10.0)
        assert batt.discharge(-50.0) == pytest.approx(10.0)

    def test_calculate_net_energy_and_unmet_load(self):
        batt = EnergyStorageSystem(capacity=50.0, max_storage=100.0, battery_type="lithium-ion")
        # SoC starts at 10: t0 (+20) -> 30, t1 (-15) -> 15, t2 (-30) -> clamps at 10 (5 discharged, 25 unmet)
        hourly_net = [20.0, -15.0, -30.0]
        soc = calculate_net_energy(batt, hourly_net)
        np.testing.assert_allclose(soc, [30.0, 15.0, 10.0])

        lns = calc_load_not_serviced([0, 1, 2], soc, "lithium-ion", 100.0, hourly_net)
        np.testing.assert_allclose(lns, [0.0, 0.0, 25.0])

    def test_net_energy_for_graph_handles_nans(self):
        net = net_energy_for_graph(
            np.array([10.0, np.nan]),
            np.array([5.0, 4.0]),
            np.array([2.0, 1.0]),
            np.array([0.0, 3.0]),
        )
        np.testing.assert_allclose(net, [7.0, 0.0])


class TestFinancialModel:
    def test_calc_daily_energy_requires_multiple_of_24(self):
        with pytest.raises(ValueError, match="multiple of 24"):
            calc_daily_energy(0, [1.0] * 25)

    def test_calc_daily_energy_averages_24h_blocks(self):
        hourly = [2.0] * 24 + [4.0] * 24
        daily = calc_daily_energy(0, hourly)
        assert daily == [pytest.approx(2.0), pytest.approx(4.0)]

    def test_calculate_20_year_expenses_with_replacement(self):
        exp = calculate_20_year_expenses(
            inflation_rate=0.03,
            capex=1000.0,
            opex=50.0,
            replacement_cost=500.0,
            lifespan=10,
            years=20,
        )
        assert len(exp) == 20
        # Year 0: CapEx + OpEx = 1050
        assert exp[0] == pytest.approx(1050.0)
        # Year 5: OpEx only = 50
        assert exp[5] == pytest.approx(50.0)
        # Year 10: OpEx + inflated replacement = 50 + 500 * (1.03^10)
        assert exp[10] == pytest.approx(50.0 + 500.0 * (1.03 ** 10))

    def test_compute_20_year_revenue_and_inflation_normalization(self):
        assert normalize_inflation(3.0) == pytest.approx(0.03)
        assert normalize_inflation(0.03) == pytest.approx(0.03)

        # 1 kW average over 1 day = 24 kWh; at $0.10/kWh -> $2.40 in year 0
        rev = compute_20_year_revenue([1.0], price_per_kwh=0.10, inflation=3.0, years=3)
        assert len(rev) == 3
        assert rev[0] == pytest.approx(2.40)
        assert rev[1] == pytest.approx(2.40 * 1.03)
        assert rev[2] == pytest.approx(2.40 * (1.03 ** 2))

    def test_predict20years_repeats_365_days(self):
        one_year = list(range(365))
        twenty_yr = predict20years(one_year)
        assert len(twenty_yr) == 365 * 20
        assert twenty_yr[:365] == one_year
        assert twenty_yr[365:730] == one_year
