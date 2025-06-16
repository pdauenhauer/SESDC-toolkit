import numpy as np
import matplotlib.pyplot as plt

inflation_rate = 0.03

# Battery financial parameters
battery_capex = 1000
battery_opex = 50
battery_replacement_cost = 500
battery_lifespan = 10

# Generator financial parameters
generator_capex = 5000
generator_opex = 200
generator_replacement_cost = 2500
generator_lifespan = 10

# Solar financial parameters
solar_capex = 8000
solar_opex = 300
solar_replacement_cost = 4000
solar_lifespan = 10

# Wind financial parameters
wind_capex = 12000
wind_opex = 400
wind_replacement_cost = 6000
wind_lifespan = 10

def calculate_20_year_expenses(inflation_rate, capex, opex, replacement_cost, lifespan, years=20):
    """
    Calculate the total expenses over 20 years considering inflation.
    """
    expenses = np.zeros(years)
    expenses[0] = capex  # Initial investment at year 0
    for year in range(years):
        expenses[year] += opex  # OPEX every year
        # Add replacement cost at the correct years (not year 0)
        if lifespan and year > 0 and year % lifespan == 0:
            inflated_replacement = replacement_cost * ((1 + inflation_rate) ** year)
            expenses[year] += inflated_replacement
    return expenses

def plot_20yr_financials(years, battery, generator, solar, wind):
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
    plt.savefig('20_year_financial_expenses.png')
    plt.close()
    

years = np.arange(20)
battery = calculate_20_year_expenses(inflation_rate, battery_capex, battery_opex, battery_replacement_cost, battery_lifespan)
generator = calculate_20_year_expenses(inflation_rate, generator_capex, generator_opex, generator_replacement_cost, generator_lifespan)
solar = calculate_20_year_expenses(inflation_rate, solar_capex, solar_opex, solar_replacement_cost, solar_lifespan)
wind = calculate_20_year_expenses(inflation_rate, wind_capex, wind_opex, wind_replacement_cost, wind_lifespan)

plot_20yr_financials(years, battery, generator, solar, wind)