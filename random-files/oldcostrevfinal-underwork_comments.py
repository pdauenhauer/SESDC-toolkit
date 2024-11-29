import numpy as np

def simulation_with_turbine_and_diesel_summary():
    np.random.seed()

    # Constants and Parameters for Wind Turbine
    rated_capacity = 10  # kW
    hours_in_month = 730  # Approximate number of hours in a month
    initial_cost = 15000  # USD
    annual_operational_cost = 200  # Base annual operational cost in USD
    wages_for_workers = 1000  # Wages for workers in USD
    annual_operational_cost += wages_for_workers
    price_per_kWh = 0.07821  # USD
    cost_to_replace_rotor = 1500  # USD
    cost_to_repair_blade = 500  # USD
    years_of_operation = 20
    blade_replacement_interval = 12
    rotor_replacement_interval = 9

    # Diesel Generator Parameters
    diesel_generator_capacity = 5  # kW
    diesel_fuel_cost = 2.0  # USD per gallon
    diesel_fuel_consumption_rate = 0.1  # Gallons per hour

    # Initialize simulation variables
    total_revenue = 0
    total_costs = initial_cost
    repair_reports = []
    yearly_reports = []
    diesel_usage_details = []
    energy_covered_by_diesel = {}

    month_names = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December']

    for year in range(1, years_of_operation + 1):
        annual_revenue = 0
        annual_diesel_costs = 0
        monthly_diesel_usage = {}
        energy_covered_by_diesel[year] = {}  # Initialize for the year

        for month in range(1, 13):
            turbine_output = rated_capacity * hours_in_month * np.random.uniform(0.2, 0.8)
            system_demand = rated_capacity * hours_in_month
            
            energy_shortfall = system_demand - turbine_output
            
            significant_shortfall_threshold = 0.3 * system_demand
            if energy_shortfall > significant_shortfall_threshold:
                generator_operation_hours = min(energy_shortfall / diesel_generator_capacity, hours_in_month)
                monthly_diesel_cost = generator_operation_hours * diesel_fuel_consumption_rate * diesel_fuel_cost
                annual_diesel_costs += monthly_diesel_cost
                monthly_diesel_usage[month] = monthly_diesel_cost
                # Calculate and store the energy covered by the diesel generator
                energy_covered_by_diesel[year][month] = generator_operation_hours * diesel_generator_capacity
            else:
                generator_operation_hours = 0
                monthly_diesel_usage[month] = 0
                energy_covered_by_diesel[year][month] = 0  # No energy covered because the generator did not run
            
            monthly_revenue = turbine_output * price_per_kWh + (generator_operation_hours * diesel_generator_capacity * price_per_kWh)
            annual_revenue += monthly_revenue

        total_revenue += annual_revenue
        total_costs += annual_operational_cost + annual_diesel_costs

        # Diesel Generator Usage Summary for the Year
        if monthly_diesel_usage:
            used_months = ", ".join([month_names[m-1] for m in monthly_diesel_usage.keys() if monthly_diesel_usage[m] > 0])
            diesel_usage_details.append(f"Year {year}: Diesel generator used in {used_months}, costing a total of ${annual_diesel_costs:.2f}.")

        # Maintenance and repairs
        if year % rotor_replacement_interval == 0:
            total_costs += cost_to_replace_rotor
            repair_reports.append(f"Year {year}: Rotor replaced at a cost of ${cost_to_replace_rotor}.")
        if year % blade_replacement_interval == 0:
            total_costs += cost_to_repair_blade
            repair_reports.append(f"Year {year}: Blade repaired at a cost of ${cost_to_repair_blade}.")

        # Yearly financial report
        net_revenue_for_year = total_revenue - total_costs
        yearly_reports.append(f"Year {year}: Costs - ${total_costs:.2f}, Revenue - ${total_revenue:.2f}, Net - ${net_revenue_for_year:.2f}")

    final_net_revenue = total_revenue - total_costs
    yearly_reports.append(f"Final Net Revenue after {years_of_operation} years: ${final_net_revenue:.2f}")

    # Reporting the energy covered by the diesel generator
    for year, months in energy_covered_by_diesel.items():
        for month, energy in months.items():
            if energy > 0:
                print(f"Year {year} Month {month_names[month-1]}: Diesel generator covered {energy:.2f} kWh of energy shortfall.")

    return repair_reports, yearly_reports, diesel_usage_details

# Running the simulation
repair_reports, yearly_reports, diesel_usage_details = simulation_with_turbine_and_diesel_summary()

print("Repair Events:")
for report in repair_reports:
    print(report)

print("\nYearly Financial Reports:")
for report in yearly_reports:
    print(report)

print("\nDiesel Generator Usage and Cost Summary:")
for detail in diesel_usage_details:
    print(detail)
    