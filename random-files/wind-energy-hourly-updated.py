import pandas as pd

# Constants for a hypothetical turbine
CUT_IN_SPEED = 0.00000000001  # in m/s
RATED_SPEED = 2.5  # in m/s
CUT_OUT_SPEED = 25.0  # in m/s
RATED_POWER = 2500  # in kW

# Function to calculate power output based on wind speed using a simple power curve model
def calculate_power_output(wind_speed):
    if wind_speed < CUT_IN_SPEED or wind_speed > CUT_OUT_SPEED:
        return 0
    elif wind_speed < RATED_SPEED:
        # Power output increases with the cube of wind speed up to the rated wind speed
        return RATED_POWER * ((wind_speed - CUT_IN_SPEED) / (RATED_SPEED - CUT_IN_SPEED)) ** 3
    else:
        # Power output is constant at the rated power above the rated wind speed
        return RATED_POWER

# CSV file data
file_path = "C:/Users/mosae/OneDrive/Desktop/weather_SU23_24.csv"
df = pd.read_csv(file_path)

# Convert wind speed to numeric, coercing errors to NaN, then drop rows with NaN
df['Wind_speed(km/h)'] = pd.to_numeric(df['Wind_speed(km/h)'], errors='coerce')
df.dropna(subset=['Wind_speed(km/h)'], inplace=True)

# Calculate and store the power output for each hour
hourly_power_output = []
for index, row in df.iterrows():
    # Convert wind speed from km/h to m/s
    wind_speed_m_s = row['Wind_speed(km/h)'] * (1000 / 3600)
    # Calculate power output for the hour
    power_output_kw = calculate_power_output(wind_speed_m_s)
    # Append the hourly power output to the list
    hourly_power_output.append((index, power_output_kw))

# Output the hourly power output
for hour, power in hourly_power_output:
    print(f"Hour: {hour}, Power Output: {power:.2f} kW")