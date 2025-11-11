import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns 
import numpy as np
import os
import io
from firebase_storage_setup import get_storage_bucket

# Graph Solar Power
def generate_power_graph(time_points, solar_power, userId, projectId, xlabel):
    """
    Plot the solar profile.

    Parameters:
    - time_points: Array representing time points.
    - solar_power_full: A numpy array representing the load profile.
    """
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, solar_power, label='Solar Power')
    plt.title('Solar Power Generation - 1 Year')
    plt.xlabel(xlabel)
    #plt.xlim(0, 48)
    plt.ylabel('Power (kW)')
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/solar_plot.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Solar plot saved successfully to {blob_path}")
    return blob_path  # Return the path to the saved plot

def generate_financial_graph(time_points, financial_data, userId, projectId):
    """
    Plot the financial data.

    Parameters:
    - time_points: Array representing time points.
    - financial_data: A numpy array representing the financial data.
    """
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, financial_data, label='Financial Data')
    plt.title('Financial Data Over Time')
    plt.xlabel('Time (hours)')
    plt.ylabel('Financial Value')
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/financial_plot.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')

    return blob_path  # Return the path to the saved plot

def generate_solar_heatmap(solar_power, userId, projectId):
    """
    Generate a heatmap showing solar power generation per day.
    """
    #reshape for seaborn

    solar_power_reshaped = np.array(solar_power).reshape((365, 24))

    #plot heatmap
    plt.figure(figsize=(14, 8))
    ax = sns.heatmap(
        solar_power_reshaped,
        cmap="YlGnBu",
        cbar_kws={'label': 'Power(kW)'}
    )
    ax.set_title('Hourly Solar Power Generation per Day')
    ax.set_xlabel('Hour of Day')
    ax.set_ylabel('Day of Year')

    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/solar_heatmap.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Solar heatmap saved successfully to {blob_path}")
    return blob_path

def generate_monthly_heatmap(solar_power, userId, projectId):
    """
    Generate a heatmap of average daily solar power by month and day.

    Parameters:
    - solar_power: A 1D numpy array with 365 average daily values (1 year).
    """

    # Days in each month (non-leap year)
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    # Create a 12x31 array and fill it with NaNs
    heatmap_data = np.full((12, 31), np.nan)

    day_idx = 0
    for month_idx, num_days in enumerate(days_in_month):
        for d in range(num_days):
            heatmap_data[month_idx, d] = solar_power[day_idx]
            day_idx += 1

    # Plot heatmap
    plt.figure(figsize=(14, 6))
    ax = sns.heatmap(
        heatmap_data,
        cmap="YlGnBu",
        cbar_kws={'label': 'Average Daily Solar Power (kW)'},
        linewidths=0.5,
        linecolor='gray'
    )
    ax.set_title('Average Daily Solar Power Generation by Month and Day')
    ax.set_xlabel('Day of Month')
    ax.set_ylabel('Month')
    ax.set_yticks(np.arange(12) + 0.5)
    ax.set_yticklabels(month_names, rotation=0)

    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/solar_monthly_heatmap.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Monthly heatmap saved successfully to {blob_path}")
    return blob_path

def plot_load_profile(time_points, load_profile, userId, projectId, xlabel):
    """
    Plot the load profile.

    Parameters:
    - time_points: Array representing time points.
    - load_profile: A numpy array representing the load profile.
    """
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, load_profile, label='Load Profile')
    plt.title('Micro-Grid Load Profile Simulation')
    plt.xlabel(xlabel)
    plt.ylabel('Load (kW)')
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/load_plot.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Load plot saved successfully to {blob_path}")
    return blob_path  # Return the path to the saved plot

def plot_wind_energy(time_points, hourly_wind_energy, userId, projectId, xlabel):
    """
    Plot the wind energy.

    Parameters:
    - time_points: Array representing time points.
    - hourly_wind_energy: A numpy array representing the energy generated by wind every hour.
    """
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, hourly_wind_energy, label='Wind Energy')
    plt.title('Micro-Grid Wind Energy')
    plt.xlabel(xlabel)
    plt.ylabel('Energy (kW)')
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/wind_plot.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Wind plot saved successfully to {blob_path}")
    return blob_path  # Return the path to the saved plot

def plot_generic(time_points, energy, label, title, filename, userId, projectId):
    """
    Plot some energy over time. 

    Parameters:
    - time_points: Array representing time points.
    - energy: A numpy array representing the energy every hour.
    - name: a string representing the label
    """
    print("in plot generic")
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, energy, label=label)
    plt.title(title)
    plt.xlabel('Time (hours)')
    plt.ylabel('Energy (kW)')
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/{filename}_plot.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"{filename} plot saved successfully to {blob_path}")
    return blob_path  # Return the path to the saved plot


def plot_net_energy(time_points, net_energy, load, solar, wind, diesel, title, filename, userId, projectId, xlabel):
    """
    Plot the net energy.

    Parameters:
    - time_points: Array representing time points.
    - ...
    """
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, net_energy, label='Net Energy')
    plt.plot(time_points, load, label='Load')
    plt.plot(time_points, solar, label='Solar')
    plt.plot(time_points, wind, label='Wind')
    plt.plot(time_points, diesel, label='Diesel')
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel('Energy (kW)')
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/{filename}_plot.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Net energy plot saved successfully to {blob_path}")
    return blob_path  # Return the path to the saved plot


def plot_battery_soc(time_points, battpower, userId, projectId, load, load_not_serviced, xlabel):
    #might be useful to add load in yellow with hyphenated line
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, load, color='yellow', linestyle='--', label="Load")
    plt.plot(time_points, load_not_serviced, color='red', label="Load Not Serviced")
    plt.plot(time_points, battpower, color='blue', label="SOC")
    plt.title("Battery State of Charge")
    plt.xlabel(xlabel)
    plt.ylabel('Power (kWh)')
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/battery_plot.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Net energy plot saved successfully to {blob_path}")
    return blob_path  # Return the path to the saved plot

def plot20year(days, load_serviced, userId, projectId):

    plt.figure(figsize=(12, 6))
    plt.plot(days, load_serviced, color='green', label="Load Serviced")
    plt.title("20 Year Load Serviced")
    plt.xlabel('Time (hours)')
    plt.ylabel('Power (kWh)')
    plt.ylim(bottom=0)
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/load_serviced_plot.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Net energy plot saved successfully to {blob_path}")
    return blob_path  # Return the path to the saved plot 

def plot_20yr_financials(years, battery, generator, solar, wind, userId, projectId):
    """
    Plot the financial expenses over 20 years for each technology.
    """
    width = 0.7
    fig, ax = plt.subplots(figsize=(14, 7))

    p1 = ax.bar(years, battery, width, label='Battery', color='blue')
    p2 = ax.bar(years, generator, width, bottom=battery, label='Generator', color='orange')
    p3 = ax.bar(years, solar, width, bottom=battery + generator, label='Solar', color='green')
    p4 = ax.bar(years, wind, width, bottom=battery + generator + solar, label='Wind', color='red')

    total_yearly = battery + generator + solar + wind
    cumulative = np.cumsum(total_yearly)
    ax.plot(years, cumulative, color='black', label='Cumulative Total', linewidth=2)

    ax.set_xlabel('Year')
    ax.set_ylabel('Yearly Expenses ($)')
    ax.set_title('Yearly and Cumulative Financial Expenses (20 Years)')
    ax.legend(loc='upper left')
    plt.tight_layout()

    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/financial_expenses.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"20 year financial expenses plot saved successfully to {blob_path}")
    return blob_path  # Return the path to the saved plot

def plot_annual_revenue(years, revenue, userId, projectId):
    """
    Plot the annual revenue over 20 years.
    """
    plt.figure(figsize=(12, 6))
    plt.bar(years, revenue, color='green', label='Annual Revenue')
    cumulative = np.cumsum(revenue)
    plt.plot(years, cumulative, color='black', label='Cumulative Revenue', linewidth=2)
    plt.title('Annual Revenue (20 Years)')
    plt.xlabel('Year')
    plt.ylabel('Revenue ($)')
    plt.legend()
    plt.grid(True)
    
    plot_stream = io.BytesIO()
    plt.savefig(plot_stream, format='png')
    plt.close()
    plot_stream.seek(0)

    blob_path = f"{userId}/{projectId}/annual_revenue.png"
    blob = get_storage_bucket().blob(blob_path)
    blob.upload_from_file(plot_stream, content_type='image/png')
    print(f"Annual revenue plot saved successfully to {blob_path}")
    return blob_path