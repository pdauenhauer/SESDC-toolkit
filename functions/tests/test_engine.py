"""End-to-end unit tests for `SimulationEngine`, `SimulationState`, Protocols, Repository, and KPIs."""

import numpy as np
import pandas as pd
import pytest

from contracts import SimulationResponseContract, validate_csv_bundle_schema
from engine import (
    ComponentModelProtocol,
    CoupledDispatchModel,
    EvaluativeAgentProtocol,
    SimulationEngine,
    SimulationRepositoryProtocol,
    SimulationState,
    SummaryKPIEvaluator,
)
from engine.models import BatteryModel, FinancialModel, GeneratorModel, PVModel, WindModel
from repository import GcpSimulationRepository, InMemorySimulationRepository
from simulation import run_simulation, run_simulation_with_state


def _make_weather_df(hours: int = 48) -> pd.DataFrame:
    rng = np.arange(hours)
    hour_of_day = rng % 24
    # Daytime irradiance between 06:00 and 18:00
    irradiance = np.where((hour_of_day >= 6) & (hour_of_day <= 18), 600.0, 0.0)
    temp_c = 25.0 + 5.0 * np.sin(2.0 * np.pi * hour_of_day / 24.0)
    wind_speed = np.full(hours, 8.0)
    return pd.DataFrame({
        "Datetime": pd.date_range("2025-01-01", periods=hours, freq="h").astype(str),
        "Irradiance (W/m2)": irradiance,
        "Temp_C (oC)": temp_c,
        "Wind_speed(m/s)": wind_speed,
    })


class TestProtocolsAndDeterminism:
    def test_component_models_satisfy_protocol(self):
        assert isinstance(PVModel(), ComponentModelProtocol)
        assert isinstance(WindModel(), ComponentModelProtocol)
        assert isinstance(CoupledDispatchModel(), ComponentModelProtocol)
        assert isinstance(GeneratorModel(), ComponentModelProtocol)
        assert isinstance(BatteryModel(), ComponentModelProtocol)
        assert isinstance(FinancialModel(), ComponentModelProtocol)

    def test_evaluator_and_repositories_satisfy_protocols(self):
        assert isinstance(SummaryKPIEvaluator(), EvaluativeAgentProtocol)
        assert isinstance(InMemorySimulationRepository(), SimulationRepositoryProtocol)
        assert isinstance(GcpSimulationRepository(), SimulationRepositoryProtocol)

    def test_deterministic_seeded_rng_on_state(self):
        df = _make_weather_df(24)
        s1 = SimulationState.initialize(df, [1.0] * 24, seed=12345)
        s2 = SimulationState.initialize(df, [1.0] * 24, seed=12345)
        s3 = SimulationState.initialize(df, [1.0] * 24, seed=99999)

        draws_1 = s1.rng.normal(0.0, 1.0, size=10)
        draws_2 = s2.rng.normal(0.0, 1.0, size=10)
        draws_3 = s3.rng.normal(0.0, 1.0, size=10)

        np.testing.assert_allclose(draws_1, draws_2)
        assert not np.allclose(draws_1, draws_3)


class TestSimulationEngineAndRepository:
    def test_full_year_simulation_produces_all_heatmaps_tier1_and_valid_kpis(self):
        nlr_df = _make_weather_df(hours=8760)
        loads = [5.0] * 24

        solar_inputs = {
            "losses": [0.05, 0.05, 0.05, 0.05, 0.05],
            "solar_array_size": 10000.0,
            "capex": 8000.0,
            "opex": 200.0,
            "lifespan": 10,
            "replacement_cost": 4000.0,
        }
        wind_inputs = {
            "nameplate_capacity": 1.0,
            "rated_power": 2000.0,
            "cut_in_speed": 3.0,
            "rated_speed": 12.0,
            "cut_out_speed": 25.0,
            "capex": 5000.0,
            "opex": 150.0,
            "lifespan": 10,
            "replacement_cost": 2500.0,
        }
        generator_inputs = {
            "capacity": 5000.0,
            "capex": 3000.0,
            "opex": 100.0,
            "lifespan": 10,
            "replacement_cost": 1500.0,
        }
        battery_inputs = {
            "charge_capacity": 25.0,
            "maximum_storage": 100.0,
            "battery_type": "lithium-ion",
            "capex": 2000.0,
            "opex": 50.0,
            "lifespan": 10,
            "replacement_cost": 1000.0,
        }
        financial_inputs = {
            "inflation": 3.0,
            "energy_price": 0.20,
        }

        csv_bundle, state = run_simulation_with_state(
            nlr_df,
            loads,
            True, solar_inputs,
            True, wind_inputs,
            True, generator_inputs,
            True, battery_inputs,
            financial_inputs,
            seed=77,
        )

        validate_csv_bundle_schema(csv_bundle)
        assert csv_bundle["solar_heatmap"] is not None
        assert csv_bundle["monthly_heatmap"] is not None
        assert csv_bundle["twenty_year_daily"] is not None
        assert csv_bundle["revenue"] is not None

        kpis = state.summary_kpis
        assert kpis is not None
        assert kpis.total_load_kwh == pytest.approx(5.0 * 8760)
        assert kpis.total_solar_kwh > 0.0
        assert kpis.total_wind_kwh > 0.0
        assert 0.0 <= kpis.unmet_load_fraction <= 1.0
        assert 0.0 <= kpis.renewable_fraction <= 1.0
        assert kpis.total_initial_capex == pytest.approx(18000.0)
        assert kpis.year_20_cumulative_expenses > kpis.total_initial_capex
        assert kpis.year_20_cumulative_revenue > 0.0

        # Verify Tier-1 compact JSON summaries
        tier1 = state.tier1_summaries
        assert tier1 is not None
        assert len(tier1.financial_expenses_20yr["year"]) == 20
        assert len(tier1.financial_expenses_20yr["cumulative_expenses"]) == 20
        assert tier1.revenue_20yr is not None
        assert len(tier1.revenue_20yr["annual_revenue"]) == 20
        assert tier1.monthly_solar_averages is not None
        assert len(tier1.monthly_solar_averages) == 12

        # Verify InMemorySimulationRepository roundtrip
        repo = InMemorySimulationRepository()
        storage_path = repo.save_run(
            "user_1",
            "proj_1",
            run_id=1001,
            csv_bundle=csv_bundle,
            summary_kpis=kpis.to_dict(),
            tier1_summaries=tier1.to_dict(),
        )
        assert storage_path is not None and "hourly_simulation" in storage_path
        stored_bundle = repo.get_stored_csv_bundle("user_1", "proj_1")
        default_keys = {k for k in csv_bundle if not k.startswith("hourly_year_")}
        assert set(stored_bundle.keys()) == default_keys
        # Years 2-20 are stored too, and come back when asked for by key.
        assert len(csv_bundle) - len(default_keys) == 19
        year_7 = repo.get_stored_csv_bundle("user_1", "proj_1", ["hourly_year_07"])
        assert set(year_7) == {"hourly_year_07"}
        meta = repo.get_last_run_metadata("user_1", "proj_1")
        assert meta is not None
        assert meta["summaryKpis"]["total_initial_capex"] == 18000.0
        assert len(meta["tier1Summaries"]["monthly_solar_averages"]) == 12

        # Verify response contract includes tier1Summaries
        resp = SimulationResponseContract(
            storage_path=storage_path,
            csv_bundle=csv_bundle,
            run_id=1001,
            summary_kpis=kpis,
            tier1_summaries=tier1,
        ).to_dict()
        assert "tier1Summaries" in resp
        assert len(resp["tier1Summaries"]["monthly_solar_averages"]) == 12

    def test_epoch_modifiers_and_project_fixed_costs_scale_outputs(self):
        nlr_df = _make_weather_df(hours=24)
        state = SimulationState.initialize(
            nlr_df=nlr_df,
            load_list=[2.0] * 24,
            using_solar=False,
            using_wind=False,
            using_generator=True,
            generator_inputs={"capacity": 10000.0, "capex": 1000.0, "opex": 100.0, "lifespan": 10, "replacement_cost": 500.0},
            using_battery=False,
            financial_inputs={
                "inflation": 0.0,
                "energy_price": 0.50,
                "other_capex": 500.0,
                "labor_cost": 200.0,
                "land_leasing_cost": 50.0,
                "licensing_cost": 50.0,
            },
        )
        # Double load in year 1 via EpochModifiers
        state.epoch_modifiers.load_multiplier[1] = 2.0
        engine = SimulationEngine()
        engine.run(state)

        # Year 0 expenses: 1000 (gen capex) + 100 (gen opex) + 500 (other_capex) + 300 (fixed opex) = 1900
        assert state.total_expenses[0] == pytest.approx(1900.0)
        # Year 1 expenses: 100 (gen opex) + 300 (fixed opex) = 400
        assert state.total_expenses[1] == pytest.approx(400.0)
        # Revenue in year 1 is 2x revenue in year 0 due to load_multiplier[1] == 2.0
        assert state.revenue_yearly is not None
        assert state.revenue_yearly[1] == pytest.approx(2.0 * state.revenue_yearly[0])

    def test_run_simulation_facade_returns_dict(self):
        nlr_df = _make_weather_df(hours=24)
        csv_bundle = run_simulation(
            nlr_df,
            [2.0] * 24,
            False, None,
            False, None,
            False, None,
            False, None,
            {"inflation": 3.0, "energy_price": 0.15},
        )
        validate_csv_bundle_schema(csv_bundle)
        assert csv_bundle["solar_heatmap"] is None
        assert csv_bundle["monthly_heatmap"] is None
