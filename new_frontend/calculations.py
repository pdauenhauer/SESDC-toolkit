import pandas as pd
import numpy as np
from flask import jsonify

#global solar variables
ross_coef = 0.0563
#temperature coefficient used to adjust the ambient temperature to the equivalent cell temperature in a solar panel.
STCIrr = 1000
#Standard Test Conditions Irradiance
STCTemp = 25
#Standard Test Conditions Temperature

#panel_losses
panel_losses = {"loss_type": ["wire_losses", "Module_mismatch", "Module_Aging", "Dust/Dirt", "converter"],
                "loss_value": [0.1, 0.1, 0.08, 0.11, 0.05]}

# list that contains characteristics or specifications related to a solar panel. 
panel_coef = [0.06, -0.33, -0.45]
coef = panel_coef[2]


#Process the CSV file
def process_csv(file):
    df = pd.read_csv(file, parse_dates=["Datetime"])
    if "Irradiance (W/m2)" not in df.columns or "Temp_C (oC)" not in df.columns:
        raise ValueError("CSV must contain 'Irradiance (W/m2)' and 'Temp_C (oC)' columns")

    return df


def calculate_solar_energy(irradiance, ambient_temp_C, panel_name_plate_W, losses, coef, STCIrr, STCTemp):
    ambient_temp_C_adj = ambient_temp_C + (ross_coef * irradiance)

    # Convert losses to a NumPy array
    losses = np.array(losses)
    p_out = (irradiance / STCIrr) * (panel_name_plate_W + (panel_name_plate_W * (coef / 100) * (ambient_temp_C_adj - STCTemp))) * np.prod(1 - losses)

    return p_out
