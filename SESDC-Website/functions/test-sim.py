import os
import sys
import requests
import io
import csv

from calculations import process_csv, panel_losses, coef, STCIrr, STCTemp, calculate_solar_energy
from graph import generate_power_graph

import pandas as pd
import numpy as np

def run_simulation(file):
    df = process_csv(file)
    df["Irradiance (W/m2)"] = pd.to_numeric(df["Irradiance (W/m2)"], errors="coerce")
    df["Temp_C (oC)"] = pd.to_numeric(df["Temp_C (oC)"], errors="coerce")

    solar_power_full = calculate_solar_energy(
        df["Irradiance (W/m2)"], 
        df["Temp_C (oC)"],
        panel_name_plate_W=680, 
        losses=panel_losses["loss_value"], 
        coef=coef, 
        STCIrr=STCIrr, 
        STCTemp=STCTemp
    )

    time_points = np.arange(0, 47)
    solar_power_test = solar_power_full[:47]
    plot_path = generate_power_graph(time_points, solar_power_test)

run_simulation('new_csv.csv')