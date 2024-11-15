import numpy as np
import pandas as pd

from Diesel3 import calculate_diesel_energy, fuel_consumption, generator_output, diesel_losses, time_intervals, sub_data_raw

from Load1 import load_values_from_csv, load_values_diesel, csv_file_path_diesel

from solar4 import calculate_solar_energy, panel_losses, panel_char, coef, STCIrr, STCTemp, sub_data_raw_solar, hours_100_solar

from Load import load_values_from_csv, load_values_solar, csv_file_path_solar


def calculate_net_energy_diesel(diesel_power, load_values_diesel, losses, time_intervals):
    losses = np.array(losses["loss_value"])
    net_power = diesel_power - load_values_diesel

    if np.isscalar(net_power):
        # Handle the case where net_power is a scalar
        time_difference = 0
    else:
        # Calculate net energy using Pandas cumulative sum
        net_power_series = pd.Series(net_power, index=time_intervals)
        if len(time_intervals) > 1:
            time_difference = (time_intervals.iloc[-1] - time_intervals.iloc[0]).total_seconds() / 3600
        else:
            time_difference = 0

    if time_difference == 0:
        net_energy = net_power
    else:
        net_energy = net_power_series.cumsum().iloc[-1] * time_difference.total_seconds() / 3600

    return net_energy

def calculate_net_energy_solar(solar_power, load_values_solar, time_interval):
    # Replace NaN values with zeros in both arrays
    solar_power = np.nan_to_num(solar_power)
    load_values_solar = np.nan_to_num(load_values_solar)

    # Calculate net power
    net_power = solar_power - load_values_solar

    # Integrate using trapezoidal rule
    net_energy = np.trapz(net_power, dx=time_interval)

    return net_energy


# Load diesel data with time intervals
data_raw = pd.read_csv("C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/malawi_gumbwa_health_post.csv", parse_dates=["DateTime"])
# Reduce data for the sake of the example
sub_data_raw_diesel = data_raw.head(100)

# Load solar data
solar_file_path = "C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/test_irr_data.csv"
solar_data_raw_solar = pd.read_csv(solar_file_path, parse_dates=["DateTime"])

# Extract relevant columns and calculate solar power
solar_data_raw_solar["Irradiance (W/m2)"] = pd.to_numeric(solar_data_raw_solar["Irradiance (W/m2)"], errors="coerce")
solar_data_raw_solar["Temp_C (oC)"] = pd.to_numeric(solar_data_raw_solar["Temp_C (oC)"], errors="coerce")


# Calculate diesel power for each time interval
diesel_power_full = [calculate_diesel_energy(fuel_consumption, generator_output, diesel_losses) for _ in range(len(time_intervals))]
diesel_power_full = np.array(diesel_power_full)

# Display results
result_df = pd.DataFrame({"DateTime": time_intervals, "Diesel Power": diesel_power_full})
print(result_df)

total_diesel_power = result_df['Diesel Power'].sum()

print("Total Diesel Power for All Hours:", total_diesel_power)

# Calculate solar power for the entire dataset
solar_power_full = calculate_solar_energy(solar_data_raw_solar["Irradiance (W/m2)"], solar_data_raw_solar["Temp_C (oC)"],
                                          panel_name_plate_W=680, losses=panel_losses["loss_value"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)

# Generate load profile data for the entire dataset
load_values_full_solar = load_values_from_csv(csv_file_path_solar)

#time_interval is the time difference between data points (in hours)
time_interval_full = 1  

# Calculate net energy for the entire dataset
net_energy_full_solar = calculate_net_energy_solar(solar_power_full, load_values_full_solar, time_interval_full)

net_solar_power_full = solar_power_full - load_values_full_solar

# Subset solar_power and load_values to the first 100 hours
solar_power_subset = solar_power_full[:100]
load_values_subset_solar = load_values_full_solar[:100]
sub_data_raw_diesel = sub_data_raw_diesel.dropna()
#sub_data_raw_solar = sub_data_raw_solar.dropna()

#time_interval is the time difference between data points (in hours)
time_interval_subset = 1  

# Calculate net energy for the first 100 hours
net_energy_subset_solar = calculate_net_energy_solar(solar_power_subset, load_values_subset_solar, time_interval_subset)

net_solar_power_subset = solar_power_subset - load_values_subset_solar
print("Net Energy (Full Dataset):", net_energy_full_solar)

# Subset diesel_power to the first 100 hours
diesel_power_subset = diesel_power_full[:100]


# Extract load values from the 'load_values' column
load_values_subset_diesel = sub_data_raw_diesel["load_values"].values

print("Load Values Subset:", load_values_subset_diesel)
 

# Calculate net energy for the sum of the first 100 hours
net_energy_subset_diesel = calculate_net_energy_diesel(np.sum(diesel_power_subset), np.sum(load_values_subset_diesel), diesel_losses, time_intervals)

# Calculate diesel power for each time interval
diesel_power_full = [calculate_diesel_energy(fuel_consumption, generator_output, diesel_losses) for _ in range(len(data_raw))]

# Ensure diesel_power_full is an iterable (e.g., NumPy array)
diesel_power_full = np.array(diesel_power_full)

# Extract load values from the 'load_values' column
load_values_full_diesel = data_raw["load_values"].values

# Calculate net diesel power
net_diesel_power_full = diesel_power_full - load_values_full_diesel
net_energy_full_diesel = calculate_net_energy_diesel(np.sum(diesel_power_full), np.sum(load_values_full_diesel), diesel_losses, time_intervals)

print("Diesel Power (First 100 Hours):", diesel_power_subset)
print("Diesel Power(Full Dataset):", np.sum(diesel_power_full))
print("Sum of Diesel Power (First 100 Hours):", np.sum(diesel_power_subset))
print("Net Energy Diesel (First 100 Hours):", net_energy_subset_diesel)
print("Net Diesel Energy (Full Dataset):", net_energy_full_diesel)
print("Sum of hours_100_solar:", np.sum(hours_100_solar))
print("Solar power(First 100 Hours):", np.sum(solar_power_subset))
print("Solar Power(Full Dataset)", np.sum(solar_power_full))
print("Net Solar Energy (First 100 Hours):", net_energy_subset_solar)
print("Net Solar Energy (Full Dataset):", net_energy_full_solar)
print("Load_values_diesel (First 100 Hours):", np.sum(load_values_subset_diesel))
print("Load_values_diesel (Full Dataset):", np.sum(load_values_full_diesel))
print("Load_values_solar (First 100 Hours):", np.sum(load_values_subset_solar))
print("Load_values_solar (Full Dataset):", np.sum(load_values_full_solar))