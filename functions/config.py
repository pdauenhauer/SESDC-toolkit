"""CORS settings for Cloud Functions."""

from firebase_functions import options

cors_settings = options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "OPTIONS"],
)
