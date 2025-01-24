import pandas as pd

# Constants for a hypothetical turbine
CUT_IN_SPEED = 0.00000000001  # in m/s
RATED_SPEED = 2.5  # in m/s
CUT_OUT_SPEED = 25.0  # in m/s
RATED_POWER = 2500  # in kW

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

# Load CSV file
file_path = "C:/Users/mosae/OneDrive/Desktop/weather_SU23_24.csv"
df = pd.read_csv(file_path)

# Ensure 'Wind_speed(km/h)' is numeric and drop NaN values
df['Wind_speed(km/h)'] = pd.to_numeric(df['Wind_speed(km/h)'], errors='coerce')
df.dropna(subset=['Wind_speed(km/h)'], inplace=True)

# Convert wind speed from km/h to m/s
df['Wind_speed(m/s)'] = df['Wind_speed(km/h)'] * (1000 / 3600)

# Calculate power output for each hour
df['Hourly_Power_Output(kW)'] = df['Wind_speed(m/s)'].apply(calculate_power_output)

# Calculate net energy for every 100 hours
for start_hour in range(0, len(df), 100):
    end_hour = start_hour + 100
    net_energy_100h = df['Hourly_Power_Output(kW)'][start_hour:end_hour].sum()
    print(f"Net Energy from Hour {start_hour} to Hour {end_hour}: {net_energy_100h:.2f} kWh")

# Calculate the total net energy in kWh
net_energy_kWh = df['Hourly_Power_Output(kW)'].sum()

print(f"Total Net Energy Produced: {net_energy_kWh:.2f} kWh")
