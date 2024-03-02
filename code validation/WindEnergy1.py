import pandas as pd

# Constants for the wind turbine
CUT_IN_SPEED = 0.00000000001  # in m/s
RATED_SPEED = 2.5  # in m/s
CUT_OUT_SPEED = 25.0  # in m/s
RATED_POWER = 2500  # in W

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

# Load CSV file with wind data
file_path = "C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/malawi_gumbwa_health_post.csv"
wind_data = pd.read_csv(file_path)[:26]

# Ensure 'Wind_speed(km/h)' is numeric and drop NaN values
wind_data['Wind_speed(km/h)'] = pd.to_numeric(wind_data['Wind_speed(km/h)'], errors='coerce')
wind_data.dropna(subset=['Wind_speed(km/h)'], inplace=True)

# Convert wind speed from km/h to m/s
wind_data['Wind_speed(m/s)'] = wind_data['Wind_speed(km/h)'] * (1000 / 3600)

# Function to calculate hourly wind energy
def calculate_hourly_wind_energy(data):
    hourly_energy = []
    for index, row in data.iterrows():
        wind_speed = row['Wind_speed(m/s)']
        energy_output = calculate_power_output(wind_speed)
        hourly_energy.append(energy_output)
    return hourly_energy

# Calculate hourly wind energy
hourly_wind_energy = calculate_hourly_wind_energy(wind_data)

# Add hourly wind energy to the dataframe
wind_data['Hourly_Wind_Energy(Wh)'] = hourly_wind_energy

def print_hourly_wind_output(hourly_wind_energy):
    print("Hourly Wind Energy Output:")
    for i in range(len(hourly_wind_energy)):
        print(f"Hour {i + 1}: {hourly_wind_energy[i]} Wh")

# Print hourly wind energy
print_hourly_wind_output(hourly_wind_energy)


# Print the resulting dataframe with hourly wind energy as a string
#print(wind_data[['DateTime', 'Hourly_Wind_Energy(Wh)']].to_string(index=False))


# Print the resulting dataframe with hourly wind energy
#print(wind_data[['DateTime', 'Hourly_Wind_Energy(Wh)']])
