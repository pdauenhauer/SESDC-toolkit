import pandas as pd
import numpy as np

# Constants and coefficients
#diesel_specific_energy = 35.61075  # Specific energy of diesel in kWh/liter

# File paths and data reading
file_path_diesel = "C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/malawi_gumbwa_health_post.csv"
data_raw_diesel = pd.read_csv(file_path_diesel, parse_dates=["DateTime"])

# Diesel losses dictionary
diesel_losses = {
    "engine_efficiency": 0.85,
    "generator_efficiency": 0.90,
    "transmission_losses": 0.95,
    "converter": 0.98
}

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

# Clean data and call function for diesel energy calculation
data_raw_diesel[["generator_output", "fuel_consumption"]] = data_raw_diesel[["generator_output", "fuel_consumption"]].apply(pd.to_numeric, errors="coerce")
data_cleaned_diesel = data_raw_diesel.dropna()

# Subset the data to include only the first 24 hours
hourly_diesel_data = data_cleaned_diesel.head(26)

hourly_diesel_energy = calculate_hourly_diesel_energy(hourly_diesel_data, list(diesel_losses.values()))  # Pass only the loss values
#hourly_diesel_energy = calculate_hourly_diesel_energy(hourly_diesel_data, list(diesel_losses.values()))  # Pass only the loss values


# Clean data and subset to include only the first 24 hours
data_raw_diesel[["generator_output", "fuel_consumption"]] = data_raw_diesel[["generator_output", "fuel_consumption"]].apply(pd.to_numeric, errors="coerce")
data_cleaned_diesel = data_raw_diesel.dropna()
hourly_diesel_data = data_cleaned_diesel.head(26)

# Call function for diesel energy calculation
hourly_diesel_energy = calculate_hourly_diesel_energy(hourly_diesel_data, list(diesel_losses.values()))

def print_hourly_diesel_output(diesel_power):
    print("Hourly Diesel Energy Output:")
    for i in range(len(diesel_power)):
        print(f"Hour {i + 1}: {diesel_power[i]} Wh")

# Print hourly diesel energy
print_hourly_diesel_output(hourly_diesel_energy)






# Add hourly diesel energy to the dataframe
#data_cleaned_diesel.loc[:, "Hourly Diesel Energy (Wh)"] = hourly_diesel_energy

# Print the resulting dataframe with hourly diesel energy
#print(hourly_diesel_data[["DateTime", "Hourly Diesel Energy (Wh)"]])
#print(data_cleaned_diesel[["DateTime", "Hourly Diesel Energy (Wh)"]])

# Define function to calculate hourly diesel energy similar to the solar energy function
#def print_hourly_diesel_output(diesel_power):
    #print("Hourly Diesel Energy Output:")
    #for i in range(24):
        #print(f"Hour {i + 1}: {diesel_power[i]} Wh")

    

# Print hourly diesel energy
#print_hourly_diesel_output(hourly_diesel_energy)