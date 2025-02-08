import requests
import io
import csv
import math

def is_valid_number(value):
    try:
        float(value)
        return True
    except ValueError:
        return False

def calculate_gti(dni, ghi, solar_zenith_angle):
    if not (is_valid_number(dni) and is_valid_number(ghi) and is_valid_number(solar_zenith_angle)):
        return None  # Skip invalid rows

    # Convert zenith angle to radians
    zenith_rad = math.radians(float(solar_zenith_angle))

    # GTI calculation using the given formula
    gti = float(dni) * (1 - math.cos(zenith_rad)) + float(ghi)

    return max(gti, 0)  # Ensure GTI is not negative

def fetch_solar_data(latitude, longitude, api_key="10UvHdJCpgr4lalNH8LeBaqxlamNu6yU2taNlG3J", year="2022", interval="60"):
    url = "https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-msg-v1-0-0-download.csv"

    wkt = f"POINT({longitude} {latitude})"

    params = {
        "api_key": api_key,
        "wkt": wkt,
        "attributes": "dni,ghi,wind_speed,air_temperature,solar_zenith_angle,dhi",
        "names": year,
        "utc": "false",
        "leap_day": "false",
        "interval": interval,
        "full_name": "Jose Andrade",
        "email": "andradejose455@gmail.com",
        "mailing_list": "false"
    }

    response = requests.get(url, params=params)

    if response.status_code == 200:
        csv_content = io.StringIO(response.text)
        csv_reader = csv.reader(csv_content)

        rows = list(csv_reader)

        # Find the starting point of the actual data (first row containing 'Year')
        start_row = 0
        for idx, row in enumerate(rows):
            if row and row[0] == 'Year':
                start_row = idx
                break

        # Extract headers
        headers = rows[start_row]

        # lines to include/exclude DNI and Solar Zenith Angle
        include_dni = False  # Set to True to include DNI
        include_zenith = False  # Set to True to include Solar Zenith Angle

        # Filter headers based on include variables
        filtered_headers = [h for h in headers if (include_dni or h != 'DNI') and (include_zenith or h != 'Solar Zenith Angle')]
        filtered_headers.append('GTI')  # Add 'GTI' column

        print("Headers:", filtered_headers)  # Print modified headers

        updated_rows = []
        print("Printing all rows of actual data with GTI:")
        for row in rows[start_row+1:]:  # Skip metadata and header rows
            if len(row) >= 11:  # Ensure there are enough columns in the row
                dni, ghi, wind_speed, air_temperature, solar_zenith_angle, dhi = row[5:11]  # Adjusted indices based on data

                gti = calculate_gti(dni, ghi, solar_zenith_angle)

                if gti is not None:  # Skip invalid rows
                    selected_row = []
                    for i, col_name in enumerate(headers):
                        if (include_dni or col_name != 'DNI') and (include_zenith or col_name != 'Solar Zenith Angle'):
                            selected_row.append(row[i])
                    selected_row.append(str(gti))  # Add GTI to the row

                    print(selected_row)  # Print each row based on include variables
                    updated_rows.append(selected_row)

        # Save updated CSV with filtered headers
        with open("solar_data_with_gti.csv", "w", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(filtered_headers)  # Write filtered headers
            writer.writerows(updated_rows)  # Write updated rows

        print("Updated CSV file saved as 'solar_data_with_gti.csv'.")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

# Example function call
fetch_solar_data(28.6498, 12.9906)
