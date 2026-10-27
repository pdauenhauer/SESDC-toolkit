import pandas as pd
import numpy as np

# Global solar variables
ross_coef = 0.0563
#temperature coefficient used to adjust the ambient temperature to the equivalent cell temperature in a solar panel.
STCIrr = 1000
#Standard Test Conditions Irradiance
STCTemp = 25
#Standard Test Conditions Temperature

#panel_losses
panel_losses = {"loss_type": ["wire_losses", "Module_mismatch", "Module_Aging", "Dust/Dirt", "converter"],
                "loss_value": [0.1, 0.1, 0.08, 0.11, 0.05]}

# list that contains characteristics or specifications related to a solar panel. 
panel_char = [680, 17.363, 4.607, 21.427, 4.921]
panel_coef = [0.06, -0.33, -0.45]
coef = panel_coef[2]

# Constants for the wind turbine
#CUT_IN_SPEED = 0.00000000001  # in m/s
#RATED_SPEED = 2.5  # in m/s
#CUT_OUT_SPEED = 25.0  # in m/s
#RATED_POWER = 2500  # in W

# Diesel losses dictionary
diesel_losses = {
    "engine_efficiency": 0.85,
    "generator_efficiency": 0.90,
    "transmission_losses": 0.95,
    "converter": 0.98
}

# Approximate diesel fuel consumption per kWh of electrical output (liters/kWh).
# Typical gensets burn ~0.28-0.33 L/kWh near rated load; 0.30 is a reasonable default.
DIESEL_LITERS_PER_KWH = 0.30

# Annual performance degradation of renewable assets. Each asset's age resets
# when it is replaced at the end of its lifespan.
SOLAR_DEGRADATION_PER_YEAR = 0.005   # ~0.5%/yr panel output decline (industry standard)
BATTERY_DEGRADATION_PER_YEAR = 0.015  # ~1.5%/yr effective usable-capacity fade

# Minimum state of charge as a fraction of usable capacity.
BATTERY_MIN_SOC_FRACTION = {"lithium-ion": 0.1}
BATTERY_MIN_SOC_DEFAULT = 0.5  # lead-acid and anything else


def generator_max_output_kw(capacity_w):
    """Usable generator output (kW) after engine/alternator/transmission/converter losses."""
    return capacity_w * float(np.prod(list(diesel_losses.values()))) / 1000.0


def asset_age(year, lifespan):
    """Years since the asset was installed or last replaced (replacement every `lifespan` years)."""
    return year % lifespan if lifespan and lifespan > 0 else year


def degradation_factor(rate, year, lifespan):
    """Remaining performance fraction in `year` (0-based), resetting at each replacement."""
    return (1.0 - rate) ** asset_age(year, lifespan)


def dispatch_year(load, solar, wind, gen_max_kw=0.0, battery=None, soc_start=None):
    """Hour-by-hour energy dispatch for one year.

    See docs/decisions/0003-backend-owns-dispatch.md. The frontend's Typical
    day estimate (frontend/src/components/workbench/model.ts) mirrors this
    order and must be changed together with it.

    Order each hour:
      1. Solar and wind serve the load directly.
      2. Any renewable surplus charges the battery (limited by its kW rate and
         free capacity); the remainder is `excess` (curtailed).
      3. Any deficit is drawn from the battery (limited by its kW rate and its
         minimum state of charge).
      4. The generator covers what is still missing, up to `gen_max_kw`.
      5. Whatever is left is `unmet`.

    `battery` is None or {"max_kwh", "min_frac", "rate_kw"}. `soc_start` carries
    the state of charge in from the previous year (defaults to the minimum).
    Returns a dict of numpy arrays plus `soc_end`.
    """
    load = np.nan_to_num(np.asarray(load, dtype=float))
    solar = np.nan_to_num(np.asarray(solar, dtype=float))
    wind = np.nan_to_num(np.asarray(wind, dtype=float))
    n = len(load)

    diesel = np.zeros(n)
    soc_arr = np.zeros(n)
    charge = np.zeros(n)
    discharge = np.zeros(n)
    unmet = np.zeros(n)
    excess = np.zeros(n)

    has_battery = bool(battery) and battery.get("max_kwh", 0) > 0
    max_kwh = float(battery["max_kwh"]) if has_battery else 0.0
    min_kwh = max_kwh * float(battery.get("min_frac", BATTERY_MIN_SOC_DEFAULT)) if has_battery else 0.0
    rate = float(battery.get("rate_kw", 0)) if has_battery else 0.0
    soc = min_kwh if soc_start is None else min(max(float(soc_start), min_kwh), max_kwh)
    gen_max = max(0.0, float(gen_max_kw or 0.0))

    for i in range(n):
        need = max(0.0, load[i])
        renew = max(0.0, solar[i]) + max(0.0, wind[i])
        direct = min(need, renew)
        deficit = need - direct
        surplus = renew - direct

        if surplus > 0:
            stored = min(surplus, rate, max_kwh - soc) if has_battery else 0.0
            stored = max(0.0, stored)
            soc += stored
            charge[i] = stored
            excess[i] = surplus - stored
        elif deficit > 0 and has_battery:
            drawn = max(0.0, min(deficit, rate, soc - min_kwh))
            soc -= drawn
            discharge[i] = drawn
            deficit -= drawn

        if deficit > 0 and gen_max > 0:
            diesel[i] = min(deficit, gen_max)
            deficit -= diesel[i]

        unmet[i] = deficit
        soc_arr[i] = soc

    return {
        "diesel": diesel,
        "battery_soc": soc_arr,
        "battery_charge": charge,
        "battery_discharge": discharge,
        "unmet": unmet,
        "excess": excess,
        "soc_end": soc,
    }

"""
class SolarPanel:
    def __init__(self, solar_panel_inputs):
        self.losses = solar_panel_inputs[0]
        self.solar_array_size = solar_panel_inputs[1]

class WindTurbine:
    def __init__(self, wind_turbine_inputs):
        self.nameplate_capacity = wind_turbine_inputs[0]
"""

#Process the CSV file
def process_csv(file):
    df = pd.read_csv(file, parse_dates=["Datetime"])
    if "Irradiance (W/m2)" not in df.columns or "Temp_C (oC)" not in df.columns:
        raise ValueError("CSV must contain 'Irradiance (W/m2)' and 'Temp_C (oC)' columns")

    return df


def calculate_hourly_solar_energy(data, panel_name_plate_W, losses, coef, STCIrr, STCTemp):
    hourly_energy = []
    for index, row in data.iterrows():
        irradiance = row["Irradiance (W/m2)"]
        ambient_temp_C = row["Temp_C (oC)"]
        energy_output = calculate_solar_energy(irradiance, ambient_temp_C, panel_name_plate_W, losses, coef, STCIrr, STCTemp)
        hourly_energy.append(energy_output)
    return hourly_energy


# Calculate total solar energy
def calculate_solar_energy(irradiance, ambient_temp_C, panel_name_plate_W, losses, coef, STCIrr, STCTemp):
    ambient_temp_C_adj = ambient_temp_C + (ross_coef * irradiance)

    # Convert losses to a NumPy array
    losses = np.array(losses)
    p_out = (irradiance / STCIrr) * (panel_name_plate_W + (panel_name_plate_W * (coef / 100) * (ambient_temp_C_adj - STCTemp))) * np.prod(1 - losses)

    return p_out


# Calculate net energy for graph (solar + wind + diesel - load)
def net_energy_for_graph(solar_power, load_values, wind_values, diesel_values, time_interval = 1):
    # solar_power: output of calculate_solar_energy()
    # load_values: extracted load values
    # time_interval: the time difference between data points (in hours), default is 1

    # Replace NaN values with zeros in both arrays
    solar_power = np.nan_to_num(solar_power)
    load_values = np.nan_to_num(load_values)
    wind_values = np.nan_to_num(wind_values)

    # Calculate net power
    net_energy = solar_power + wind_values + diesel_values - load_values

    return net_energy


# Function to calculate power output based on wind speed, returns WATTS?
def calculate_power_output(wind_speed, rated_power, cut_in, rated_speed, cut_out):
    if wind_speed < cut_in or wind_speed > cut_out:
        return 0
    elif wind_speed < rated_speed:
        # Power output increases with the cube of wind speed up to the rated wind speed
        return rated_power * ((wind_speed - cut_in) / (rated_speed - cut_in)) ** 3
    else:
        # Power output is constant at the rated power above the rated wind speed
        return rated_power

# Function to calculate hourly wind energy
def calculate_hourly_wind_energy(data, num_turbine, rated_power, cut_in_speed, rated_speed, cut_out_speed):
    hourly_energy = []
    for index, row in data.iterrows():
        wind_speed = row['Wind_speed(m/s)']
        energy_output = calculate_power_output(wind_speed, rated_power, cut_in_speed, rated_speed, cut_out_speed) * num_turbine
        hourly_energy.append(energy_output)
    return hourly_energy


# Function to calculate diesel energy in Watts
def calculate_diesel_energy(fuel_consumption, generator_output, losses):
    diesel_power = fuel_consumption * generator_output * np.prod(losses)
    return diesel_power

# Function to calculate hourly diesel energy consumption
def calculate_hourly_diesel_energy(fuel_consumption, generator_output, losses):
    hourly_energy = []
    for i in range(len(fuel_consumption)):
        #fuel_consumption = row["fuel_consumption"]
        #generator_output = row["generator_output"]
        energy_output = calculate_diesel_energy(fuel_consumption[i], generator_output, losses)
        hourly_energy.append(energy_output)
    return hourly_energy


#calculate daily load serviced
def calc_daily_load_serviced(days, load_hourly, loadNotServiced):
    loadserviced = [0] * len(days)
    for i in range(len(days)):
        loadserviced[i] = load_hourly[i] - loadNotServiced[i]

    
    # so load serviced = load - loadnotserviced
    return loadserviced

def calculate_daily_load(energy_subset_day):
    return sum(energy_subset_day)

def calc_daily_energy(lengthOfTime, energy_subset_hourly):
    #averages the daily energy production/use for graphing
    total_hours = len(energy_subset_hourly)
    if total_hours % 24 != 0:
        raise ValueError(f"Must have a multiple of 24 hourly values; got {total_hours}")


    num_days = total_hours // 24
    daily_loads = [0] * num_days

    for day in range(num_days):
        start = day * 24
        end   = start + 24      # take exactly 24 points
        subset_day = energy_subset_hourly[start:end]
        daily_loads[day] = calculate_daily_load(subset_day) / 24

     
    
    #repeat the year 20 times
    #for j in range(1, 20):
    #    start_addr = j * 365
    #    end_addr = start_addr + 365
    #    dailyLoad20years[start_addr, end_addr] = dailyLoad20years[0, 365]
    
    return daily_loads

def calculate_20_year_expenses(inflation_rate, capex, opex, replacement_cost, lifespan, years=20):
    """
    Calculate the total expenses over 20 years considering inflation.
    """
    expenses = np.zeros(years)
    expenses[0] = capex  # Initial investment at year 0
    for year in range(years):
        expenses[year] += opex  # OPEX every year
        # Add replacement cost at the correct years (not year 0)
        if lifespan and year > 0 and year % lifespan == 0:
            inflated_replacement = replacement_cost * ((1 + inflation_rate) ** year)
            expenses[year] += inflated_replacement
    return expenses

def calculate_recurring_cost(inflation_rate, annual_cost, capex=0.0, years=20):
    """One-time CAPEX at year 0 plus an annually-inflating operating cost.

    Used for project-level fixed costs (labor, land lease, licensing, other
    CAPEX) and for generator fuel, none of which are tied to a single component's
    replacement cycle.
    """
    stream = np.zeros(years)
    if capex:
        stream[0] += capex
    for year in range(years):
        stream[year] += annual_cost * ((1 + inflation_rate) ** year)
    return stream


def calculate_fuel_cost_stream(inflation_rate, annual_diesel_kwh, fuel_price,
                               liters_per_kwh=DIESEL_LITERS_PER_KWH, years=20):
    """Annual diesel fuel cost over the horizon, inflating each year.

    `annual_diesel_kwh` is either one number (same every year) or a per-year
    sequence. `fuel_price` is in $/liter; diesel energy is converted to liters
    via `liters_per_kwh`.
    """
    per_year = (
        list(annual_diesel_kwh) if np.ndim(annual_diesel_kwh) else [annual_diesel_kwh] * years
    )
    return np.array([
        float(per_year[year]) * liters_per_kwh * fuel_price * ((1 + inflation_rate) ** year)
        for year in range(min(years, len(per_year)))
    ])


# Revenue Calculation Helper Functions
def compute_annual_energy(daily_values):
    return float(np.sum(daily_values) * 24.0)

def normalize_inflation(inflation_raw):
    """
    Normalize the inflation rate to a decimal value.
    """
    value = float(inflation_raw)
    return value / 100.0 if value > 1 else value

def compute_yearly_revenue(served_kwh_by_year, price_per_kwh, inflation):
    """Revenue per year from each simulated year's energy served.

    The nominal sale price rises with inflation; the physical energy comes from
    that year's own dispatch (so equipment wear and replacements show up).
    """
    price = float(price_per_kwh)
    inflation_rate = normalize_inflation(inflation)
    return [
        float(kwh) * price * ((1 + inflation_rate) ** year)
        for year, kwh in enumerate(served_kwh_by_year)
    ]
