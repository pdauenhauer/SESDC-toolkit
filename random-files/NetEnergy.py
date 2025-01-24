import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Solar energy calculation script
ross_coef = 0.0563
STCIrr = 1000
STCTemp = 25

file_path = "C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/test_irr_data.csv"
data_raw = pd.read_csv(file_path, parse_dates=["DateTime"])
#"DateTime" in the CSV file should be treated as datetime objects. 

panel_spec_link = "http://fortunecp.com/wp-content/uploads/2016/02/Fortune-CP-80-85W-Polycrystalline-Solar-Panels.pdf"
panel_char = [85, 17.363, 4.607, 21.427, 4.921]
# list that contains characteristics or specifications related to a solar panel. 
panel_coef = [0.06, -0.33, -0.45]
# coefficients related to the temperature dependence of solar panels:

panel_losses = {"loss_type": ["wire_losses", "Module_mismatch", "Module_Aging", "Dust/Dirt", "converter"],
                "loss_value": [0.1, 0.1, 0.08, 0.11, 0.05]}

system_losses = {"loss_type": ["bat_charging_eff", "bat_discharging_eff", "Combined_losses"],
                 "loss_value": [0.92, 0.92, 0.85]}

coef = panel_coef[2]

def calculate_solar_energy(irradiance, ambient_temp_C, panel_name_plate_W, losses, coef, STCIrr, STCTemp):
    ambient_temp_C_adj = ambient_temp_C + (ross_coef * irradiance)

    # Convert losses to a NumPy array
    losses = np.array(losses)

    p_out = (irradiance / STCIrr) * (panel_name_plate_W + (panel_name_plate_W * (coef / 100) * (ambient_temp_C_adj - STCTemp))) * np.prod(1 - losses)

    return p_out

sub_data_raw = data_raw.head(100)
print(sub_data_raw.dtypes)

# Convert columns to numeric using .loc
sub_data_raw.loc[:, "Irradiance (W/m2)"] = pd.to_numeric(sub_data_raw["Irradiance (W/m2)"], errors="coerce")
sub_data_raw.loc[:, "Temp_C (oC)"] = pd.to_numeric(sub_data_raw["Temp_C (oC)"], errors="coerce")
sub_data_raw = sub_data_raw.dropna()

# Drop rows with NaN values (if any) after conversion
sub_data_raw = sub_data_raw.dropna()

# Call function for reduced data
hours_100 = calculate_solar_energy(sub_data_raw["Irradiance (W/m2)"], sub_data_raw["Temp_C (oC)"],
                                    panel_name_plate_W=680, losses=panel_losses["loss_value"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)

print("Sum of hours_100:", np.sum(hours_100))

  
def load_values_from_csv(file_path):
    """
    Load load values from a CSV file.

    Parameters:
    - file_path: Path to the CSV file.

    Returns:
    - load_values: Numpy array representing the load values.
    """
    load_data = pd.read_csv(file_path)
    return load_data['Load_values'].to_numpy()

# Example usage with CSV file
csv_file_path = "C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/test_irr_data.csv"  
load_values = load_values_from_csv(csv_file_path)

def calculate_net_energy(solar_power, load_values, time_interval):
    net_power = solar_power - load_values
    net_energy = np.trapz(net_power, dx=time_interval)
    return net_energy


# Load solar data
solar_file_path = "C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/test_irr_data.csv"
solar_data_raw = pd.read_csv(solar_file_path, parse_dates=["DateTime"])

# Extract relevant columns and calculate solar power
solar_data_raw["Irradiance (W/m2)"] = pd.to_numeric(solar_data_raw["Irradiance (W/m2)"], errors="coerce")
solar_data_raw["Temp_C (oC)"] = pd.to_numeric(solar_data_raw["Temp_C (oC)"], errors="coerce")
solar_power = calculate_solar_energy(solar_data_raw["Irradiance (W/m2)"], solar_data_raw["Temp_C (oC)"],
                                      panel_name_plate_W=panel_char[0], losses=panel_losses["loss_value"], coef=panel_char[1], STCIrr=STCIrr, STCTemp=STCTemp)


# Calculate solar power for the entire dataset
solar_power_full = calculate_solar_energy(solar_data_raw["Irradiance (W/m2)"], solar_data_raw["Temp_C (oC)"],
                                          panel_name_plate_W=680, losses=panel_losses["loss_value"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)


# Generate load profile data for the entire dataset
load_values_full = load_values_from_csv(csv_file_path)

#time_interval is the time difference between data points (in hours)
time_interval_full = 1  

# Calculate net energy for the entire dataset
net_energy_full = calculate_net_energy(solar_power_full, load_values_full, time_interval_full)

print("Net Energy (Full Dataset):", net_energy_full)

# Subset solar_power and load_values to the first 100 hours
solar_power_subset = solar_power_full[:100]
load_values_subset = load_values_full[:100]
sub_data_raw = sub_data_raw.dropna()

#time_interval is the time difference between data points (in hours)
time_interval_subset = 1  

# Calculate net energy for the first 100 hours
net_energy_subset = calculate_net_energy(solar_power_subset, load_values_subset, time_interval_subset)

print("Net Energy (First 100 Hours):", net_energy_subset)
    
