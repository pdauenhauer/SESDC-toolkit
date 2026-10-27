"""Run energy-system simulation and return dict of CSV strings (lazy heavy imports)."""

from utils import safe_float, safe_int

YEARS = 20


def hourly_year_key(year_index):
    """CSV key for a simulated year (0-based). Year 1 keeps the original key."""
    return "hourly_simulation" if year_index == 0 else f"hourly_year_{year_index + 1:02d}"


def run_simulation(
    nlr_df,
    load_list,
    using_solar, solar_inputs,
    using_wind, wind_inputs,
    using_generator, generator_inputs,
    using_battery, battery_inputs,
    financial_inputs,
):
    """Run the full energy-system simulation and return a dict of CSV strings.

    The weather dataset is one typical year. Every one of the 20 project years
    is dispatched hour by hour with the same load and weather, but with solar
    output and battery capacity worn down by their annual degradation (reset
    when the asset is replaced at the end of its lifespan).

    Keys in the returned dict (any may be None when not applicable):
        input_data            - raw NLR + load data
        hourly_simulation     - per-timestep results for year 1
        hourly_year_02 … 20   - per-timestep results for years 2–20
        yearly_summary        - one row of energy totals per year
        daily_averages        - daily-averaged values (year 1)
        twenty_year_daily     - daily load served across all 20 years
        financial_expenses    - 20-year CAPEX/OPEX breakdown
        revenue               - 20-year revenue
        solar_heatmap         - 365x24 hourly solar matrix (year 1)
        monthly_heatmap       - 12x31 avg-daily solar matrix (year 1)
    """
    import io
    import numpy as np
    import pandas as pd
    from calculations import (
        calculate_hourly_solar_energy,
        calculate_hourly_wind_energy,
        net_energy_for_graph,
        calc_daily_energy,
        calculate_20_year_expenses,
        calculate_recurring_cost,
        calculate_fuel_cost_stream,
        compute_yearly_revenue,
        dispatch_year,
        degradation_factor,
        generator_max_output_kw,
        BATTERY_MIN_SOC_FRACTION,
        BATTERY_MIN_SOC_DEFAULT,
        BATTERY_DEGRADATION_PER_YEAR,
        SOLAR_DEGRADATION_PER_YEAR,
        DIESEL_LITERS_PER_KWH,
        STCIrr,
        STCTemp,
        coef,
    )

    def _df_to_csv(df: pd.DataFrame) -> str:
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        return buf.getvalue()

    n_rows = len(nlr_df)

    if load_list and len(load_list) > 0:
        repeats_needed = (n_rows // len(load_list)) + 1
        repeated = (load_list * repeats_needed)[:n_rows]
    else:
        repeated = [0] * n_rows
    load_values = np.array(repeated, dtype=float)

    solar_base = np.zeros(n_rows)
    if using_solar and solar_inputs:
        raw = calculate_hourly_solar_energy(
            nlr_df,
            solar_inputs["solar_array_size"],
            solar_inputs["losses"],
            coef, STCIrr, STCTemp,
        )
        solar_base = np.nan_to_num(np.array(raw, dtype=float) / 1000.0)
        print("[run_simulation] Solar done, year-1 kWh=", np.sum(solar_base))

    wind_power = np.zeros(n_rows)
    if using_wind and wind_inputs:
        raw = calculate_hourly_wind_energy(
            nlr_df,
            wind_inputs["nameplate_capacity"],
            wind_inputs["rated_power"],
            wind_inputs["cut_in_speed"],
            wind_inputs["rated_speed"],
            wind_inputs["cut_out_speed"],
        )
        wind_power = np.nan_to_num(np.array(raw, dtype=float) / 1000.0)
        print("[run_simulation] Wind done, kWh=", np.sum(wind_power))

    gen_max_kw = 0.0
    if using_generator and generator_inputs:
        gen_max_kw = generator_max_output_kw(safe_float(generator_inputs.get("capacity")))

    battery_kwh = 0.0
    battery_cfg = None
    if using_battery and battery_inputs:
        battery_kwh = safe_float(battery_inputs.get("maximum_storage"))
        battery_type = str(battery_inputs.get("battery_type", "lithium-ion")).lower()
        battery_cfg = {
            "min_frac": BATTERY_MIN_SOC_FRACTION.get(battery_type, BATTERY_MIN_SOC_DEFAULT),
            "rate_kw": safe_float(battery_inputs.get("charge_capacity")),
        }

    solar_life = safe_int(solar_inputs.get("lifespan")) if solar_inputs else 0
    battery_life = safe_int(battery_inputs.get("lifespan")) if battery_inputs else 0

    csvs: dict[str, str | None] = {}

    input_df = nlr_df.copy()
    input_df["load_values"] = load_values
    csvs["input_data"] = _df_to_csv(input_df)

    # ---- Dispatch every project year -------------------------------------
    summary_rows = []
    daily_served_by_year = []
    year1 = None
    soc = None
    trim = (n_rows // 24) * 24
    for year in range(YEARS):
        solar_factor = degradation_factor(SOLAR_DEGRADATION_PER_YEAR, year, solar_life)
        solar_power = solar_base * solar_factor
        battery_year = None
        if battery_cfg:
            usable = battery_kwh * degradation_factor(BATTERY_DEGRADATION_PER_YEAR, year, battery_life)
            battery_year = {**battery_cfg, "max_kwh": usable}

        # State of charge carries over between years (dispatch_year clamps it to the new capacity).
        d = dispatch_year(load_values, solar_power, wind_power, gen_max_kw, battery_year, soc)
        soc = d["soc_end"]
        served = load_values - d["unmet"]
        net_energy = net_energy_for_graph(solar_power, load_values, wind_power, d["diesel"])

        hourly_df = pd.DataFrame({
            "Datetime": nlr_df["Datetime"].values,
            "load_kW": load_values,
            "solar_kW": solar_power,
            "wind_kW": wind_power,
            "diesel_kW": d["diesel"],
            "net_energy_kW": net_energy,
            "battery_soc_kWh": d["battery_soc"],
            "battery_discharge_kW": d["battery_discharge"],
            "load_not_serviced_kW": d["unmet"],
            "load_serviced_kW": served,
            "excess_kW": d["excess"],
        })
        # 0.1 W resolution is plenty and keeps the 20 hourly tables small.
        csvs[hourly_year_key(year)] = _df_to_csv(hourly_df.round(4))

        diesel_kwh = float(np.sum(d["diesel"]))
        summary_rows.append({
            "year": year + 1,
            "load_kWh": float(np.sum(load_values)),
            "solar_kWh": float(np.sum(solar_power)),
            "wind_kWh": float(np.sum(wind_power)),
            "battery_discharge_kWh": float(np.sum(d["battery_discharge"])),
            "diesel_kWh": diesel_kwh,
            "unmet_kWh": float(np.sum(d["unmet"])),
            "served_kWh": float(np.sum(served)),
            "excess_kWh": float(np.sum(d["excess"])),
            "fuel_liters": diesel_kwh * DIESEL_LITERS_PER_KWH,
            "battery_usable_kWh": battery_year["max_kwh"] if battery_year else 0.0,
            "solar_output_factor": solar_factor,
        })
        daily_served_by_year.append(calc_daily_energy(0, served[:trim].tolist()))
        if year == 0:
            year1 = {"solar": solar_power, "diesel": d["diesel"], "net": net_energy, "unmet": d["unmet"], "served": served}

    summary_df = pd.DataFrame(summary_rows)
    csvs["yearly_summary"] = _df_to_csv(summary_df)
    print("[run_simulation] Dispatched", YEARS, "years; unmet kWh y1/y20 =",
          round(summary_rows[0]["unmet_kWh"]), "/", round(summary_rows[-1]["unmet_kWh"]))

    # ---- Year-1 daily averages + heatmaps ---------------------------------
    daily_solar = None
    try:
        daily_load = calc_daily_energy(0, load_values[:trim].tolist())
        daily_solar = calc_daily_energy(0, year1["solar"][:trim].tolist())
        daily_df = pd.DataFrame({
            "day": np.arange(len(daily_load)),
            "avg_load_kW": daily_load,
            "avg_solar_kW": daily_solar,
            "avg_wind_kW": calc_daily_energy(0, wind_power[:trim].tolist()),
            "avg_diesel_kW": calc_daily_energy(0, year1["diesel"][:trim].tolist()),
            "avg_net_kW": calc_daily_energy(0, year1["net"][:trim].tolist()),
            "avg_load_serviced_kW": daily_served_by_year[0],
            "avg_load_not_serviced_kW": calc_daily_energy(0, year1["unmet"][:trim].tolist()),
        })
        csvs["daily_averages"] = _df_to_csv(daily_df)
    except Exception as e:
        print("[run_simulation] daily_averages error:", str(e))
        csvs["daily_averages"] = None

    try:
        ls_20yr = [v for year_days in daily_served_by_year for v in year_days]
        csvs["twenty_year_daily"] = _df_to_csv(pd.DataFrame({
            "day": np.arange(len(ls_20yr)),
            "load_serviced_kW": ls_20yr,
        }))
    except Exception as e:
        print("[run_simulation] twenty_year_daily error:", str(e))
        csvs["twenty_year_daily"] = None

    # ---- Financials --------------------------------------------------------
    inflation_raw = safe_float(financial_inputs.get("inflation", 3.0), 3.0)
    inflation_rate = inflation_raw / 100.0 if inflation_raw > 1 else inflation_raw
    try:
        zeros = np.zeros(YEARS)

        def _component(inputs, enabled):
            if not (enabled and inputs):
                return zeros.copy()
            return calculate_20_year_expenses(
                inflation_rate,
                safe_float(inputs.get("capex")),
                safe_float(inputs.get("opex")),
                safe_float(inputs.get("replacement_cost")),
                safe_int(inputs.get("lifespan")),
            )

        battery_exp = _component(battery_inputs, using_battery)
        generator_exp = _component(generator_inputs, using_generator)
        solar_exp = _component(solar_inputs, using_solar)
        wind_exp = _component(wind_inputs, using_wind)

        # Generator fuel: each year's own diesel energy, converted to liters, inflating.
        fuel_exp = zeros.copy()
        if using_generator and generator_inputs:
            fuel_price = safe_float(generator_inputs.get("fuel_price"))
            if fuel_price > 0:
                fuel_exp = calculate_fuel_cost_stream(
                    inflation_rate, list(summary_df["diesel_kWh"]), fuel_price,
                )

        # Project-level fixed costs: licensing + other CAPEX up front, labor and
        # land lease as inflating annual operating costs.
        fixed_capex = (
            safe_float(financial_inputs.get("licensing_cost"))
            + safe_float(financial_inputs.get("other_capex"))
        )
        annual_fixed = (
            safe_float(financial_inputs.get("labor_cost"))
            + safe_float(financial_inputs.get("land_leasing_cost"))
        )
        fixed_exp = calculate_recurring_cost(inflation_rate, annual_fixed, fixed_capex)

        total_exp = battery_exp + generator_exp + solar_exp + wind_exp + fuel_exp + fixed_exp
        fin_df = pd.DataFrame({
            "year": np.arange(YEARS),
            "battery_expenses": battery_exp,
            "generator_expenses": generator_exp,
            "solar_expenses": solar_exp,
            "wind_expenses": wind_exp,
            "fuel_expenses": fuel_exp,
            "fixed_expenses": fixed_exp,
            "total_expenses": total_exp,
            "cumulative_expenses": np.cumsum(total_exp),
        })
        csvs["financial_expenses"] = _df_to_csv(fin_df)
    except Exception as e:
        print("[run_simulation] financial_expenses error:", str(e))
        csvs["financial_expenses"] = None

    try:
        energy_price = safe_float(financial_inputs.get("energy_price", 0.15), 0.15)
        if energy_price > 0:
            revenue_yearly = compute_yearly_revenue(list(summary_df["served_kWh"]), energy_price, inflation_raw)
            csvs["revenue"] = _df_to_csv(pd.DataFrame({
                "year": np.arange(len(revenue_yearly)),
                "annual_revenue": revenue_yearly,
                "cumulative_revenue": np.cumsum(revenue_yearly),
            }))
        else:
            csvs["revenue"] = None
    except Exception as e:
        print("[run_simulation] revenue error:", str(e))
        csvs["revenue"] = None

    solar_power = year1["solar"]
    if using_solar and len(solar_power) >= 8760:
        try:
            reshaped = solar_power[:8760].reshape((365, 24))
            hm_df = pd.DataFrame(reshaped, columns=[f"hour_{h}" for h in range(24)])
            hm_df.insert(0, "day", np.arange(365))
            csvs["solar_heatmap"] = _df_to_csv(hm_df)
        except Exception as e:
            print("[run_simulation] solar_heatmap error:", str(e))
            csvs["solar_heatmap"] = None
    else:
        csvs["solar_heatmap"] = None

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
        except Exception as e:
            print("[run_simulation] monthly_heatmap error:", str(e))
            csvs["monthly_heatmap"] = None
    else:
        csvs["monthly_heatmap"] = None

    return csvs
