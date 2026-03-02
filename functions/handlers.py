"""HTTP handlers for simulation GET and POST (import firebase_functions here)."""

import json
import time
import traceback

from firebase_functions import https_fn

from config import cors_settings
from firestore_helpers import get_last_simulation_run, save_last_simulation_run
from nrel import fetch_nrel_data
from simulation import run_simulation
from storage import download_csv, upload_csv_bundle
from utils import safe_float, safe_int


@https_fn.on_request(cors=cors_settings)
def run_simulation_post(req: https_fn.Request) -> https_fn.Response:
    """POST: run simulation, upload primary CSV to GCS, return storagePath + csvBundle."""
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)
    if req.method != "POST":
        print("[run_simulation_post] Rejected: method not allowed")
        return https_fn.Response("Method Not Allowed", status=405)

    try:
        data = req.get_json(silent=True)
        if not data:
            print("[run_simulation_post] Rejected: no JSON body")
            return https_fn.Response("Invalid request: No JSON data provided", status=400)

        userId = data.get("userId")
        projectId = data.get("projectId")
        if not userId or not projectId:
            print("[run_simulation_post] Rejected: missing userId or projectId")
            return https_fn.Response("Missing userId or projectId", status=400)

        print("[run_simulation_post] userId=", userId, "projectId=", projectId)

        latitude = data.get("latitude")
        longitude = data.get("longitude")
        load_list = data.get("loadInputs", [])

        using_solar = bool(data.get("usingSolarPanel"))
        using_wind = bool(data.get("usingWindTurbine"))
        using_generator = bool(data.get("usingGenerator"))
        using_battery = bool(data.get("usingBattery"))

        solar_inputs = None
        if using_solar:
            losses = [
                safe_float(data.get("wireLosses")) / 100.0,
                safe_float(data.get("moduleMismatch")) / 100.0,
                safe_float(data.get("moduleAging")) / 100.0,
                safe_float(data.get("dustDirt")) / 100.0,
                safe_float(data.get("converter")) / 100.0,
            ]
            solar_inputs = {
                "losses": losses,
                "solar_array_size": safe_float(data.get("solarArraySize")),
                "capex": safe_float(data.get("solarCapex")),
                "opex": safe_float(data.get("solarOpex")),
                "lifespan": safe_int(data.get("solarLifespan")),
                "replacement_cost": safe_float(data.get("solarReplacement")),
            }

        wind_inputs = None
        if using_wind:
            wind_inputs = {
                "nameplate_capacity": safe_float(data.get("namePlateCapacity")),
                "rated_power": safe_float(data.get("ratedPower")),
                "cut_in_speed": safe_float(data.get("cutInSpeed")),
                "rated_speed": safe_float(data.get("ratedSpeed")),
                "cut_out_speed": safe_float(data.get("cutOutSpeed")),
                "capex": safe_float(data.get("windCapex")),
                "opex": safe_float(data.get("windOpex")),
                "lifespan": safe_int(data.get("windLifespan")),
                "replacement_cost": safe_float(data.get("windReplacement")),
            }

        generator_inputs = None
        if using_generator:
            generator_inputs = {
                "capacity": safe_float(data.get("generatorCapacity")),
                "capex": safe_float(data.get("generatorCapex")),
                "opex": safe_float(data.get("generatorOpex")),
                "lifespan": safe_int(data.get("generatorLifespan")),
                "replacement_cost": safe_float(data.get("generatorReplacement")),
            }

        battery_inputs = None
        if using_battery:
            battery_inputs = {
                "charge_capacity": safe_float(data.get("chargeCapacity")),
                "maximum_storage": safe_float(data.get("maximumStorage")),
                "battery_type": data.get("batteryType", "lithium-ion"),
                "capex": safe_float(data.get("batteryCapex")),
                "opex": safe_float(data.get("batteryOpex")),
                "lifespan": safe_int(data.get("batteryLifespan")),
                "replacement_cost": safe_float(data.get("batteryReplacement")),
            }

        financial_inputs = {
            "inflation": safe_float(data.get("inflation", 3.0), 3.0),
            "labor_cost": safe_float(data.get("laborCost")),
            "land_leasing_cost": safe_float(data.get("landLeasingCost")),
            "licensing_cost": safe_float(data.get("licensingCost")),
            "other_capex": safe_float(data.get("otherCapex")),
            "energy_price": safe_float(data.get("energyPrice", 0.15), 0.15),
        }

        print("[run_simulation_post] Fetching NREL data...")
        nrel_df = fetch_nrel_data(latitude, longitude)
        if nrel_df is None:
            print("[run_simulation_post] NREL fetch failed")
            return https_fn.Response("Failed to fetch NREL data (check logs)", status=502)

        print("[run_simulation_post] Running simulation...")
        csv_dict = run_simulation(
            nrel_df,
            load_list,
            using_solar, solar_inputs,
            using_wind, wind_inputs,
            using_generator, generator_inputs,
            using_battery, battery_inputs,
            financial_inputs,
        )

        run_id = int(time.time())
        storage_path = None
        try:
            paths = upload_csv_bundle(userId, projectId, run_id, csv_dict)
            save_last_simulation_run(userId, projectId, run_id, paths)
            storage_path = paths.get("hourly_simulation")
        except Exception as up_err:
            print("[run_simulation_post] Upload failed:", str(up_err))
            traceback.print_exc()
            return https_fn.Response("Failed to upload CSV to storage", status=500)

        csv_keys = [k for k, v in csv_dict.items() if v is not None and len(str(v)) > 0]
        payload = {
            "storagePath": storage_path,
            "csvKeys": csv_keys,
            "csvBundle": csv_dict,
        }
        print("[run_simulation_post] Done, storagePath=", storage_path)
        return https_fn.Response(
            json.dumps(payload),
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
        userId = req.args.get("userId")
        projectId = req.args.get("projectId")
        if not userId or not projectId:
            return https_fn.Response(
                "Missing userId or projectId query params",
                status=400,
                headers={"Content-Type": "application/json; charset=utf-8"},
            )

        last_run = get_last_simulation_run(userId, projectId)
        if not last_run or not last_run.get("paths"):
            return https_fn.Response(
                json.dumps({"csvBundle": {}}),
                status=200,
                headers={"Content-Type": "application/json; charset=utf-8"},
            )

        paths = last_run["paths"]
        csv_bundle = {}
        for key, gs_url in paths.items():
            try:
                csv_bundle[key] = download_csv(gs_url)
            except Exception as e:
                print("[get_stored_simulation] Failed to download", key, str(e))
        print("[get_stored_simulation] Returned", len(csv_bundle), "CSVs")
        return https_fn.Response(
            json.dumps({"csvBundle": csv_bundle}),
            status=200,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
    except Exception as e:
        print("[get_stored_simulation] Error:", str(e))
        traceback.print_exc()
        return https_fn.Response(f"Error: {str(e)}", status=500)
