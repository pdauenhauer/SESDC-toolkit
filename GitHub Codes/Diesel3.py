
import numpy as np
import pandas as pd

diesel_losses = {"loss_type": ["engine_efficiency", "generator_efficiency", "transmission_losses", "converter"],
                 "loss_value": [0.85, 0.90, 0.95, 0.98]}


def calculate_diesel_energy(fuel_consumption, generator_output, losses):
    losses = np.array(losses["loss_value"])
    diesel_power = fuel_consumption * generator_output * np.prod(losses)
    return diesel_power

def calculate_hourly_diesel_energy(diesel_power, time_intervals):
    # Ensure diesel_power is a NumPy array
    diesel_power = np.array(diesel_power)

    # Calculate hourly diesel energy
    hourly_diesel_energy = np.diff(diesel_power, prepend=0)  # Take the difference between consecutive values

    return hourly_diesel_energy

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
#diesel_power_full = [calculate_diesel_energy(fuel_consumption, generator_output, diesel_losses) for _ in time_intervals]

# Ensure diesel_power_full is an iterable (e.g., NumPy array)
diesel_power_full = np.array(diesel_power_full)

# Display results
result_df = pd.DataFrame({"DateTime": time_intervals, "Diesel Power": diesel_power_full})
print(result_df)

total_diesel_power = result_df['Diesel Power'].sum()

print("Total Diesel Power for All Hours:", total_diesel_power)

# Subset diesel_power to the first 100 hours
diesel_power_subset = diesel_power_full[:100]

print("Diesel Power (First 100 Hours):", diesel_power_subset)

# Print the sum of diesel power for the first 100 hours
print("Sum of Diesel Power (First 100 Hours):", np.sum(diesel_power_subset))

# Calculate hourly diesel energy
hourly_diesel_energy = calculate_hourly_diesel_energy(diesel_power_full, time_intervals)

result_df = pd.DataFrame({"DateTime": time_intervals, "Diesel Power": diesel_power_full, "Hourly Diesel Energy": hourly_diesel_energy})
print(result_df)

