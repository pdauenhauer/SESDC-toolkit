"""The simulation assumes one weather row per hour; sub-hourly data must be averaged."""

import os
import sys

import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from nlr import to_hourly  # noqa: E402


def _frame(freq, periods):
    ts = pd.Series(pd.date_range("2022-01-01 00:00", periods=periods, freq=freq))
    df = pd.DataFrame({
        "Datetime": ts.dt.strftime("%m/%d/%Y %H:%M"),
        "Irradiance (W/m2)": range(periods),
        "Temp_C (oC)": [20.0] * periods,
        "Wind_speed(m/s)": [5.0] * periods,
    })
    return df, ts


def test_half_hourly_is_averaged_to_hours():
    df, ts = _frame("30min", 48)
    out = to_hourly(df, ts)
    assert len(out) == 24
    assert out["Irradiance (W/m2)"].iloc[0] == 0.5  # mean of 0 and 1
    assert out["Datetime"].iloc[1] == "01/01/2022 01:00"


def test_hourly_is_unchanged():
    df, ts = _frame("h", 24)
    assert to_hourly(df, ts) is df
