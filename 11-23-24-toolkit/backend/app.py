from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os

from calculations  import (
    process_csv, panel_losses, coef, STCIrr, STCTemp, panel_char, calculate_hourly_solar_energy, calculate_solar_energy,
    calculate_net_energy, net_energy_for_graph,
    calculate_hourly_wind_energy, calculate_power_output, 
    calculate_hourly_diesel_energy, diesel_losses
)
from graph import generate_power_graph, plot_load_profile, plot_wind_energy, plot_generic


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

        # Clean up the data
        print("Cleaning data...")
        # Ensure values are numeric and drop NaN values
        df["Irradiance (W/m2)"] = pd.to_numeric(df["Irradiance (W/m2)"], errors="coerce")
        df["Temp_C (oC)"] = pd.to_numeric(df["Temp_C (oC)"], errors="coerce")
        df['Wind_speed(km/h)'] = pd.to_numeric(df['Wind_speed(km/h)'], errors='coerce')
        print("dropping na...")
        df.dropna(subset=['Wind_speed(km/h)'], inplace=True)
        print("Diesel cleaning...")
        df[["generator_output", "fuel_consumption"]] = df[["generator_output", "fuel_consumption"]].apply(pd.to_numeric, errors="coerce")
        df.dropna(subset=['generator_output', "fuel_consumption"], inplace=True) 
        print("Data cleaned up.")

        # Convert wind speed from km/h to m/s
        df['Wind_speed(m/s)'] = df['Wind_speed(km/h)'] * (1000 / 3600)

        # Extract relevant columns
        print("Extracting columns...")
        load_values_full = df['load_values'].to_numpy() #change this to the same or nah?
        print("Load values extracted successfully")

        #hourly_solar_energy = calculate_hourly_solar_energy(df, panel_name_plate_W=panel_char[0], losses=panel_losses["loss_value"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)

        # Calculate solar power
        print("Calculating solar power...")
        solar_power_full = calculate_solar_energy(df["Irradiance (W/m2)"], df["Temp_C (oC)"],
                          panel_name_plate_W=680, losses=panel_losses["loss_value"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)
        print("Solar power calculated.")

        # Graph the solar power
        print("Graphing solar power for the first 2 days...")
        # Amount of graph to plot
        time_points = np.arange(0, 47)
        solar_power_subset = solar_power_full[:47]
        # Graph solar energy
        solar_plot_path = generate_power_graph(time_points, solar_power_subset)
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


        # Calculate hourly wind energy - returns an array with all the wind energy generated
        hourly_wind_energy = calculate_hourly_wind_energy(df)
        # Add hourly wind energy to the dataframe
        df['Hourly_Wind_Energy(Wh)'] = hourly_wind_energy

        # Graph wind energy
        print("Graphing wind energy...")
        wind_energy_subset = hourly_wind_energy[:47]
        wind_plot_path = plot_wind_energy(time_points, wind_energy_subset)
        print("Wind energy graphed.")


        # Calculate diesel energy
        print("Calculating diesel...")
        # Subset the data to include only the first 48 hours
        data_48 = df.head(50)
        # Calculate
        hourly_diesel_energy = calculate_hourly_diesel_energy(data_48, list(diesel_losses.values()))  # Pass only the loss values
        print("Diesel calculated.")

        # Graph diesel energy
        print("Graphing diesel")
        diesel_energy_subset = hourly_diesel_energy[:47]
        diesel_plot_path = plot_generic(time_points, diesel_energy_subset, "Diesel Energy", "Diesel Energy Generation", "diesel_plot")
        print("Diesel graphed")

        # Calculate net energy
        #print("Calculating net energy...")
        #net_energy_full = calculate_net_energy(solar_power_full, load_values_full)
        #print("Net Energy (Full Dataset):", net_energy_full)

        # Calculate net energy for the first 48 hours
        print("Calculating net energy subset...")
        net_energy_subset = net_energy_for_graph(solar_power_subset, load_profile_subset, wind_energy_subset)
        print("Net energy calculated.")

        # Graph the net energy
        print("Graphing net energy...")
        net_energy_plot_path = plot_generic(time_points, net_energy_subset, "Net Energy", "Net Energy: Solar, Wind, Load", "net_energy_plot")
        print("Net energy graphed.")

        return jsonify({
            "message": "Graph generated!",
            "solar_plot_url": solar_plot_path,
            "load_plot_url": load_plot_path,
            "wind_plot_url": wind_plot_path,
            "net_energy_plot_url": net_energy_plot_path,
            "diesel_plot_url": diesel_plot_path
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)


if __name__ == "__main__":
    app.run(debug=True)