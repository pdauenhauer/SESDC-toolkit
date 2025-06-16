import pandas as pd
import matplotlib.pyplot as plt

from solar4 import hourly_solar_energy  # Importing hourly solar energy data
from Diesel5 import hourly_diesel_energy  # Importing hourly diesel energy data
from WindEnergy1 import hourly_wind_energy

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

load_demand = [50, 50, 50, 100, 100, 50, 100, 380, 500, 500, 500, 200, 250, 300, 300, 320, 310, 300, 250, 250, 1000, 1000, 10, 10, 0, 20]

solar_energy = hourly_solar_energy[:26]  # Extracting hourly solar energy data for 26 hours
diesel_energy = hourly_diesel_energy[:26]  # Extracting hourly diesel energy data for 26 hours
wind_energy = hourly_wind_energy[:26]

ess = EnergyStorageSystem(capacity=1000)  # Initializing the energy storage system

hours = list(range(1, 27))  # Creating a list of hours from 1 to 26
storage_values = [ess.storage]  # List to store the storage values over time
surplus_values = []  # List to store surplus energy values
excess_values = []  # List to store excess energy values
curtailed_values = []  # List to store curtailed energy values
dropped_values = []  # List to store dropped load values
renewable_energy_values = [] # List to store renewable energy values

#generator_on = False  # Initialize generator status

# Iterate through each hour
for hour in hours:
    surplus_energy = 0
    curtailed_energy = 0 
    excess_energy = 0 
    dropped_energy = 0  # Initialize dropped energy for each hour

    generator_on = False  # Initialize generator status

    renewable_energy = solar_energy[hour - 1] + wind_energy[hour - 1]
    renewable_energy_values.append(renewable_energy)  # Append to the list

# Determine generator status based on energy availability and load demand
    if load_demand[hour - 1] > (renewable_energy + ess.storage - ess.min_storage):
        generator_on = True
    elif renewable_energy > diesel_energy[hour - 1] + load_demand[hour - 1]:
        generator_on = False
    elif renewable_energy + diesel_energy[hour - 1] < load_demand[hour - 1]:
        generator_on = True
    else:
        if generator_on and ess.storage >= ess.capacity:
            generator_on = False
            diesel_energy[hour - 1] = 0  # Set Diesel energy to zero when the generator is off

    # Calculate surplus energy based on generator status
    if generator_on:
        print(f"Hour {hour}: Generator is on")
        surplus_energy = renewable_energy + diesel_energy[hour - 1] - load_demand[hour - 1]
    else:
        print(f"Hour {hour}: Generator is off")
        surplus_energy = renewable_energy - load_demand[hour - 1]
        diesel_energy[hour - 1] = 0  # Set Diesel energy to zero when the generator is off

    # Process surplus or deficit energy
    if surplus_energy >= 0:
        surplus_values.append(surplus_energy)
        # Charge the ESS if storage is below capacity
        if ess.storage < ess.capacity:
            required_to_charge = ess.capacity - ess.storage
            if surplus_energy <= required_to_charge:
                ess.charge(surplus_energy, 0)
                excess_values.append(0)  
            else:
                curtailed_energy = surplus_energy - required_to_charge 
                ess.charge(required_to_charge, 0) 
                excess_energy = surplus_energy - required_to_charge
                excess_values.append(excess_energy)  
        else:
            curtailed_energy = surplus_energy
            excess_values.append(0)  
    else:
        surplus_values.append(0)
        # Represent negative surplus as negative values in surplus variable
        surplus_values[-1] = surplus_energy
    
        # Check if solar energy can cover the deficit
        if renewable_energy < load_demand[hour - 1]:
            deficit = load_demand[hour - 1] - renewable_energy

        # Check if load demand can not be met
        if load_demand[hour - 1] > renewable_energy + (ess.storage - ess.min_storage) + diesel_energy[hour - 1]:
            dropped_energy = load_demand[hour - 1] - renewable_energy - (ess.storage - ess.min_storage) - diesel_energy[hour - 1]

        if ess.storage >= abs(surplus_energy):
            ess.discharge(deficit)
        else:
            ess.storage = ess.min_storage  # Reset storage to minimum

    # Update storage values for the hour
    storage_values.append(ess.storage)

    # Append dropped energy value for the hour
    dropped_values.append(dropped_energy)

    # Print the energy values and states for each hour
    print(f"Hour {hour}: SolarEnergy={solar_energy[hour - 1]:.2f} Wh, WindEnergy={wind_energy[hour - 1]:.2f} Wh, RenewableEnergy={renewable_energy:.2f} Wh, DieselEnergy={diesel_energy[hour - 1]:.2f} wh, Load={load_demand[hour - 1]:.2f} Wh, SurplusEnergy/DeficitEnergy={surplus_values[-1]:.2f} Wh, ExcessEnergy={excess_energy:.2f} Wh, Storage={ess.storage:.2f} Wh, CurtailedEnergy={curtailed_energy:.2f} Wh, DroppedLoad={dropped_energy:.2f} Wh")

# Plotting the energy values over time
plt.figure(figsize=(12, 6))
#plt.plot(hours, solar_energy, label='Solar Energy')
#plt.plot(hours, wind_energy, label='Wind Energy')
plt.plot(hours, renewable_energy_values, label='Renewable Energy')
plt.plot(hours, load_demand, label='Load')
plt.plot(hours, surplus_values, label='SurplusEnergy/DeficitEnergy')
plt.plot(hours, storage_values[:-1], label='Storage')
plt.plot(hours, diesel_energy, label='Diesel Energy')
plt.xlabel('Hours')
plt.ylabel('Energy (Wh)')
plt.legend()
plt.title('Cycle Charging Process Over 24 Hours')
plt.show()