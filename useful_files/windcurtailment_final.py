import pandas as pd

# Constants for a hypothetical turbine
CUT_IN_SPEED = 0.00000000001  # in m/s
RATED_SPEED = 2.5  # in m/s
CUT_OUT_SPEED = 25.0  # in m/s
RATED_POWER = 2500  # in kW

class EnergyStorageSystem:
    def __init__(self, capacity):
        self.capacity = capacity
        self.min_storage = 0.4 * capacity  # Set min_storage to 40% of capacity
        self.storage = self.min_storage  # Initialize SoC to min SoC
        self.charging = False

    def charge(self, wind_energy):
        if self.storage < self.capacity:
            pre_charge_storage = self.storage
            self.storage = min(self.capacity, self.storage + wind_energy)
            curtailed_energy = wind_energy - (self.storage - pre_charge_storage)
        else:
            curtailed_energy = wind_energy  # When storage is full, all incoming energy is curtailed
        return curtailed_energy

    def discharge(self, demand):
        discharged_energy = 0
        if self.storage > self.min_storage:
            available_energy = self.storage - self.min_storage
            discharged_energy = min(demand, available_energy)
            self.storage -= discharged_energy
        return discharged_energy

# Function to calculate power output based on wind speed
def calculate_power_output(wind_speed):
    if wind_speed < CUT_IN_SPEED or wind_speed > CUT_OUT_SPEED:
        return 0
    elif wind_speed < RATED_SPEED:
        return RATED_POWER * ((wind_speed - CUT_IN_SPEED) / (RATED_SPEED - CUT_IN_SPEED)) ** 3
    else:
        return RATED_POWER

# Read CSV file for wind speeds
file_path = "C:/Users/mosae/OneDrive/Desktop/weather_SU23_24.csv"
df = pd.read_csv(file_path)

# Convert wind speeds from km/h to m/s, coercing errors to NaN
df['Wind_speed(m/s)'] = pd.to_numeric(df['Wind_speed(km/h)'], errors='coerce') * (1000 / 3600)
df.dropna(subset=['Wind_speed(m/s)'], inplace=True)

wind_speeds_m_s = df['Wind_speed(m/s)'].tolist()

# Assuming load_demand is defined or calculated elsewhere
load_demand = [350, 100, 300, 200, 20, 50, 50, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 50, 100, 200, 200]

ess = EnergyStorageSystem(capacity=200)

for hour, wind_speed in enumerate(wind_speeds_m_s, start=1):
    if hour > len(load_demand):  # Prevents index error if wind speed data exceeds load demand entries
        break
    wind_energy = calculate_power_output(wind_speed)
    surplus_energy = wind_energy - load_demand[hour - 1]
    curtailed_energy = ess.charge(surplus_energy) if surplus_energy > 0 else 0
    discharged_energy = ess.discharge(-surplus_energy) if surplus_energy < 0 else 0

    print(f"Hour {hour}: WindSpeed={wind_speed:.2f} m/s, WindEnergy={wind_energy:.2f} kW, Load={load_demand[hour - 1]:.2f} kW, SurplusEnergy={max(surplus_energy, 0):.2f} kW, DeficitEnergy={max(-surplus_energy - discharged_energy, 0):.2f} kW, Storage={ess.storage:.2f} kW, CurtailedEnergy={curtailed_energy:.2f} kW")
