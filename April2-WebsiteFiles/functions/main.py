# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

import os
import sys
import requests
import io
import csv
import firebase_admin

from firebase_functions import https_fn, options
from firebase_storage_setup import get_storage_bucket
from firebase_admin import storage

from calculations import (
    EnergyStorageSystem,
    process_csv, coef, STCIrr, STCTemp, panel_char, calculate_hourly_solar_energy, calculate_solar_energy,
    calculate_net_energy, net_energy_for_graph,
    calculate_hourly_wind_energy, calculate_power_output, 
    calculate_hourly_diesel_energy, diesel_losses
)
from graph import generate_power_graph, plot_load_profile, plot_wind_energy, plot_generic, plot_net_energy

import pandas as pd
import numpy as np

bucket = get_storage_bucket()

cors_settings = options.CorsOptions(
    cors_origins=[
        "http://localhost:*", 
        "https://sesdc-toolkit.com"
    ], 
    cors_methods=["POST", "OPTIONS"]
)

@https_fn.on_request(cors=cors_settings)
def run_simulation(req: https_fn.Request) -> https_fn.Response:  
    if req.path == "/__/health":
        return https_fn.Response("OK", status=200) 
    
    if req.method == "OPTIONS":
        return https_fn.Response(
            "", 204,
            headers={
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "3600"
            }
        )
    print("Function run_simulation started.")

    try:
        #user data
        data = req.get_json(silent=True)
        userId = data.get('userId')
        projectId = data.get('projectId')
        #wind inputs
        numTurbines = data.get('numTurbines')
        # battery inputs
        chargeCapacity = data.get('chargeCapacity')
        maxStorage = data.get('maxStorage')
        #solar inputs
        arrayWattage = data.get('arrayWattage')
        solar_losses = {"loss_type": ["wire_losses", "Module_mismatch", "Module_Aging", "Dust/Dirt", "converter"],
                        "loss_value": [data.get('wireLosses'), data.get('moduleMismatch'), data.get('moduleAging'), data.get('dustDirt'), data.get('converterLosses')]}

        print(f"User ID: {userId}, Project ID: {projectId}")
        
        blob_path = f"{userId}/{projectId}/simulation-csv"
        blob = bucket.blob(blob_path)
        
        file_stream = io.BytesIO()
        blob.download_to_file(file_stream)
        file_stream.seek(0)
        
        csv_content = file_stream.getvalue().decode('utf-8')
        
        df = process_csv(io.StringIO(csv_content))
        print("CSV processed successfully:")
        run_simulation_function(projectId, userId, df, numTurbines, chargeCapacity, maxStorage, arrayWattage, solar_losses)

        return https_fn.Response(
            "Simulation Ran",
            200
        )

    except Exception as e:
        print(f"Error in run_simulation: {str(e)}")
        return https_fn.Response(
            f"Internal Server Error: {str(e)}",
            500
        )


def fetch_solar_data(latitude, longitude, userId, projectId, api_key="TC1RGLjNIwUJrOGGyPvg4Fgq182jznjbbeIfZT5f", year="2022", interval="30"):
    url = "https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-msg-v1-0-0-download.csv"

    # Define the WKT point using the provided coordinates
    wkt = f"POINT({longitude} {latitude})"

    # Set up the parameters
    params = {
        "api_key": api_key,
        "wkt": wkt,
        "attributes": "dni,wind_speed,air_temperature",  # attributes to download
        "names": year,  # Year
        "utc": "false",  # Local time instead of UTC
        "leap_day": "false",  # Exclude leap day
        "interval": interval,  # Data resolution interval
        "full_name": "Josh Baron",  # Your full name
        "email": "jbaron@seattleu.edu",  # Your email address
        # "mailing_list": "false"  # Don't add to the mailing list
    }

    response = requests.get(url, params=params)

    if response.status_code == 200:
        csv_data = io.StringIO(response.text)
        df = pd.read_csv(csv_data, skiprows=2)

        timestamp_columns = df.iloc[:, :5]

        timestamp_columns['Timestamp'] = pd.to_datetime(
            timestamp_columns[['Year', 'Month', 'Day', 'Hour', 'Minute']]
        )

        timestamp_columns['Datetime'] = timestamp_columns['Timestamp'].dt.strftime('%#m/%#d/%Y %H:%M')

        additional_columns = df[['DNI', 'Temperature', 'Wind Speed']]

        additional_columns = additional_columns.rename(columns={
            'DNI': 'Irradiance (W/m2)',
            'Temperature': 'Temp_C (oC)',
            'Wind Speed': 'Wind_speed(km/h)'
        })

        test_df = pd.read_csv('test.csv')

        relevant_columns = ['load_values']
        relevant_data = test_df[relevant_columns]

        new_df = pd.concat([timestamp_columns['Datetime'], relevant_data, additional_columns], axis=1)

        csv_buffer = io.StringIO()
        new_df.to_csv(csv_buffer, index=False)
        csv_data = csv_buffer.getvalue().encode('utf-8')

        cloud_storage_path = f"{userId}/{projectId}/test.csv"
        bucket = storage.bucket()

        temp_blob_path = f"{userId}/{projectId}/.temp"
        temp_blob = bucket.blob(temp_blob_path)

        if temp_blob.exists():
            print(f"Deleting existing temp file at {temp_blob_path}")
            temp_blob.delete()
        
        blob = bucket.blob(cloud_storage_path)
        blob.upload_from_string(csv_data, content_type='text/csv')
        
        run_simulation_function(projectId, userId, new_df)
    else:
        print(f"Error: {response.status_code}")
        print(response.text)


@https_fn.on_request(cors=cors_settings)
def fetch_solar_data_function(req: https_fn.Request) -> https_fn.Response:
    if req.path == "/__/health":
        return https_fn.Response("OK", status=200)

    if req.method == "OPTIONS":
        return https_fn.Response(headers={"Access-Control-Allow-Origin": "*"})

    data = req.get_json(silent=True)

    latitude = data.get('latitude')
    longitude = data.get('longitude')
    userId = data.get('userId')
    projectId = data.get('projectId')

    print(latitude)
    print(longitude)
    
    fetch_solar_data(latitude, longitude, userId, projectId)
    
    return https_fn.Response("Data fetched successfully")

def run_simulation_function(projectId, userId, df, numTurbines, chargeCapacity, maxStorage, arrayWattage, solar_losses):

    #Initialize Energy Storage System
    e1 = EnergyStorageSystem(chargeCapacity, maxStorage)

    # Clean up the data
    print("Cleaning data...")
    # Ensure values are numeric and drop NaN values
    df["Irradiance (W/m2)"] = pd.to_numeric(df["Irradiance (W/m2)"], errors="coerce")
    df["Temp_C (oC)"] = pd.to_numeric(df["Temp_C (oC)"], errors="coerce")
    df['Wind_speed(km/h)'] = pd.to_numeric(df['Wind_speed(km/h)'], errors='coerce')
    print("dropping na...")
    df.dropna(subset=['Wind_speed(km/h)'], inplace=True)

    # Convert wind speed from km/h to m/s
    df['Wind_speed(m/s)'] = df['Wind_speed(km/h)'] * (1000 / 3600)

    # Extract relevant columns
    print("Extracting columns...")
    load_values_full = df['load_values'].to_numpy()
    print("Load values extracted successfully")

    #hourly_solar_energy = calculate_hourly_solar_energy(df, panel_name_plate_W=panel_char[0], losses=panel_losses["loss_value"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)

    # Calculate solar power
    print("Calculating solar power...")
    solar_power_full = calculate_solar_energy(df["Irradiance (W/m2)"], df["Temp_C (oC)"],
                          panel_name_plate_W=(arrayWattage * 1000), losses=solar_losses["loss_value"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)
    print("Solar power calculated.")

    # Graph the solar power
    print("Graphing solar power for the first 2 days...")
    # Amount of graph to plot
    time_points = np.arange(0, 47)
    solar_power_subset_kw = (1/1000) * solar_power_full[:47]
    # Graph solar energy
    print(userId)
    print(projectId)
    solar_plot_path = generate_power_graph(time_points, solar_power_subset_kw, userId, projectId)
    print("Solar power graphed.")

        
    # Graph the load
    print("Graphing load for first 2 days...")
    # Shape the load for plotting
    load_profile = load_values_full.reshape(-1, 1)
    load_profile[load_profile < 0] = 0  # Ensure no negative values
    load_profile = load_profile.flatten()  # Flatten the result to a 1D array
    load_profile_subset = load_profile[:47]
    # Plot
    load_plot_path = plot_load_profile(time_points, load_profile_subset, userId, projectId)
    print("Load graphed.")

    # Calculate hourly wind energy - returns an array with all the wind energy generated
    hourly_wind_energy = calculate_hourly_wind_energy(df, numTurbines)
    # Add hourly wind energy to the dataframe
    df['Hourly_Wind_Energy(Wh)'] = hourly_wind_energy

    # Graph wind energy
    print("Graphing wind energy...")
    wind_energy_subset_kw = (1/1000) * np.array(hourly_wind_energy[:47])
    wind_plot_path = plot_wind_energy(time_points, wind_energy_subset_kw, userId, projectId)
    print("Wind energy graphed.")

    '''
    # Calculate diesel energy
    print("Calculating diesel...")
    # Subset the data to include only the first 48 hours
    data_48 = df.head(50)
    # Calculate
    hourly_diesel_energy = calculate_hourly_diesel_energy(data_48, list(diesel_losses.values()))  # Pass only the loss values
    print("Diesel calculated.")
    diesel_energy_subset_kw = (1/1000) * np.array(hourly_diesel_energy[:47])
    '''
    diesel_energy_subset_kw = np.zeros(47)
    # Graph diesel energy
    print("Graphing diesel")

    diesel_plot_path = plot_generic(
        time_points, diesel_energy_subset_kw, 
        "Diesel Energy", "Diesel Energy Generation", "diesel", 
        userId, projectId
        )
    print("Diesel graphed")

    

    # Calculate net energy without storage for the first 48 hours
    print("Calculating net energy subset...")
    net_energy_subset_kw = net_energy_for_graph(solar_power_subset_kw, load_profile_subset, wind_energy_subset_kw, diesel_energy_subset_kw)
    print("Net energy calculated.")

    # Graph the net energy
    print("Graphing net energy...")
    net_energy_plot_path = plot_net_energy(time_points, 
                                            net_energy_subset_kw, 
                                            load_profile_subset, 
                                            solar_power_subset_kw, 
                                            wind_energy_subset_kw,
                                            diesel_energy_subset_kw,
                                            "Net Energy: Solar, Wind, Diesel, Load",
                                            "net_energy",
                                            userId, projectId)
    print("Net energy graphed.")


    # For each hour, the net energy charges or depletes the storage system 
    net_kw  = calculate_net_energy(e1, net_energy_subset_kw)
    net_bat_plot_path = plot_generic(
        time_points, net_kw, 
        "Net Energy", "Net Energy with Storage System", "battery",
        userId, projectId
        )

    net_kw_path = plot_net_energy(time_points, 
                                            net_kw, 
                                            load_profile_subset, 
                                            solar_power_subset_kw, 
                                            wind_energy_subset_kw,
                                            diesel_energy_subset_kw,
                                            "Net energy with storage system",
                                            "net_battery",
                                            userId, projectId)


    return {
        "message": "Graph generated!",
        "solar_plot_url": solar_plot_path,
        "load_plot_url": load_plot_path,
        "wind_plot_url": wind_plot_path,
        "net_energy_plot_url": net_energy_plot_path,
        "diesel_plot_url": diesel_plot_path,
        "net_plot_url": net_bat_plot_path,
        "net_kw_url": net_kw_path
    }