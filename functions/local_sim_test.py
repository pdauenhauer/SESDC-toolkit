"""Local, Firebase-free smoke test for the simulation engine.

Runs run_simulation() with synthetic one-year weather + a sample load, then
prints a readable summary so you can verify the financial model and degradation
changes without deploying or hitting the NLR API.

Usage (from the functions/ directory):
    python local_sim_test.py

This is a throwaway dev helper — safe to delete.
"""

import numpy as np
import pandas as pd

from simulation import run_simulation


def synthetic_year():
    n = 8760
    dt = pd.date_range("2020-01-01", periods=n, freq="h")
    hour = dt.hour
    # Daytime solar bell curve; mild seasonal temp/wind variation.
    irradiance = np.clip(np.sin((hour - 6) / 12 * np.pi), 0, 1) * 800
    return pd.DataFrame({
        "Datetime": dt.strftime("%m/%d/%Y %H:%M"),
        "Irradiance (W/m2)": irradiance,
        "Temp_C (oC)": 20 + 5 * np.sin(hour / 24 * 2 * np.pi),
        "Wind_speed(m/s)": 6 + 2 * np.sin(hour / 24 * 2 * np.pi),
    })


def main():
    df = synthetic_year()

    load = [3, 3, 3, 3, 4, 6, 8, 10, 9, 8, 7, 7,
            8, 8, 9, 10, 11, 12, 10, 8, 6, 5, 4, 3]

    solar = {"solar_array_size": 5000, "losses": [.1, .1, .08, .11, .05],
             "capex": 8000, "opex": 300, "lifespan": 10, "replacement_cost": 4000}
    battery = {"charge_capacity": 50, "maximum_storage": 200,
               "battery_type": "lithium-ion", "capex": 1000, "opex": 50,
               "lifespan": 10, "replacement_cost": 500}
    generator = {"capacity": 10000, "capex": 5000, "opex": 200, "lifespan": 10,
                 "replacement_cost": 2500, "fuel_price": 1.5}
    financial = {"inflation": 3.0, "labor_cost": 12000, "land_leasing_cost": 3000,
                 "licensing_cost": 2000, "other_capex": 1500, "energy_price": 0.15}

    out = run_simulation(
        df, load,
        using_solar=True, solar_inputs=solar,
        using_wind=False, wind_inputs=None,
        using_generator=True, generator_inputs=generator,
        using_battery=True, battery_inputs=battery,
        financial_inputs=financial,
    )

    print("\n=== Output tables produced ===")
    for key, val in out.items():
        rows = len(val.splitlines()) - 1 if val else 0
        print(f"  {key:<20} {'(empty)' if not val else f'{rows} rows'}")

    print("\n=== Financial expenses (first 2 years) ===")
    print("\n".join(out["financial_expenses"].splitlines()[:3]))

    print("\n=== Revenue (year 1 vs year 20) ===")
    rev = out["revenue"].splitlines()
    print(rev[0])
    print("  yr1: ", rev[1])
    print("  yr20:", rev[-1])

    print("\n=== Energy (year 1 vs year 20, kWh) ===")
    import io
    summary = pd.read_csv(io.StringIO(out["yearly_summary"]))
    cols = ["solar_kWh", "battery_discharge_kWh", "diesel_kWh", "unmet_kWh", "battery_usable_kWh"]
    print(summary.loc[[0, len(summary) - 1], ["year", *cols]].round(1).to_string(index=False))


if __name__ == "__main__":
    main()
