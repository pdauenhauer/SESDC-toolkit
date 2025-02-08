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
CUT_IN_SPEED = 0.00000000001  # in m/s
RATED_SPEED = 2.5  # in m/s
CUT_OUT_SPEED = 25.0  # in m/s
RATED_POWER = 2500  # in W

# Diesel losses dictionary
diesel_losses = {
    "engine_efficiency": 0.85,
    "generator_efficiency": 0.90,
    "transmission_losses": 0.95,
    "converter": 0.98
}

class EnergyStorageSystem:
    def __init__(self, capacity):
        self.capacity = capacity
        self.min_storage = 0.4 * capacity  # Set min_storage to 40% of capacity
        self.storage = self.min_storage  # Initialize State of Charge (SoC) to min SoC
        self.charging = False  # Flag to indicate if the system is currently charging

    def charge(self, renewable_energy, diesel_energy):
        total_energy = renewable_energy + diesel_energy
        if not self.charging:  # If the system is not already charging
            self.storage = min(self.capacity, self.storage + total_energy)  # Add energy to storage
            if self.storage == self.capacity:  # If storage is fully charged
                self.charging = False  # Stop charging

    def discharge(self, demand):
        discharged_energy = 0
        if not self.charging:  # If the system is not currently charging
            discharged_energy = min(demand, self.storage - self.min_storage)  # Discharge energy from storage
            self.storage -= discharged_energy  # Update storage after discharge
        return discharged_energy


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


# Calculate net energy (solar - load)
def calculate_net_energy(solar_power, load_values, time_interval = 1):
    # solar_power: output of calculate_solar_energy()
    # load_values: extracted load values
    # time_interval: the time difference between data points (in hours), default is 1

    # Replace NaN values with zeros in both arrays
    solar_power = np.nan_to_num(solar_power)
    load_values = np.nan_to_num(load_values)

    # Calculate net power
    net_power = solar_power - load_values

    # Integrate using trapezoidal rule
    net_energy = np.trapz(net_power, dx=time_interval)

    return net_energy

# Calculate net energy for graph (solar + wind + diesel - load)
def net_energy_for_graph(solar_power, load_values, wind_values, diesel_values, time_interval = 1):
    # solar_power: output of calculate_solar_energy()
    # load_values: extracted load values
    # time_interval: the time difference between data points (in hours), default is 1

    # Replace NaN values with zeros in both arrays
    solar_power = np.nan_to_num(solar_power)
    load_values = np.nan_to_num(load_values)
    wind_values = np.nan_to_num(wind_values)
    wind_values = np.nan_to_num(diesel_values)

    # Calculate net power
    net_energy = solar_power + wind_values + diesel_values - load_values

    return net_energy


# Function to calculate power output based on wind speed
def calculate_power_output(wind_speed):
    if wind_speed < CUT_IN_SPEED or wind_speed > CUT_OUT_SPEED:
        return 0
    elif wind_speed < RATED_SPEED:
        # Power output increases with the cube of wind speed up to the rated wind speed
        return RATED_POWER * ((wind_speed - CUT_IN_SPEED) / (RATED_SPEED - CUT_IN_SPEED)) ** 3
    else:
        # Power output is constant at the rated power above the rated wind speed
        return RATED_POWER

# Function to calculate hourly wind energy
def calculate_hourly_wind_energy(data):
    hourly_energy = []
    for index, row in data.iterrows():
        wind_speed = row['Wind_speed(m/s)']
        energy_output = calculate_power_output(wind_speed)
        hourly_energy.append(energy_output)
    return hourly_energy


# Function to calculate diesel energy consumption
def calculate_diesel_energy(fuel_consumption, generator_output, losses):
    diesel_power = fuel_consumption * generator_output * np.prod(losses)
    return diesel_power

# Function to calculate hourly diesel energy consumption
def calculate_hourly_diesel_energy(data, losses):
    hourly_energy = []
    for _, row in data.iterrows():
        fuel_consumption = row["fuel_consumption"]
        generator_output = row["generator_output"]
        energy_output = calculate_diesel_energy(fuel_consumption, generator_output, losses)
        hourly_energy.append(energy_output)
    return hourly_energy
