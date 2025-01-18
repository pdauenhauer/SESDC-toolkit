import requests
import io
import csv

def fetch_solar_data(latitude, longitude, api_key="10UvHdJCpgr4lalNH8LeBaqxlamNu6yU2taNlG3J", year="2022", interval="60"):
    url = "https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-msg-v1-0-0-download.csv"

    # Define the WKT point using the provided coordinates
    wkt = f"POINT({longitude} {latitude})"

    # Set up the parameters
    params = {
        "api_key": api_key,
        "wkt": wkt,
        "attributes": "dni,ghi,wind_speed,air_temperature",  # attributes to download
        "names": year,  # Year
        "utc": "false",  # Local time instead of UTC
        "leap_day": "false",  # Exclude leap day
        "interval": interval,  # Data resolution interval
        "full_name": "Jose Andrade",  # Your full name
        "email": "andradejose455@gmail.com",  # Your email address
        "mailing_list": "false"  # Don't add to the mailing list
    }

    response = requests.get(url, params=params)

    if response.status_code == 200:
        print("Request successful. Printing data below:\n")
        # Reads the CSV content from the response
        csv_content = io.StringIO(response.text)
        csv_reader = csv.reader(csv_content)

        # Prints the headers
        headers = next(csv_reader)
        print(headers)

        # Prints each row of the data
        for row in csv_reader:
            print(row)
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

# Example of calling the function with coordinates for Ndola, Zambia
fetch_solar_data(28.6498, 12.9906)
