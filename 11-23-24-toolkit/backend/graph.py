import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import os


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

def generate_power_graph_with_zoom(time_points, solar_power_full):
    """
    Generate an interactive solar power graph with zooming using Plotly.

    Parameters:
    - time_points: Array representing time points.
    - solar_power_full: A numpy array representing the load profile.
    """
    fig = go.Figure()

    # Add the solar power generation trace
    fig.add_trace(go.Scatter(
        x=time_points,
        y=solar_power_full,
        mode='lines+markers',
        name='Solar Power Generation'
    ))

    # Update layout to enable zooming
    fig.update_layout(
        title="Interactive Micro-Grid Solar Power Simulation with Zoom",
        xaxis_title="Time (hours)",
        yaxis_title="Power (kW)",
        template="plotly_dark",
        xaxis=dict(
            rangeslider=dict(visible=True),  # Enable the range slider for zooming
            type="linear"
        ),
        yaxis=dict(
            fixedrange=False  # Allow zooming on the Y-axis
        )
    )

    # Save the interactive graph as an HTML file
    plot_path = "static/interactive_energy_plot_with_zoom.html"
    fig.write_html(plot_path)

    return plot_path  # Return the path to the saved HTML file