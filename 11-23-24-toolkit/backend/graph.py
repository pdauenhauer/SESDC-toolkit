import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os


# Graph Solar Power
def generate_power_graph(time_points, solar_power_full):
    """
    Plot the solar profile.

    Parameters:
    - time_points: Array representing time points.
    - solar_power_full: A numpy array representing the load profile.
    """
    plt.figure(figsize=(12, 6))
    plt.plot(time_points, solar_power_full, label='Solar Power Generation')
    plt.title('Micro-Grid Solar Power Simulation')
    plt.xlabel('Time (hours)')
    #plt.xlim(0, 48)
    plt.ylabel('Power (kW)')
    plt.legend()
    plt.grid(True)
    # Ensure the "static" directory exists
    if not os.path.exists("static"):
        os.makedirs("static")

    # Save the plot
    plot_path = "static/energy_plot.png"
    plt.savefig(plot_path)
    plt.close()  # Close the plot to free memory

    return plot_path  # Return the path to the saved plot


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
    plt.ylabel('Load (kW)')
    plt.legend()
    plt.grid(True)
    
    # Ensure the "static" directory exists
    if not os.path.exists("static"):
        os.makedirs("static")

    # Save the plot
    plot_path = "static/load_plot.png"
    plt.savefig(plot_path)
    plt.close()  # Close the plot to free memory

    return plot_path  # Return the path to the saved plot