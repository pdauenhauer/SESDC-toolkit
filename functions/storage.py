"""Upload simulation CSVs to Google Cloud Storage."""

import os
import time


def get_storage_bucket_name():
    """Default GCS bucket for uploads (Firebase project bucket)."""
    bucket = os.environ.get("GCS_BUCKET")
    if bucket:
        return bucket
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "sesdc-toolkit2")
    return f"{project}.appspot.com"


def upload_csv(user_id: str, project_id: str, csv_str: str, suffix: str = "hourly") -> str:
    """Upload a CSV string to GCS; return gs://bucket/path."""
    from google.cloud import storage

    bucket_name = get_storage_bucket_name()
    ts = int(time.time())
    blob_path = f"simulations/{user_id}/{project_id}/{ts}_{suffix}.csv"
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.upload_from_string(
        csv_str,
        content_type="text/csv; charset=utf-8",
    )
    gs_url = f"gs://{bucket_name}/{blob_path}"
    print("[upload_csv] Uploaded", gs_url)
    return gs_url
