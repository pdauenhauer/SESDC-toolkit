"""Fetch NLR NSRDB weather/irradiance data (lazy imports)."""

import os
from pathlib import Path


def _resolve_nlr_api_key(explicit: str | None) -> str | None:
    """Use explicit key, else NLR_API_KEY from env (functions/.env loaded locally via dotenv)."""
    if explicit:
        return explicit
    try:
        from dotenv import load_dotenv

        load_dotenv(Path(__file__).resolve().parent / ".env")
    except ImportError:
        pass
    return os.environ.get("NLR_API_KEY")


def fetch_nlr_data(
    latitude,
    longitude,
    api_key: str | None = None,
    year="2022",
    interval="30",
):
    """Fetch NLR weather/irradiance data and return a parsed DataFrame.

    Columns returned:
        Datetime, Irradiance (W/m2), Temp_C (oC), Wind_speed(m/s)
    Returns None on failure or if NLR_API_KEY is unset.
    """
    import io
    import requests
    import pandas as pd

    key = _resolve_nlr_api_key(api_key)
    if not key:
        print("[fetch_nlr_data] Missing NLR_API_KEY (set in functions/.env or Cloud Function env)")
        return None

    url = "https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-msg-v1-0-0-download.csv"
    wkt = f"POINT({longitude} {latitude})"
    params = {
        "api_key": key,
        "wkt": wkt,
        "attributes": "dni,wind_speed,air_temperature",
        "names": year,
        "utc": "false",
        "leap_day": "false",
        "interval": interval,
        "full_name": "Peter Dauenhauer",
        "email": "peter.dauenhauer@gmail.com",
    }

    print("[fetch_nlr_data] Requesting NLR", "lat=", latitude, "lon=", longitude)
    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(
            "[fetch_nlr_data] NLR failed",
            "status=", response.status_code,
            "body=", response.text[:500],
        )
        return None

    print("[fetch_nlr_data] NLR OK, parsing CSV...")
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

    print("[fetch_nlr_data] Parsed", len(result), "rows")
    return result
