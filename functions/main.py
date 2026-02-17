import io
import json

import requests
import numpy as np
import pandas as pd

from firebase_functions import https_fn, options

from calculations import (
    calculate_hourly_solar_energy,
    calculate_hourly_wind_energy,
    net_energy_for_graph,
    calculate_net_energy,
    calc_load_not_serviced,
    calc_daily_energy,
    predict20years,
    calculate_20_year_expenses,
    compute_20_year_revenue,
    EnergyStorageSystem,
    STCIrr,
    STCTemp,
    coef,
    diesel_losses,
)


cors_settings = options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["POST", "OPTIONS"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _df_to_csv(df: pd.DataFrame) -> str:
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue()


def _safe_float(val, default=0.0):
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _safe_int(val, default=10):
    try:
        return int(val) if val is not None else default
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------------------
# NREL data fetch
# ---------------------------------------------------------------------------

def fetch_nrel_data(
    latitude,
    longitude,
    api_key="5gZjfefi1adVzrZPYNirDhSk24BQcDEaYyWnxPdy",
    year="2022",
    interval="30",
):
    """Fetch NREL weather/irradiance data and return a parsed DataFrame.

    Columns returned:
        Datetime, Irradiance (W/m2), Temp_C (oC), Wind_speed(m/s)
    Returns None on failure.
    """
    url = "https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-msg-v1-0-0-download.csv"
    wkt = f"POINT({longitude} {latitude})"
    params = {
        "api_key": api_key,
        "wkt": wkt,
        "attributes": "dni,wind_speed,air_temperature",
        "names": year,
        "utc": "false",
        "leap_day": "false",
        "interval": interval,
        "full_name": "Peter Dauenhauer",
        "email": "peter.dauenhauer@gmail.com",
    }

    print("[fetch_nrel_data] Requesting NREL", "lat=", latitude, "lon=", longitude)
    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(
            "[fetch_nrel_data] NREL failed",
            "status=", response.status_code,
            "body=", response.text[:500],
        )
        return None

    print("[fetch_nrel_data] NREL OK, parsing CSV...")
    csv_data = io.StringIO(response.text)
    df = pd.read_csv(csv_data, skiprows=2)

    ts = df.iloc[:, :5].copy()
    ts["Timestamp"] = pd.to_datetime(ts[["Year", "Month", "Day", "Hour", "Minute"]])
    ts["Datetime"] = ts["Timestamp"].dt.strftime("%m/%d/%Y %H:%M")

    result = pd.DataFrame()
    result["Datetime"] = ts["Datetime"].values
    result["Irradiance (W/m2)"] = df["DNI"].values
    result["Temp_C (oC)"] = df["Temperature"].values
    result["Wind_speed(m/s)"] = df["Wind Speed"].values

    print("[fetch_nrel_data] Parsed", len(result), "rows")
    return result


# ---------------------------------------------------------------------------
# Core simulation  –  returns dict of CSV strings
# ---------------------------------------------------------------------------

def run_simulation(
    nrel_df,
    load_list,
    using_solar, solar_inputs,
    using_wind, wind_inputs,
    using_generator, generator_inputs,
    using_battery, battery_inputs,
    financial_inputs,
):
    """Run the full energy-system simulation and return a dict of CSV strings.

    Keys in the returned dict (any may be None when not applicable):
        input_data            – raw NREL + load data
        hourly_simulation     – per-timestep simulation results
        daily_averages        – daily-averaged values
        twenty_year_daily     – 20-year daily load-serviced projection
        financial_expenses    – 20-year CAPEX/OPEX breakdown
        revenue               – 20-year revenue projection
        solar_heatmap         – 365×24 hourly solar matrix
        monthly_heatmap       – 12×31 avg-daily solar matrix
    """
    n_rows = len(nrel_df)
    time_points = np.arange(n_rows)

    # --- Repeat load pattern to fill the year ---
    if load_list and len(load_list) > 0:
        repeats_needed = (n_rows // len(load_list)) + 1
        repeated = (load_list * repeats_needed)[:n_rows]
    else:
        repeated = [0] * n_rows
    load_values = np.array(repeated, dtype=float)

    # ---------------------------------------------------------------
    # Hourly generation calculations
    # ---------------------------------------------------------------

    # Solar
    solar_power = np.zeros(n_rows)
    if using_solar and solar_inputs:
        raw = calculate_hourly_solar_energy(
            nrel_df,
            solar_inputs["solar_array_size"],
            solar_inputs["losses"],
            coef, STCIrr, STCTemp,
        )
        solar_power = np.array(raw, dtype=float) / 1000.0  # W → kW
        print("[run_simulation] Solar done, total kWh=", np.sum(solar_power))

    # Wind
    wind_power = np.zeros(n_rows)
    if using_wind and wind_inputs:
        raw = calculate_hourly_wind_energy(
            nrel_df,
            wind_inputs["nameplate_capacity"],
            wind_inputs["rated_power"],
            wind_inputs["cut_in_speed"],
            wind_inputs["rated_speed"],
            wind_inputs["cut_out_speed"],
        )
        wind_power = np.array(raw, dtype=float) / 1000.0  # W → kW
        print("[run_simulation] Wind done, total kWh=", np.sum(wind_power))

    # Diesel / Generator  (simple load-following dispatch)
    diesel_power = np.zeros(n_rows)
    if using_generator and generator_inputs:
        gen_capacity = _safe_float(generator_inputs.get("capacity"))
        loss_vals = list(diesel_losses.values())
        max_output_kw = (gen_capacity * np.prod(loss_vals)) / 1000.0  # W → kW
        for i in range(n_rows):
            deficit = load_values[i] - solar_power[i] - wind_power[i]
            if deficit > 0:
                diesel_power[i] = min(deficit, max_output_kw)
        print("[run_simulation] Diesel done, total kWh=", np.sum(diesel_power))

    # Net energy  (solar + wind + diesel − load)
    net_energy = net_energy_for_graph(solar_power, load_values, wind_power, diesel_power)

    # Battery
    battery_soc = np.zeros(n_rows)
    load_not_serviced = np.zeros(n_rows)
    if using_battery and battery_inputs:
        batt = EnergyStorageSystem(
            capacity=_safe_float(battery_inputs.get("charge_capacity")),
            max_storage=_safe_float(battery_inputs.get("maximum_storage")),
            battery_type=battery_inputs.get("battery_type", "lithium-ion"),
        )
        battery_soc = np.array(calculate_net_energy(batt, net_energy.tolist()))
        load_not_serviced = np.array(calc_load_not_serviced(
            time_points, battery_soc,
            battery_inputs.get("battery_type", "lithium-ion"),
            _safe_float(battery_inputs.get("maximum_storage")),
            net_energy,
        ))
        print("[run_simulation] Battery done")

    # Hourly load serviced
    hourly_load_serviced = load_values - load_not_serviced

    # ---------------------------------------------------------------
    # Build CSV dict
    # ---------------------------------------------------------------
    csvs: dict[str, str | None] = {}

    # 1. Input data (raw NREL + load)
    input_df = nrel_df.copy()
    input_df["load_values"] = load_values
    csvs["input_data"] = _df_to_csv(input_df)

    # 2. Hourly simulation
    hourly_df = pd.DataFrame({
        "Datetime": nrel_df["Datetime"].values,
        "load_kW": load_values,
        "solar_kW": solar_power,
        "wind_kW": wind_power,
        "diesel_kW": diesel_power,
        "net_energy_kW": net_energy,
        "battery_soc_kWh": battery_soc,
        "load_not_serviced_kW": load_not_serviced,
        "load_serviced_kW": hourly_load_serviced,
    })
    csvs["hourly_simulation"] = _df_to_csv(hourly_df)

    # 3. Daily averages  (trim to a multiple of 24 rows)
    daily_load_serviced = None
    daily_solar = None
    try:
        trim = (n_rows // 24) * 24
        daily_load = calc_daily_energy(0, load_values[:trim].tolist())
        daily_solar = calc_daily_energy(0, solar_power[:trim].tolist())
        daily_wind = calc_daily_energy(0, wind_power[:trim].tolist())
        daily_diesel = calc_daily_energy(0, diesel_power[:trim].tolist())
        daily_net = calc_daily_energy(0, net_energy[:trim].tolist())
        daily_lns = calc_daily_energy(0, load_not_serviced[:trim].tolist())
        daily_load_serviced = calc_daily_energy(0, hourly_load_serviced[:trim].tolist())

        daily_df = pd.DataFrame({
            "day": np.arange(len(daily_load)),
            "avg_load_kW": daily_load,
            "avg_solar_kW": daily_solar,
            "avg_wind_kW": daily_wind,
            "avg_diesel_kW": daily_diesel,
            "avg_net_kW": daily_net,
            "avg_load_serviced_kW": daily_load_serviced,
            "avg_load_not_serviced_kW": daily_lns,
        })
        csvs["daily_averages"] = _df_to_csv(daily_df)
        print("[run_simulation] Daily averages done, days=", len(daily_load))
    except Exception as e:
        print("[run_simulation] daily_averages error:", str(e))
        csvs["daily_averages"] = None

    # 4. 20-year daily projection
    try:
        if daily_load_serviced and len(daily_load_serviced) > 0:
            ls_20yr = predict20years(daily_load_serviced)
            csvs["twenty_year_daily"] = _df_to_csv(pd.DataFrame({
                "day": np.arange(len(ls_20yr)),
                "load_serviced_kW": ls_20yr,
            }))
            print("[run_simulation] 20yr daily done, rows=", len(ls_20yr))
        else:
            csvs["twenty_year_daily"] = None
    except Exception as e:
        print("[run_simulation] twenty_year_daily error:", str(e))
        csvs["twenty_year_daily"] = None

    # 5. Financial expenses (20 years)
    inflation_raw = _safe_float(financial_inputs.get("inflation", 3.0), 3.0)
    inflation_rate = inflation_raw / 100.0 if inflation_raw > 1 else inflation_raw
    try:
        years_arr = np.arange(20)
        battery_exp = np.zeros(20)
        generator_exp = np.zeros(20)
        solar_exp = np.zeros(20)
        wind_exp = np.zeros(20)

        if using_battery and battery_inputs:
            battery_exp = calculate_20_year_expenses(
                inflation_rate,
                _safe_float(battery_inputs.get("capex")),
                _safe_float(battery_inputs.get("opex")),
                _safe_float(battery_inputs.get("replacement_cost")),
                _safe_int(battery_inputs.get("lifespan")),
            )
        if using_generator and generator_inputs:
            generator_exp = calculate_20_year_expenses(
                inflation_rate,
                _safe_float(generator_inputs.get("capex")),
                _safe_float(generator_inputs.get("opex")),
                _safe_float(generator_inputs.get("replacement_cost")),
                _safe_int(generator_inputs.get("lifespan")),
            )
        if using_solar and solar_inputs:
            solar_exp = calculate_20_year_expenses(
                inflation_rate,
                _safe_float(solar_inputs.get("capex")),
                _safe_float(solar_inputs.get("opex")),
                _safe_float(solar_inputs.get("replacement_cost")),
                _safe_int(solar_inputs.get("lifespan")),
            )
        if using_wind and wind_inputs:
            wind_exp = calculate_20_year_expenses(
                inflation_rate,
                _safe_float(wind_inputs.get("capex")),
                _safe_float(wind_inputs.get("opex")),
                _safe_float(wind_inputs.get("replacement_cost")),
                _safe_int(wind_inputs.get("lifespan")),
            )

        total_exp = battery_exp + generator_exp + solar_exp + wind_exp
        cumulative_exp = np.cumsum(total_exp)

        fin_df = pd.DataFrame({
            "year": years_arr,
            "battery_expenses": battery_exp,
            "generator_expenses": generator_exp,
            "solar_expenses": solar_exp,
            "wind_expenses": wind_exp,
            "total_expenses": total_exp,
            "cumulative_expenses": cumulative_exp,
        })
        csvs["financial_expenses"] = _df_to_csv(fin_df)
        print("[run_simulation] Financial expenses done")
    except Exception as e:
        print("[run_simulation] financial_expenses error:", str(e))
        csvs["financial_expenses"] = None

    # 6. Revenue (20 years)
    try:
        energy_price = _safe_float(financial_inputs.get("energy_price", 0.15), 0.15)
        if daily_load_serviced and len(daily_load_serviced) > 0 and energy_price > 0:
            revenue_yearly = compute_20_year_revenue(
                daily_load_serviced, energy_price, inflation_raw,
            )
            cumulative_rev = list(np.cumsum(revenue_yearly))
            csvs["revenue"] = _df_to_csv(pd.DataFrame({
                "year": np.arange(len(revenue_yearly)),
                "annual_revenue": revenue_yearly,
                "cumulative_revenue": cumulative_rev,
            }))
            print("[run_simulation] Revenue done")
        else:
            csvs["revenue"] = None
    except Exception as e:
        print("[run_simulation] revenue error:", str(e))
        csvs["revenue"] = None

    # 7. Solar heatmap (365 × 24 matrix)
    if using_solar and len(solar_power) >= 8760:
        try:
            reshaped = solar_power[:8760].reshape((365, 24))
            hm_df = pd.DataFrame(reshaped, columns=[f"hour_{h}" for h in range(24)])
            hm_df.insert(0, "day", np.arange(365))
            csvs["solar_heatmap"] = _df_to_csv(hm_df)
            print("[run_simulation] Solar heatmap done")
        except Exception as e:
            print("[run_simulation] solar_heatmap error:", str(e))
            csvs["solar_heatmap"] = None
    else:
        csvs["solar_heatmap"] = None

    # 8. Monthly heatmap (12 × 31 avg-daily solar)
    if using_solar and daily_solar and len(daily_solar) >= 365:
        try:
            days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
            month_names = [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            ]
            heatmap = np.full((12, 31), np.nan)
            day_idx = 0
            for m, nd in enumerate(days_in_month):
                for d in range(nd):
                    heatmap[m, d] = daily_solar[day_idx]
                    day_idx += 1
            mh_df = pd.DataFrame(heatmap, columns=[f"day_{d+1}" for d in range(31)])
            mh_df.insert(0, "month", month_names)
            csvs["monthly_heatmap"] = _df_to_csv(mh_df)
            print("[run_simulation] Monthly heatmap done")
        except Exception as e:
            print("[run_simulation] monthly_heatmap error:", str(e))
            csvs["monthly_heatmap"] = None
    else:
        csvs["monthly_heatmap"] = None

    return csvs


# ---------------------------------------------------------------------------
# HTTP entry-point
# ---------------------------------------------------------------------------

@https_fn.on_request(cors=cors_settings)
def fetch_solar_data_function(req: https_fn.Request) -> https_fn.Response:
    print("[fetch_solar_data_function] Request received", "method=", req.method, "path=", req.path)

    if req.path == "/__/health":
        return https_fn.Response("OK", status=200)

    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)

    if req.method != "POST":
        print("[fetch_solar_data_function] Rejected: method not allowed")
        return https_fn.Response("Method Not Allowed", status=405)

    try:
        data = req.get_json(silent=True)

        if not data:
            print("[fetch_solar_data_function] Rejected: no JSON body")
            return https_fn.Response("Invalid request: No JSON data provided", status=400)

        userId = data.get("userId")
        projectId = data.get("projectId")

        if not userId or not projectId:
            print("[fetch_solar_data_function] Rejected: missing userId or projectId")
            return https_fn.Response("Missing userId or projectId", status=400)

        print("[fetch_solar_data_function] userId=", userId, "projectId=", projectId)

        # ---- Location ----
        latitude = data.get("latitude")
        longitude = data.get("longitude")

        # ---- Load ----
        load_list = data.get("loadInputs", [])

        # ---- Technology flags ----
        using_solar = bool(data.get("usingSolarPanel"))
        using_wind = bool(data.get("usingWindTurbine"))
        using_generator = bool(data.get("usingGenerator"))
        using_battery = bool(data.get("usingBattery"))

        # ---- Solar (only parse when enabled) ----
        solar_inputs = None
        if using_solar:
            wire_losses = _safe_float(data.get("wireLosses"))
            module_mismatch = _safe_float(data.get("moduleMismatch"))
            module_aging = _safe_float(data.get("moduleAging"))
            dust_dirt = _safe_float(data.get("dustDirt"))
            converter_loss = _safe_float(data.get("converter"))
            losses = [
                wire_losses / 100.0,
                module_mismatch / 100.0,
                module_aging / 100.0,
                dust_dirt / 100.0,
                converter_loss / 100.0,
            ]
            solar_inputs = {
                "losses": losses,
                "solar_array_size": _safe_float(data.get("solarArraySize")),
                "capex": _safe_float(data.get("solarCapex")),
                "opex": _safe_float(data.get("solarOpex")),
                "lifespan": _safe_int(data.get("solarLifespan")),
                "replacement_cost": _safe_float(data.get("solarReplacement")),
            }

        # ---- Wind (only parse when enabled) ----
        wind_inputs = None
        if using_wind:
            wind_inputs = {
                "nameplate_capacity": _safe_float(data.get("namePlateCapacity")),
                "rated_power": _safe_float(data.get("ratedPower")),
                "cut_in_speed": _safe_float(data.get("cutInSpeed")),
                "rated_speed": _safe_float(data.get("ratedSpeed")),
                "cut_out_speed": _safe_float(data.get("cutOutSpeed")),
                "capex": _safe_float(data.get("windCapex")),
                "opex": _safe_float(data.get("windOpex")),
                "lifespan": _safe_int(data.get("windLifespan")),
                "replacement_cost": _safe_float(data.get("windReplacement")),
            }

        # ---- Generator (only parse when enabled) ----
        generator_inputs = None
        if using_generator:
            generator_inputs = {
                "capacity": _safe_float(data.get("generatorCapacity")),
                "capex": _safe_float(data.get("generatorCapex")),
                "opex": _safe_float(data.get("generatorOpex")),
                "lifespan": _safe_int(data.get("generatorLifespan")),
                "replacement_cost": _safe_float(data.get("generatorReplacement")),
            }

        # ---- Battery (only parse when enabled) ----
        battery_inputs = None
        if using_battery:
            battery_inputs = {
                "charge_capacity": _safe_float(data.get("chargeCapacity")),
                "maximum_storage": _safe_float(data.get("maximumStorage")),
                "battery_type": data.get("batteryType", "lithium-ion"),
                "capex": _safe_float(data.get("batteryCapex")),
                "opex": _safe_float(data.get("batteryOpex")),
                "lifespan": _safe_int(data.get("batteryLifespan")),
                "replacement_cost": _safe_float(data.get("batteryReplacement")),
            }

        # ---- Financial ----
        financial_inputs = {
            "inflation": _safe_float(data.get("inflation", 3.0), 3.0),
            "labor_cost": _safe_float(data.get("laborCost")),
            "land_leasing_cost": _safe_float(data.get("landLeasingCost")),
            "licensing_cost": _safe_float(data.get("licensingCost")),
            "other_capex": _safe_float(data.get("otherCapex")),
            "energy_price": _safe_float(data.get("energyPrice", 0.15), 0.15),
        }

        # ---- Fetch NREL data ----
        print("[fetch_solar_data_function] Fetching NREL data...")
        nrel_df = fetch_nrel_data(latitude, longitude)

        if nrel_df is None:
            print("[fetch_solar_data_function] NREL fetch failed")
            return https_fn.Response("Failed to fetch NREL data (check logs)", status=502)

        # ---- Run simulation ----
        print("[fetch_solar_data_function] Running simulation...")
        csv_dict = run_simulation(
            nrel_df,
            load_list,
            using_solar, solar_inputs,
            using_wind, wind_inputs,
            using_generator, generator_inputs,
            using_battery, battery_inputs,
            financial_inputs,
        )

        print("[fetch_solar_data_function] Simulation complete, returning JSON of CSVs")

        return https_fn.Response(
            json.dumps(csv_dict),
            status=200,
            headers={
                "Content-Type": "application/json; charset=utf-8",
            },
        )
    except Exception as e:
        print("[fetch_solar_data_function] Error:", str(e))
        import traceback
        traceback.print_exc()
        return https_fn.Response(
            f"Error processing request: {str(e)}",
            status=500,
        )
