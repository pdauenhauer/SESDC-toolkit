"""Run energy-system simulation and return dict of CSV strings (lazy heavy imports)."""

from utils import safe_float, safe_int


def run_simulation(
    nrl_df,
    load_list,
    using_solar, solar_inputs,
    using_wind, wind_inputs,
    using_generator, generator_inputs,
    using_battery, battery_inputs,
    financial_inputs,
):
    """Run the full energy-system simulation and return a dict of CSV strings.

    Keys in the returned dict (any may be None when not applicable):
        input_data            - raw NRL + load data
        hourly_simulation     - per-timestep simulation results
        daily_averages        - daily-averaged values
        twenty_year_daily     - 20-year daily load-serviced projection
        financial_expenses    - 20-year CAPEX/OPEX breakdown
        revenue               - 20-year revenue projection
        solar_heatmap         - 365x24 hourly solar matrix
        monthly_heatmap       - 12x31 avg-daily solar matrix
    """
    import io
    import numpy as np
    import pandas as pd
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

    def _df_to_csv(df: pd.DataFrame) -> str:
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        return buf.getvalue()

    n_rows = len(nrl_df)
    time_points = np.arange(n_rows)

    if load_list and len(load_list) > 0:
        repeats_needed = (n_rows // len(load_list)) + 1
        repeated = (load_list * repeats_needed)[:n_rows]
    else:
        repeated = [0] * n_rows
    load_values = np.array(repeated, dtype=float)

    solar_power = np.zeros(n_rows)
    if using_solar and solar_inputs:
        raw = calculate_hourly_solar_energy(
            nrl_df,
            solar_inputs["solar_array_size"],
            solar_inputs["losses"],
            coef, STCIrr, STCTemp,
        )
        solar_power = np.array(raw, dtype=float) / 1000.0
        print("[run_simulation] Solar done, total kWh=", np.sum(solar_power))

    wind_power = np.zeros(n_rows)
    if using_wind and wind_inputs:
        raw = calculate_hourly_wind_energy(
            nrl_df,
            wind_inputs["nameplate_capacity"],
            wind_inputs["rated_power"],
            wind_inputs["cut_in_speed"],
            wind_inputs["rated_speed"],
            wind_inputs["cut_out_speed"],
        )
        wind_power = np.array(raw, dtype=float) / 1000.0
        print("[run_simulation] Wind done, total kWh=", np.sum(wind_power))

    diesel_power = np.zeros(n_rows)
    if using_generator and generator_inputs:
        gen_capacity = safe_float(generator_inputs.get("capacity"))
        loss_vals = list(diesel_losses.values())
        max_output_kw = (gen_capacity * np.prod(loss_vals)) / 1000.0
        for i in range(n_rows):
            deficit = load_values[i] - solar_power[i] - wind_power[i]
            if deficit > 0:
                diesel_power[i] = min(deficit, max_output_kw)
        print("[run_simulation] Diesel done, total kWh=", np.sum(diesel_power))

    net_energy = net_energy_for_graph(solar_power, load_values, wind_power, diesel_power)

    battery_soc = np.zeros(n_rows)
    load_not_serviced = np.zeros(n_rows)
    if using_battery and battery_inputs:
        batt = EnergyStorageSystem(
            capacity=safe_float(battery_inputs.get("charge_capacity")),
            max_storage=safe_float(battery_inputs.get("maximum_storage")),
            battery_type=battery_inputs.get("battery_type", "lithium-ion"),
        )
        battery_soc = np.array(calculate_net_energy(batt, net_energy.tolist()))
        load_not_serviced = np.array(calc_load_not_serviced(
            time_points, battery_soc,
            battery_inputs.get("battery_type", "lithium-ion"),
            safe_float(battery_inputs.get("maximum_storage")),
            net_energy,
        ))
        print("[run_simulation] Battery done")

    hourly_load_serviced = load_values - load_not_serviced

    csvs: dict[str, str | None] = {}

    input_df = nrl_df.copy()
    input_df["load_values"] = load_values
    csvs["input_data"] = _df_to_csv(input_df)

    hourly_df = pd.DataFrame({
        "Datetime": nrl_df["Datetime"].values,
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

    inflation_raw = safe_float(financial_inputs.get("inflation", 3.0), 3.0)
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
                safe_float(battery_inputs.get("capex")),
                safe_float(battery_inputs.get("opex")),
                safe_float(battery_inputs.get("replacement_cost")),
                safe_int(battery_inputs.get("lifespan")),
            )
        if using_generator and generator_inputs:
            generator_exp = calculate_20_year_expenses(
                inflation_rate,
                safe_float(generator_inputs.get("capex")),
                safe_float(generator_inputs.get("opex")),
                safe_float(generator_inputs.get("replacement_cost")),
                safe_int(generator_inputs.get("lifespan")),
            )
        if using_solar and solar_inputs:
            solar_exp = calculate_20_year_expenses(
                inflation_rate,
                safe_float(solar_inputs.get("capex")),
                safe_float(solar_inputs.get("opex")),
                safe_float(solar_inputs.get("replacement_cost")),
                safe_int(solar_inputs.get("lifespan")),
            )
        if using_wind and wind_inputs:
            wind_exp = calculate_20_year_expenses(
                inflation_rate,
                safe_float(wind_inputs.get("capex")),
                safe_float(wind_inputs.get("opex")),
                safe_float(wind_inputs.get("replacement_cost")),
                safe_int(wind_inputs.get("lifespan")),
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

    try:
        energy_price = safe_float(financial_inputs.get("energy_price", 0.15), 0.15)
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
