"""HTTP handlers for simulation GET and POST (import firebase_functions here)."""

import json
import time
import traceback

from firebase_functions import https_fn
from firebase_functions.params import SecretParam

from caller_auth import AuthError, caller_uid
from config import cors_settings
from contracts import (
    ContractValidationError,
    SimulationRequestContract,
    SimulationResponseContract,
    StoredSimulationResponseContract,
)
from nlr import fetch_nlr_data
from repository import GcpSimulationRepository
from simulation import run_simulation_with_state

NLR_API_KEY = SecretParam("NLR_API_KEY")


def _auth_failure(e: AuthError) -> https_fn.Response:
    return https_fn.Response(str(e), status=e.status)


@https_fn.on_request(cors=cors_settings, secrets=[NLR_API_KEY])
def run_simulation_post(req: https_fn.Request) -> https_fn.Response:
    """POST: validate contract, run simulation, persist via repository, return contract response."""
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)
    if req.method != "POST":
        print("[run_simulation_post] Rejected: method not allowed")
        return https_fn.Response("Method Not Allowed", status=405)

    try:
        data = req.get_json(silent=True)
        # Who is calling comes from their verified ID token. A userId in the
        # body must match it, so one user can't run or overwrite another's.
        try:
            caller_uid(
                req.headers,
                claimed_uid=data.get("userId") if isinstance(data, dict) else None,
            )
        except AuthError as auth_err:
            print("[run_simulation_post] Rejected:", str(auth_err))
            return _auth_failure(auth_err)
        try:
            contract_req = SimulationRequestContract.from_dict(data)
        except ContractValidationError as val_err:
            print("[run_simulation_post] Rejected:", str(val_err))
            return https_fn.Response(str(val_err), status=400)

        print(
            "[run_simulation_post] userId=",
            contract_req.user_id,
            "projectId=",
            contract_req.project_id,
        )

        print("[run_simulation_post] Fetching NLR data...")
        nlr_df = fetch_nlr_data(contract_req.latitude, contract_req.longitude)
        if nlr_df is None:
            print("[run_simulation_post] NLR fetch failed")
            return https_fn.Response("Failed to fetch NLR data (check logs)", status=502)

        print("[run_simulation_post] Running simulation...")
        csv_dict, state = run_simulation_with_state(
            nlr_df,
            contract_req.load_inputs,
            contract_req.using_solar,
            contract_req.solar_inputs.to_dict() if contract_req.solar_inputs else None,
            contract_req.using_wind,
            contract_req.wind_inputs.to_dict() if contract_req.wind_inputs else None,
            contract_req.using_generator,
            contract_req.generator_inputs.to_dict() if contract_req.generator_inputs else None,
            contract_req.using_battery,
            contract_req.battery_inputs.to_dict() if contract_req.battery_inputs else None,
            contract_req.financial_inputs.to_dict(),
            seed=contract_req.seed,
        )

        run_id = int(time.time())
        storage_path = None
        summary_kpis_dict = state.summary_kpis.to_dict() if state.summary_kpis else None
        tier1_dict = state.tier1_summaries.to_dict() if state.tier1_summaries else None
        repo = GcpSimulationRepository()
        try:
            storage_path = repo.save_run(
                user_id=contract_req.user_id,
                project_id=contract_req.project_id,
                run_id=run_id,
                csv_bundle=csv_dict,
                summary_kpis=summary_kpis_dict,
                tier1_summaries=tier1_dict,
            )
        except Exception as up_err:
            print("[run_simulation_post] Upload failed:", str(up_err))
            traceback.print_exc()
            return https_fn.Response("Failed to upload CSV to storage", status=500)

        response_contract = SimulationResponseContract(
            storage_path=storage_path,
            csv_bundle=csv_dict,
            run_id=run_id,
            summary_kpis=state.summary_kpis,
            tier1_summaries=state.tier1_summaries,
        )
        print("[run_simulation_post] Done, storagePath=", storage_path)
        return https_fn.Response(
            json.dumps(response_contract.to_dict()),
            status=200,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
    except Exception as e:
        print("[run_simulation_post] Error:", str(e))
        traceback.print_exc()
        return https_fn.Response(f"Error processing request: {str(e)}", status=500)


@https_fn.on_request(cors=cors_settings)
def get_stored_simulation(req: https_fn.Request) -> https_fn.Response:
    """GET: return stored simulation CSVs for a project (userId, projectId query params)."""
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)
    if req.method != "GET":
        return https_fn.Response("Method Not Allowed", status=405)

    try:
        try:
            userId = caller_uid(req.headers, claimed_uid=req.args.get("userId"))
        except AuthError as auth_err:
            print("[get_stored_simulation] Rejected:", str(auth_err))
            return _auth_failure(auth_err)

        projectId = req.args.get("projectId")
        if not projectId:
            return https_fn.Response(
                "Missing projectId query param",
                status=400,
                headers={"Content-Type": "application/json; charset=utf-8"},
            )

        # Without `keys`, every table except the per-year hourly ones;
        # `keys=hourly_year_07` (comma-separated) fetches specific tables.
        keys = [k.strip() for k in (req.args.get("keys") or "").split(",") if k.strip()]
        repo = GcpSimulationRepository()
        csv_bundle = repo.get_stored_csv_bundle(userId, projectId, keys or None)
        print("[get_stored_simulation] Returned", len(csv_bundle), "CSVs")
        stored_contract = StoredSimulationResponseContract(csv_bundle=csv_bundle)
        return https_fn.Response(
            json.dumps(stored_contract.to_dict()),
            status=200,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
    except Exception as e:
        print("[get_stored_simulation] Error:", str(e))
        traceback.print_exc()
        return https_fn.Response(f"Error: {str(e)}", status=500)
