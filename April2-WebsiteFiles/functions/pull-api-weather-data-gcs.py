import requests
import io
import csv
import pandas as pd
from google.cloud import storage
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = 'sesdc-function-test-d52b58eeb730.json'

def fetch_solar_data(latitude, longitude, userId, projectId, api_key="TC1RGLjNIwUJrOGGyPvg4Fgq182jznjbbeIfZT5f", year="2022", interval="30"):
    url = "https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-msg-v1-0-0-download.csv"

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

        additional_columns = df[['DNI', 'Temperature']]

        additional_columns = additional_columns.rename(columns={
            'DNI': 'Irradiance (W/m2)',
            'Temperature': 'Temp_C (oC)'
        })

        test_df = pd.read_csv('test.csv')

        relevant_columns = ['load_values']
        relevant_data = test_df[relevant_columns]

        new_df = pd.concat([timestamp_columns['Datetime'], relevant_data, additional_columns], axis=1)

        csv_buffer = io.StringIO()
        new_df.to_csv(csv_buffer, index=False)
        csv_data = csv_buffer.getvalue().encode('utf-8')

        bucket_name = 'sesdc-csv-bucket'
        blob_name = f'{userId}/{projectId}/weather_data.csv'

        client = storage.Client()
        bucket = client.bucket(bucket_name)

        blobs = bucket.list_blobs(prefix=f"{userId}/{projectId}/")
        if not any(blobs):
            bucket.blob(f"{userId}/{projectId}/").upload_from_string('')

        blob = bucket.blob(blob_name)
        blob.upload_from_string(csv_data, content_type="text/csv")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

# Example of calling the function with coordinates for Ndola, Zambia
fetch_solar_data(28.6498, 12.9906, 'L3k0g3RqonU5NqkDVjhuNLKnjS83', '5opqE7uSRrGGJFgS226u')
