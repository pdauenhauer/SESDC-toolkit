import numpy as np
import matplotlib.pyplot as plt

# Lambda values
LAMBDA_ROTOR = 3
LAMBDA_BLADE = 17

def record_replacement_years_adjusted(n_cases=1000):
    rotor_replacements = []
    blade_replacements = []

    for _ in range(n_cases):
        rotor_intervals = []
        blade_intervals = []

        year_rotor, year_blade = 0, 0
        while year_rotor <= 100 * LAMBDA_ROTOR or year_blade <= 100 * LAMBDA_BLADE:
            rotor_interval = np.random.exponential(scale=LAMBDA_ROTOR)
            blade_interval = np.random.exponential(scale=LAMBDA_BLADE)
            
            year_rotor += rotor_interval
            year_blade += blade_interval
            
            rotor_intervals.append(rotor_interval)
            blade_intervals.append(blade_interval)
        
        rotor_replacements.extend(rotor_intervals)
        blade_replacements.extend(blade_intervals)

    return rotor_replacements, blade_replacements

def plot_exponential_cdf_values(data, title):
    lambda_value = 1 / np.mean(data)  # Calculate the rate parameter (lambda) for the exponential distribution
    x = np.linspace(0, 50, 1000)  # Generate 1000 points between 0 and 50 for the x-axis
    
    # Calculate the CDF for an exponential distribution
    cdf = 1 - np.exp(-lambda_value * x)
    
    plt.figure(figsize=(10, 6))
    plt.plot(x, cdf, label='Exponential CDF')
    plt.axvline(x=1/lambda_value, color='r', linestyle='--', label=f'Mean = {1/lambda_value:.2f}')
    
    plt.title(title)
    plt.xlabel('Years')
    plt.ylabel('Probability')
    plt.legend()
    plt.ylim(bottom=0, top=1)  # Set the limits for the y-axis from 0 to 1 since CDF values range from 0 to 1
    plt.xlim(left=0)  # Ensure x-axis starts from 0 for clarity
    plt.grid(True)  # Grid for better readability of the plot
    
    plt.show()  # Display the plot

# Ensure reproducibility of the random values
np.random.seed()  # Use a fixed seed to get the same results every time


rotor_replacements, blade_replacements = record_replacement_years_adjusted()

# Plot for Rotor Replacements with CDF values
plot_exponential_cdf_values(rotor_replacements, 'Exponential CDF of Rotor Replacement Intervals')

# Plot for Blade Replacements with CDF values
plot_exponential_cdf_values(blade_replacements, 'Exponential CDF of Blade Repair Intervals')