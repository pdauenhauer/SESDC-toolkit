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
    calculate_hourly_diesel_energy, diesel_losses,
    calc_daily_load_serviced, calc_load_not_serviced, calc_daily_energy,
    predict20years
)
from graph import (
    generate_power_graph, 
    generate_solar_heatmap,
    generate_monthly_heatmap,
    plot_load_profile, 
    plot_wind_energy, 
    plot_generic, 
    plot_net_energy, 
    plot_battery_soc, 
    plot20year
)

import pandas as pd
import numpy as np

bucket = get_storage_bucket()

cors_settings = options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["POST", "OPTIONS"],
)

@https_fn.on_request(cors=cors_settings)
def fetch_solar_data_function(req: https_fn.Request) -> https_fn.Response:
    if req.path == "/__/health":
        return https_fn.Response("OK", status=200)

    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)
    
    if req.method != "POST":
        return https_fn.Response("Method Not Allowed", status=405)
    
    try:
        data = req.get_json(silent=True)

        if not data:
            return https_fn.Response(
                "Invalid request: No JSON data provided", 
                status=400
            )

        userId = data.get('userId')
        projectId = data.get('projectId')

        if not userId or not projectId:
            return https_fn.Response(
                "Missing userId or projectId", 
                status=400
            )

        load = data.get('loadInputs', [])
        load_inputs = {
            "load_inputs": load
        }

        latitude = data.get('latitude')
        longitude = data.get('longitude')
        inflation_rate = data.get('inflation')
        location_inputs = {
            "latitude": latitude,
            "longitude": longitude,
            "inflation_rate": inflation_rate
        }

        using_battery = data.get('usingBattery')
        charge_capacity = data.get('chargeCapacity')
        maximum_storage = data.get('maximumStorage')
        bat_type = data.get('batteryType')
        battery_capex = data.get('batteryCapex')
        battery_opex = data.get('batteryOpex')
        battery_lifespan = data.get('batteryLifespan')
        battery_replacement = data.get('batteryReplacement') 
        battery_inputs = {
            "charge_capacity": charge_capacity,
            "maximum_storage": maximum_storage, 
            "battery_type": bat_type,
            "capex": battery_capex,
            "opex": battery_opex,
            "lifespan": battery_lifespan,
            "replacement_cost": battery_replacement
        }
        
        using_generator = data.get('usingGenerator')
        generator_capacity = data.get('generatorCapacity')
        generator_capex = data.get('generatorCapex')
        generator_opex = data.get('generatorOpex')
        generator_lifespan = data.get('generatorLifespan')
        generator_replacement = data.get('generatorReplacement')
        generator_inputs = {
            "capacity": generator_capacity,
            "capex": generator_capex,
            "opex": generator_opex,
            "lifespan": generator_lifespan,
            "replacement_cost": generator_replacement
        }
        
        using_solar_panel = data.get('usingSolarPanel')
        solar_array_size = data.get('solarArraySize')
        wire_losses = data.get('wireLosses')
        module_mismatch = data.get('moduleMismatch')
        module_aging = data.get('moduleAging')
        dust_dirt = data.get('dustDirt')
        converter = data.get('converter')
        solar_capex = data.get('solarCapex')
        solar_opex = data.get('solarOpex')
        solar_lifespan = data.get('solarLifespan')
        solar_replacement = data.get('solarReplacement')


        losses = [
            float(wire_losses / 100), 
            float(module_mismatch / 100), 
            float(module_aging / 100), 
            float(dust_dirt / 100), 
            float(converter / 100)
        ]
        solar_inputs = {
            "losses": losses,
            "solar_array_size": solar_array_size,
            "capex": solar_capex,
            "opex": solar_opex,
            "lifespan": solar_lifespan,
            "replacement_cost": solar_replacement
        }
        
        using_wind_turbine = data.get('usingWindTurbine')
        nameplate_capacity = data.get('namePlateCapacity')
        rated_power = data.get('ratedPower')
        cut_in_speed = data.get('cutInSpeed')
        rated_speed = data.get('ratedSpeed')
        cut_out_speed = data.get('cutOutSpeed')
        wind_capex = data.get('windCapex')
        wind_opex = data.get('windOpex')
        wind_lifespan = data.get('windLifespan')
        wind_replacement = data.get('windReplacement')

        wind_inputs = {
            "nameplate_capacity": nameplate_capacity,
            "rated_power": rated_power,
            "cut_in_speed": cut_in_speed,
            "rated_speed": rated_speed,
            "cut_out_speed": cut_out_speed,
            "capex": wind_capex,
            "opex": wind_opex,
            "lifespan": wind_lifespan,
            "replacement_cost": wind_replacement
        }

        print("wind inputs:", wind_inputs)
        print("solar inputs:", solar_inputs)
        print("battery inputs:", battery_inputs)
        print("generator inputs:", generator_inputs)
        print("location inputs:", location_inputs)
        print("load inputs:", load_inputs)
        
        fetch_solar_data(load_inputs, location_inputs, battery_inputs, generator_inputs, solar_inputs, wind_inputs, userId, projectId)
        
        return https_fn.Response(
            "Data fetched successfully",
            status=200
        )
    except Exception as e:
        print(f"Error in fetch_solar_data_function: {str(e)}")
        return https_fn.Response(
            f"Error processing request: {str(e)}",
            status=500
        )

def fetch_solar_data(load_inputs, location_inputs, battery_inputs, generator_inputs, solar_inputs, wind_inputs, userId, projectId, api_key="TC1RGLjNIwUJrOGGyPvg4Fgq182jznjbbeIfZT5f", year="2022", interval="30"):
    url = "https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-msg-v1-0-0-download.csv"

    latitude = location_inputs['latitude']
    longitude = location_inputs['longitude']

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

        repeated_loads = (load_inputs['load_inputs'] * 8760)[:len(df)]
        load_values_col = pd.Series(repeated_loads, name='load_values')

        new_df = pd.concat([timestamp_columns['Datetime'].reset_index(drop=True), 
                            load_values_col,
                            additional_columns.reset_index(drop=True)], axis=1)

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

        if blob.exists():
            print(f"CSV file uploaded successfully to {cloud_storage_path}")
        else:
            print(f"Failed to upload CSV file to {cloud_storage_path}")
        
        run_simulation(userId, projectId, location_inputs, battery_inputs, generator_inputs, solar_inputs, wind_inputs, new_df)
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

def run_simulation(userId, projectId, location_inputs, battery_inputs, generator_inputs, solar_inputs, wind_inputs, df):

    #Initialize Energy Storage System
    chargeCapacity = battery_inputs['charge_capacity']
    maxStorage = battery_inputs['maximum_storage']
    batType = battery_inputs['battery_type']
    e1 = EnergyStorageSystem(chargeCapacity, maxStorage, batType)

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
    load_values_full = df['load_values'].to_numpy()

    # Calculate solar power - hourly data for details
    solar_array_size = solar_inputs['solar_array_size']
    solar_power_full = calculate_solar_energy(df["Irradiance (W/m2)"], df["Temp_C (oC)"],
                          panel_name_plate_W=(solar_array_size * 1000), losses=solar_inputs["losses"], coef=coef, STCIrr=STCIrr, STCTemp=STCTemp)


    # Grab exactly 1 year of data
    time_points = np.arange(0, 8760)
    year_days = np.arange(0, 365)

    # Calculate daily solar power
    solar_power_subset_kw = (1/1000) * solar_power_full[:8760]

    #solar_heatmap_path = generate_solar_heatmap(solar_power_subset_kw, userId, projectId)
    #monthly_solar_heatmap_path = generate_monthly_heatmap(solar_power_subset_kw, userId, projectId)

    solar_power_daily = calc_daily_energy(year_days, solar_power_subset_kw)

    # Graph the solar power - hourly data for details
    # Set below for small graph
    #solar_plot_path = generate_power_graph(time_points, solar_power_subset_kw, userId, projectId, 'Time (hrs)') 
    # Set this for viewing year
    solar_plot_path = generate_power_graph(year_days, solar_power_daily, userId, projectId, "Days")

    
    # Graph the load
    load_profile = load_values_full.reshape(-1, 1)
    load_profile[load_profile < 0] = 0  # Ensure no negative values
    load_profile = load_profile.flatten()  # Flatten the result to a 1D array
    load_profile_subset = load_profile[:8760] #:47
    load_profile_daily = calc_daily_energy(year_days, load_profile_subset)
    # Plot
    #load_plot_path = plot_load_profile(time_points, load_profile_subset, userId, projectId, 'Time (hrs)')
    load_plot_path = plot_load_profile(year_days, load_profile_daily, userId, projectId, 'Days')
    
    #wind
    numTurbines = wind_inputs['nameplate_capacity']
    ratedPower = wind_inputs['rated_power']
    cutInSpeed = wind_inputs['cut_in_speed']
    ratedSpeed = wind_inputs['rated_speed']
    cutOutSpeed = wind_inputs['cut_out_speed']
    hourly_wind_energy = calculate_hourly_wind_energy(df, numTurbines, ratedPower * 1000, cutInSpeed, ratedSpeed, cutOutSpeed)
    # Add hourly wind energy to the dataframe
    df['Hourly_Wind_Energy(Wh)'] = hourly_wind_energy
    # Graph wind energy
    wind_energy_subset_kw = (1/1000) * np.array(hourly_wind_energy[:8760])
    wind_energy_daily = calc_daily_energy(year_days, wind_energy_subset_kw)
    #wind_plot_path = plot_wind_energy(time_points, wind_energy_subset_kw, userId, projectId, 'Time (hrs)')

    wind_plot_path = plot_wind_energy(year_days, wind_energy_daily, userId, projectId, 'Days')


    #diesel
    
    fuel_consumption = [1 for i in range(8760)]
    generator_output= 703
    # Calculate
    hourly_diesel_energy = calculate_hourly_diesel_energy(fuel_consumption, generator_output, list(diesel_losses.values()))  # Pass only the loss values
    diesel_energy_subset_kw = (1/1000) * np.array(hourly_diesel_energy)
    
    # Graph diesel energy
    diesel_plot_path = plot_generic(
        time_points, diesel_energy_subset_kw, 
        "Diesel Energy", "Diesel Energy Generation", "diesel", 
        userId, projectId
    )
    print("Diesel plot generated:", diesel_plot_path)
    
    

    # Calculate net energy
    net_energy_subset_kw = net_energy_for_graph(solar_power_subset_kw, load_profile_subset, wind_energy_subset_kw, diesel_energy_subset_kw)
    net_energy_daily = calc_daily_energy(year_days, net_energy_subset_kw)

    
    # Graph the net energy
    '''
    net_energy_plot_path = plot_net_energy(time_points, 
                                            net_energy_subset_kw, 
                                            load_profile_subset, 
                                            solar_power_subset_kw, 
                                            wind_energy_subset_kw,
                                            diesel_energy_subset_kw,
                                            "Net Energy: Solar, Wind, Diesel, Load",
                                            "net_energy",
                                            userId, projectId, "Time (hrs)")
    
    net_energy_plot_path = plot_net_energy(year_days, 
                                            net_energy_daily, 
                                            load_profile_daily, 
                                            solar_power_daily, 
                                            wind_energy_daily,
                                            diesel_energy_subset_kw[:365],
                                            "Net Energy: Solar, Wind, Diesel, Load",
                                            "net_energy",
                                            userId, projectId, 'Days')  
    '''
    #battery
    
    # For each hour, the net energy charges or depletes the storage system 
    battery_charge  = calculate_net_energy(e1, net_energy_subset_kw)
    battery_charge_daily = calc_daily_energy(year_days, battery_charge)

    #calculate the load NOT serviced
    loadNotServiced = calc_load_not_serviced(time_points, battery_charge, batType, maxStorage, net_energy_subset_kw)
    loadNotServiced_daily = calc_daily_energy(year_days, loadNotServiced)

    #plot the battery charge
    '''
    net_bat_plot_path = plot_battery_soc(
        time_points, battery_charge, 
        userId, projectId,
        batType, maxStorage,
        load_profile_subset,
        "Time (hrs)"
        )
    '''
    net_bat_plot_path = plot_battery_soc(
        year_days, battery_charge_daily, 
        userId, projectId,
        load_profile_daily,
        loadNotServiced_daily,
        'Days'
        ) 

    # combo plot
    '''
    net_kw_path = plot_net_energy(time_points, 
                                            battery_charge, 
                                            load_profile_subset, 
                                            solar_power_subset_kw, 
                                            wind_energy_subset_kw,
                                            diesel_energy_subset_kw,
                                            "Energy production and Battery SOC",
                                            "net_battery",
                                            userId, projectId)

    '''



    daily_load_serviced = np.asarray(load_profile_daily) - np.asarray(loadNotServiced_daily)
    
    #20 year data
    daily20years = np.arange(0, 7300) #days
    load_serviced20 = predict20years(daily_load_serviced)

    load_serviced_20years_path = plot20year(daily20years, load_serviced20, userId, projectId)
    
    
    return {
        "message": "Graph generated!",
        "solar_plot_url": solar_plot_path,
        "load_plot_url": load_plot_path,
        "wind_plot_url": wind_plot_path,
        #"net_energy_plot_url": net_energy_plot_path,
        "diesel_plot_url": diesel_plot_path,
        "net_plot_url": net_bat_plot_path,
        #"net_kw_url": net_kw_path,
        "load_serviced_20years_url": load_serviced_20years_path
    }