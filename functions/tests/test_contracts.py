"""Frontend-Backend interface contract unit tests."""

import pandas as pd
import pytest

from contracts import (
    CONTRACT_SCHEMA_VERSION,
    EXPECTED_CSV_COLUMNS,
    EXPECTED_CSV_KEYS,
    ContractValidationError,
    SimulationRequestContract,
    SimulationResponseContract,
    StoredSimulationResponseContract,
    validate_csv_bundle_schema,
)
from simulation import run_simulation_with_state


def _canonical_frontend_payload() -> dict:
    """Exact payload structure produced by `buildSimulationPayload` in `frontend/src/services/simulation.ts`."""
    return {
        "userId": "user_abc123",
        "projectId": "proj_xyz789",
        "latitude": 48.86,
        "longitude": 2.35,
        "loadInputs": [
            0, 0, 0, 0, 0, 2, 4, 6, 8, 10, 12, 12,
            10, 10, 12, 14, 12, 10, 8, 6, 4, 2, 0, 0,
        ],
        "usingSolarPanel": True,
        "usingWindTurbine": True,
        "usingGenerator": True,
        "usingBattery": True,
        "wireLosses": 10,
        "moduleMismatch": 10,
        "moduleAging": 8,
        "dustDirt": 11,
        "converter": 5,
        "solarArraySize": 5000,
        "solarCapex": 8000,
        "solarOpex": 300,
        "solarLifespan": 10,
        "solarReplacement": 4000,
        "namePlateCapacity": 2,
        "ratedPower": 2500,
        "cutInSpeed": 3,
        "ratedSpeed": 12,
        "cutOutSpeed": 25,
        "windCapex": 12000,
        "windOpex": 400,
        "windLifespan": 10,
        "windReplacement": 6000,
        "generatorCapacity": 10000,
        "generatorCapex": 5000,
        "generatorOpex": 200,
        "generatorLifespan": 10,
        "generatorReplacement": 2500,
        "chargeCapacity": 50,
        "maximumStorage": 200,
        "batteryType": "lithium-ion",
        "batteryCapex": 1000,
        "batteryOpex": 50,
        "batteryLifespan": 10,
        "batteryReplacement": 500,
        "inflation": 3,
        "laborCost": 0,
        "landLeasingCost": 0,
        "licensingCost": 0,
        "otherCapex": 0,
        "energyPrice": 0.15,
    }


class TestSimulationRequestContract:
    def test_parses_canonical_frontend_payload(self):
        payload = _canonical_frontend_payload()
        contract = SimulationRequestContract.from_dict(payload)

        assert contract.user_id == "user_abc123"
        assert contract.project_id == "proj_xyz789"
        assert contract.latitude == 48.86
        assert contract.longitude == 2.35
        assert len(contract.load_inputs) == 24
        assert contract.using_solar is True
        assert contract.using_wind is True
        assert contract.using_generator is True
        assert contract.using_battery is True

        assert contract.solar_inputs is not None
        assert contract.solar_inputs.losses == [0.10, 0.10, 0.08, 0.11, 0.05]
        assert contract.solar_inputs.solar_array_size == 5000.0
        assert contract.wind_inputs is not None
        assert contract.wind_inputs.rated_power == 2500.0
        assert contract.generator_inputs is not None
        assert contract.generator_inputs.capacity == 10000.0
        assert contract.battery_inputs is not None
        assert contract.battery_inputs.battery_type == "lithium-ion"
        assert contract.financial_inputs.energy_price == 0.15

    def test_disabled_components_produce_none_inputs(self):
        payload = {
            "userId": "u1",
            "projectId": "p1",
            "usingSolarPanel": False,
            "usingWindTurbine": False,
            "usingGenerator": False,
            "usingBattery": False,
        }
        contract = SimulationRequestContract.from_dict(payload)
        assert contract.solar_inputs is None
        assert contract.wind_inputs is None
        assert contract.generator_inputs is None
        assert contract.battery_inputs is None

    def test_rejects_empty_or_non_dict_body(self):
        with pytest.raises(ContractValidationError, match="No JSON data provided"):
            SimulationRequestContract.from_dict(None)
        with pytest.raises(ContractValidationError, match="No JSON data provided"):
            SimulationRequestContract.from_dict({})

    def test_rejects_missing_user_or_project_id(self):
        with pytest.raises(ContractValidationError, match="Missing userId or projectId"):
            SimulationRequestContract.from_dict({"userId": "u1"})
        with pytest.raises(ContractValidationError, match="Missing userId or projectId"):
            SimulationRequestContract.from_dict({"projectId": "p1"})

    def test_rejects_non_list_load_inputs(self):
        with pytest.raises(ContractValidationError, match="loadInputs must be a list"):
            SimulationRequestContract.from_dict({
                "userId": "u1",
                "projectId": "p1",
                "loadInputs": "invalid",
            })


class TestSimulationResponseAndCsvSchemaContract:
    def test_end_to_end_contract_and_csv_headers(self):
        payload = _canonical_frontend_payload()
        req = SimulationRequestContract.from_dict(payload)

        # 48 hours of synthetic weather data
        nlr_df = pd.DataFrame({
            "Datetime": pd.date_range("2025-01-01", periods=48, freq="h").astype(str),
            "Irradiance (W/m2)": [0.0] * 6 + [500.0] * 12 + [0.0] * 6 + [0.0] * 6 + [600.0] * 12 + [0.0] * 6,
            "Temp_C (oC)": [25.0] * 48,
            "Wind_speed(m/s)": [6.0] * 48,
        })

        csv_bundle, state = run_simulation_with_state(
            nlr_df,
            req.load_inputs,
            req.using_solar,
            req.solar_inputs.to_dict() if req.solar_inputs else None,
            req.using_wind,
            req.wind_inputs.to_dict() if req.wind_inputs else None,
            req.using_generator,
            req.generator_inputs.to_dict() if req.generator_inputs else None,
            req.using_battery,
            req.battery_inputs.to_dict() if req.battery_inputs else None,
            req.financial_inputs.to_dict(),
        )

        # Validate CSV bundle against frontend column contract
        validate_csv_bundle_schema(csv_bundle)

        resp_contract = SimulationResponseContract(
            storage_path="gs://sesdc-toolkit2.appspot.com/simulations/u/p/1_hourly_simulation.csv.gz",
            csv_bundle=csv_bundle,
            run_id=123456,
            summary_kpis=state.summary_kpis,
        )
        serialized = resp_contract.to_dict()

        # Required legacy frontend keys
        assert "storagePath" in serialized
        assert "csvKeys" in serialized
        assert "csvBundle" in serialized
        assert set(serialized["csvBundle"].keys()) == set(EXPECTED_CSV_KEYS)

        # Additive keys
        assert serialized["schemaVersion"] == CONTRACT_SCHEMA_VERSION
        assert serialized["runId"] == 123456
        assert "summaryKpis" in serialized
        assert serialized["summaryKpis"]["total_initial_capex"] == 26000.0

    def test_validate_csv_bundle_schema_catches_column_drift(self):
        bad_bundle = {k: None for k in EXPECTED_CSV_KEYS}
        bad_bundle["hourly_simulation"] = "Datetime,wrong_col\n2025-01-01 00:00:00,1.0\n"

        with pytest.raises(ContractValidationError, match="header mismatch"):
            validate_csv_bundle_schema(bad_bundle)

    def test_validate_csv_bundle_schema_catches_missing_keys(self):
        with pytest.raises(ContractValidationError, match="missing expected keys"):
            validate_csv_bundle_schema({"hourly_simulation": None})

    def test_stored_simulation_response_contract(self):
        stored = StoredSimulationResponseContract(csv_bundle={"hourly_simulation": "Datetime,load_kW\n"})
        data = stored.to_dict()
        assert data["csvBundle"] == {"hourly_simulation": "Datetime,load_kW\n"}
        assert data["schemaVersion"] == CONTRACT_SCHEMA_VERSION
