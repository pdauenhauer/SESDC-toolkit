from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os

from calculations import process_csv, panel_losses, coef, STCIrr, STCTemp, calculate_solar_energy
from graph import generate_power_graph_with_zoom


app = Flask(__name__)

#enable CORS for all routes
CORS(app)

@app.route("/upload", methods=["POST"])
def index():
    return "Backend is running!"

@app.route("/upload", methods=["POST"])
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:
        # Process the CSV
        df = process_csv(file)

        # Extract relevant columns
        df["Irradiance (W/m2)"] = pd.to_numeric(df["Irradiance (W/m2)"], errors="coerce")
        df["Temp_C (oC)"] = pd.to_numeric(df["Temp_C (oC)"], errors="coerce")

        # Calculate solar power
        solar_power_full = calculate_solar_energy(
            df["Irradiance (W/m2)"],
            df["Temp_C (oC)"],
            panel_name_plate_W=680,
            losses=panel_losses["loss_value"],
            coef=coef,
            STCIrr=STCIrr,
            STCTemp=STCTemp
        )

        # Generate the interactive graph with zooming
        time_points = np.arange(0, 47)
        solar_power_test = solar_power_full[:47]
        plot_path = generate_power_graph_with_zoom(time_points, solar_power_test)

        return jsonify({
            "message": "Graph with zoom generated!",
            "plot_url": plot_path
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)


if __name__ == "__main__":
    app.run(debug=True)