import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

##def generate_load_profile(time_points, load_values):
    #"""
    #Generate a synthetic load profile based on input load values and a sine wave pattern.

    #Parameters:
    #- time_points: Array representing time points.
    #- load_values: Array representing the load values at each time point.

    #Returns:
    #- load_profile: A numpy array representing the synthetic load profile.
    #"""
    # Reshape load_values to be a column vector
    #load_values = load_values.reshape(-1, 1)

    #load_profile = load_values 
    #load_profile[load_profile < 0] = 0  # Ensure no negative values

    #return load_profile.flatten()  # Flatten the result to a 1D array

#def generate_load_profile_24_hours(time_points, load_values):
    #"""
    #Generate a synthetic load profile for the first 24 hours based on input load values and a sine wave pattern.

    #Parameters:
    #- time_points: Array representing time points.
    #- load_values: Array representing the load values at each time point.

    #Returns:
    #- load_profile_24_hours: A numpy array representing the synthetic load profile for the first 24 hours.
    #"""
    # Identify the indices corresponding to the first 24 hours
    #indices_24_hours = (time_points >= 0) & (time_points < 24)

    # Extract load values and time points for the first 24 hours
    #load_values_24_hours = load_values[indices_24_hours]
    #time_points_24_hours = time_points[indices_24_hours]

    # Reshape load_values_24_hours to be a column vector
    #load_values_24_hours = load_values_24_hours.reshape(-1, 1)

    #load_profile_24_hours = load_values_24_hours
    #load_profile_24_hours[load_profile_24_hours < 0] = 0  # Ensure no negative values

    #return time_points_24_hours, load_profile_24_hours.flatten()  # Flatten the result to a 1D array

def generate_load_profile(time_points, load_values):
    """
    Generate a synthetic load profile based on input load values and a sine wave pattern.

    Parameters:
    - time_points: Array representing time points.
    - load_values: Array representing the load values at each time point.

    Returns:
    - load_profile: A numpy array representing the synthetic load profile.
    """
    # Reshape load_values to be a column vector
    load_values = load_values.reshape(-1, 1)

    load_profile = load_values 
    load_profile[load_profile < 0] = 0  # Ensure no negative values

    return load_profile.flatten()  # Flatten the result to a 1D array


def plot_load_profile(time_points, load_profile):
    """
    Plot the load profile.

    Parameters:
    - time_points: Array representing time points.
    - load_profile: A numpy array representing the load profile.
    """
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, load_profile, label='Load Profile')
    plt.title('Micro-Grid Load Profile Simulation')
    plt.xlabel('Time (hours)')
    plt.ylabel('Load (W)')
    plt.legend()
    plt.grid(True)
    plt.show()

def load_values_from_csv(file_path):
    """
    Load load values from a CSV file.

    Parameters:
    - file_path: Path to the CSV file.

    Returns:
    - load_values: Numpy array representing the load values.
    """
    load_data = pd.read_csv(file_path)
    return load_data['load_values'].to_numpy()

# Example usage with CSV file
#csv_file_path = "C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/malawi_gumbwa_health_post.csv"  
#load_values = load_values_from_csv(csv_file_path)

#time_points = np.linspace(0, 30 * 24, len(load_values))  # Adjust time_points to match load_profile
#generated_load_profile = generate_load_profile(time_points, load_values)
#plot_load_profile(time_points, generated_load_profile)

# Example usage with CSV file
csv_file_path = "C:/Users/danie/Desktop/Senior Design/Codes/myenv/csv/malawi_gumbwa_health_post.csv"  
load_values = load_values_from_csv(csv_file_path)

#time_points = np.linspace(0, 30 * 24, len(load_values))  # Adjust time_points to match load_profile
#time_points_24_hours, generated_load_profile_24_hours = generate_load_profile_24_hours(time_points, load_values)

# Plot the load profile for the first 24 hours
#generated_load_profile = generate_load_profile_24_hours(time_points, load_values)
#plot_load_profile(time_points_24_hours, generated_load_profile_24_hours)

# Consider only the first 24 loads
load_values_first_24 = load_values[:24]

time_points_first_24 = np.arange(1, 25)  # Adjust time_points to match load_profile
generated_load_profile_first_24 = generate_load_profile(time_points_first_24, load_values_first_24)
plot_load_profile(time_points_first_24, generated_load_profile_first_24)

