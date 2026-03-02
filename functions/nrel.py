"""Fetch NREL NSRDB weather/irradiance data (lazy imports)."""


def fetch_nrel_data(
    latitude,
    longitude,
    api_key="5gZjfefi1adVzrZPYNirDhSk24BQcDEaYyWnxPdy",
    year="2022",
    interval="30",
):
    """Fetch NREL weather/irradiance data and return a parsed DataFrame.

    Columns returned:
        Datetime, Irradiance (W/m2), Temp_C (oC), Wind_speed(m/s)
    Returns None on failure.
    """
    import io
    import requests
    import pandas as pd

    url = "https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-msg-v1-0-0-download.csv"
    wkt = f"POINT({longitude} {latitude})"
    params = {
        "api_key": api_key,
        "wkt": wkt,
        "attributes": "dni,wind_speed,air_temperature",
        "names": year,
        "utc": "false",
        "leap_day": "false",
        "interval": interval,
        "full_name": "Peter Dauenhauer",
        "email": "peter.dauenhauer@gmail.com",
    }

    print("[fetch_nrel_data] Requesting NREL", "lat=", latitude, "lon=", longitude)
    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(
            "[fetch_nrel_data] NREL failed",
            "status=", response.status_code,
            "body=", response.text[:500],
        )
        return None

    print("[fetch_nrel_data] NREL OK, parsing CSV...")
    csv_data = io.StringIO(response.text)
    df = pd.read_csv(csv_data, skiprows=2)

    ts = df.iloc[:, :5].copy()
    ts["Timestamp"] = pd.to_datetime(ts[["Year", "Month", "Day", "Hour", "Minute"]])
    ts["Datetime"] = ts["Timestamp"].dt.strftime("%m/%d/%Y %H:%M")

    result = pd.DataFrame()
    result["Datetime"] = ts["Datetime"].values
    result["Irradiance (W/m2)"] = df["DNI"].values
    result["Temp_C (oC)"] = df["Temperature"].values
    result["Wind_speed(m/s)"] = df["Wind Speed"].values

    print("[fetch_nrel_data] Parsed", len(result), "rows")
    return result
