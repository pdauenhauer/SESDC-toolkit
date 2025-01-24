import numpy as np
import pandas as pd

diesel_losses = {"loss_type": ["engine_efficiency", "generator_efficiency", "transmission_losses", "converter"],
                 "loss_value": [0.85, 0.90, 0.95, 0.98]}


def calculate_diesel_energy(fuel_consumption, generator_output, losses):
    losses = np.array(losses["loss_value"])
    diesel_power = fuel_consumption * generator_output * np.prod(losses)
    return diesel_power


def calculate_net_energy_diesel(diesel_power, load_values, losses, time_intervals):
    losses = np.array(losses["loss_value"])
    net_power = diesel_power - load_values

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


# Load data with time intervals
data_raw = pd.read_csv("C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/malawi_gumbwa_health_post.csv", parse_dates=["DateTime"])

# Reduce data for the sake of the example
sub_data_raw = data_raw.head(100)

# Use 'DateTime' column as time intervals
time_intervals = data_raw["DateTime"]

# Diesel parameters
fuel_consumption = 5  # liters per hour
generator_output = 5  # kW

# Calculate diesel power for each time interval
diesel_power_full = [calculate_diesel_energy(fuel_consumption, generator_output, diesel_losses) for _ in range(len(time_intervals))]
diesel_power_full = np.array(diesel_power_full)

# Display results
result_df = pd.DataFrame({"DateTime": time_intervals, "Diesel Power": diesel_power_full})
print(result_df)

total_diesel_power = result_df['Diesel Power'].sum()

print("Total Diesel Power for All Hours:", total_diesel_power)

# Subset diesel_power to the first 100 hours
diesel_power_subset = diesel_power_full[:100]


# Extract load values from the 'load_values' column
load_values_subset = sub_data_raw["load_values"].values

print("Load Values Subset:", load_values_subset)

# Calculate net energy for the sum of the first 100 hours
net_energy_subset = calculate_net_energy_diesel(np.sum(diesel_power_subset), np.sum(load_values_subset), diesel_losses, time_intervals)

print("Diesel Power (First 100 Hours):", diesel_power_subset)

# Print the sum of diesel power for the first 100 hours
print("Sum of Diesel Power (First 100 Hours):", np.sum(diesel_power_subset))

# Print the net energy for the first 100 hours
print("Net Energy Diesel (First 100 Hours):", net_energy_subset)

# Calculate diesel power for each time interval
diesel_power_full = [calculate_diesel_energy(fuel_consumption, generator_output, diesel_losses) for _ in range(len(data_raw))]

# Ensure diesel_power_full is an iterable (e.g., NumPy array)
diesel_power_full = np.array(diesel_power_full)

# Extract load values from the 'load_values' column
load_values_full = data_raw["load_values"].values

# Calculate net diesel power
net_diesel_power_full = diesel_power_full - load_values_full
net_energy_full = calculate_net_energy_diesel(np.sum(diesel_power_full), np.sum(load_values_full), diesel_losses, time_intervals)


print("Net Diesel Energy (Full Dataset):", net_energy_full)
