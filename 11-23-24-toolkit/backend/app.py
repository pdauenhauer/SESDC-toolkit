from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os

from calculations import process_csv, panel_losses, coef, STCIrr, STCTemp, calculate_solar_energy, calculate_net_energy
from graph import generate_power_graph, plot_load_profile


app = Flask(__name__)

#enable CORS for all routes
CORS(app)

@app.route("/")
def index():
    return "Backend is running!"

@app.route("/upload", methods=["POST"])
def upload_csv():

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
        
    try:
        # Process the CSV
        print(f"Received file: {file.filename}")
        df = process_csv(file)
        print("CSV processed successfully:")
        print(df.head())

        # Extract relevant columns
        print("Extracting data...")
        df["Irradiance (W/m2)"] = pd.to_numeric(df["Irradiance (W/m2)"], errors="coerce")
        df["Temp_C (oC)"] = pd.to_numeric(df["Temp_C (oC)"], errors="coerce")
        load_values_full = df['load_values'].to_numpy() #change this to the same or nah?
        print("Irradiance, Temp, and Load values extracted successfully")

        # Calculate solar power
        print("Calculating solar power...")
        solar_power_full = calculate_solar_energy(df["Irradiance (W/m2)"], df["Temp_C (oC)"],
                          panel_name_plate_W=680, losses=panel_losses["loss_value"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)
        print("Solar power calculated.")

        # Graph the solar power
        print("Graphing solar power for the first 2 days...")
        # Amount of graph to plot
        time_points = np.arange(0, 47)
        solar_power_test = solar_power_full[:47]
        # Graph solar energy
        solar_plot_path = generate_power_graph(time_points, solar_power_test)
        print("Solar power graphed.")

        
        # Graph the load
        print("Graphing load for first 2 days...")
        # Shape the load for plotting
        load_profile = load_values_full.reshape(-1, 1)
        load_profile[load_profile < 0] = 0  # Ensure no negative values
        load_profile = load_profile.flatten()  # Flatten the result to a 1D array
        load_profile_subset = load_profile[:47]
        # Plot
        load_plot_path = plot_load_profile(time_points, load_profile_subset)
        print("Load graphed.")

        """
        # Calculate net energy
        print("Calculating net energy...")
        net_energy_full = calculate_net_energy(solar_power_full, load_values_full)
        print("Net Energy (Full Dataset):", net_energy_full)

        print("Calculating net energy subset...")
        # Subset solar_power and load_values to the first 100 hours
        solar_power_subset = solar_power_full[:100]
        load_values_subset_solar = load_values_full[:100]
        # Calculate net energy for the first 100 hours
        net_energy_subset = calculate_net_energy(solar_power_subset, load_values_subset_solar)
        print("Net Energy (First 100 Hours):", net_energy_subset)

        print("Length of Solar Power (Full):", len(solar_power_full))
        print("Length of Load Values (Full):", len(load_values_full))
        print("NaN in Solar Power (Full):", np.isnan(solar_power_full).any())
        print("NaN in Load Values (Full):", np.isnan(load_values_full).any())
        """

        return jsonify({
            "message": "Graph generated!",
            "solar_plot_url": solar_plot_path,
            "load_plot_url": load_plot_path
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)


if __name__ == "__main__":
    app.run(debug=True)