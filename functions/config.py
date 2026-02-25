"""CORS and static API metadata for Cloud Functions."""

from firebase_functions import options

cors_settings = options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "OPTIONS"],
)

SIMULATION_METADATA = {
    "description": "Simulation API contract: required/optional inputs and CSV outputs.",
    "post": {
        "method": "POST",
        "url_suffix": "run_simulation_post",
        "required": ["userId", "projectId", "latitude", "longitude", "loadInputs"],
        "optional_flags": [
            "usingSolarPanel",
            "usingWindTurbine",
            "usingGenerator",
            "usingBattery",
        ],
        "optional_params": {
            "solar": ["wireLosses", "moduleMismatch", "moduleAging", "dustDirt", "converter", "solarArraySize", "solarCapex", "solarOpex", "solarLifespan", "solarReplacement"],
            "wind": ["namePlateCapacity", "ratedPower", "cutInSpeed", "ratedSpeed", "cutOutSpeed", "windCapex", "windOpex", "windLifespan", "windReplacement"],
            "generator": ["generatorCapacity", "generatorCapex", "generatorOpex", "generatorLifespan", "generatorReplacement"],
            "battery": ["chargeCapacity", "maximumStorage", "batteryType", "batteryCapex", "batteryOpex", "batteryLifespan", "batteryReplacement"],
            "financial": ["inflation", "laborCost", "landLeasingCost", "licensingCost", "otherCapex", "energyPrice"],
        },
        "response": {
            "storagePath": "gs:// bucket path of uploaded primary (hourly) CSV",
            "csvKeys": "list of keys in csvBundle",
            "csvBundle": "object of key -> CSV string (input_data, hourly_simulation, daily_averages, etc.)",
        },
    },
    "csv_outputs": {
        "input_data": "Raw NREL + load data (datetime, irradiance, temp, wind, load_values).",
        "hourly_simulation": "Per-timestep results (load, solar, wind, diesel, net, battery_soc, load_not_serviced, load_serviced). Uploaded to GCS as primary CSV.",
        "daily_averages": "Daily-averaged values for load, solar, wind, diesel, net, load_serviced, load_not_serviced.",
        "twenty_year_daily": "20-year daily load-serviced projection.",
        "financial_expenses": "20-year CAPEX/OPEX by technology (battery, generator, solar, wind) + total + cumulative.",
        "revenue": "20-year annual and cumulative revenue.",
        "solar_heatmap": "365×24 hourly solar matrix (when solar enabled).",
        "monthly_heatmap": "12×31 avg-daily solar by month/day (when solar enabled).",
    },
}
