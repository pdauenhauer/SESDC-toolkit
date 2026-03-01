"""Upload and download simulation CSVs in Google Cloud Storage."""

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


def upload_csv_bundle(
    user_id: str, project_id: str, run_id: int, csv_dict: dict
) -> dict[str, str]:
    """Upload all CSVs in csv_dict to GCS under the same run_id; return key -> gs:// path."""
    from google.cloud import storage

    bucket_name = get_storage_bucket_name()
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    paths = {}
    for key, csv_str in csv_dict.items():
        if csv_str is None or len(str(csv_str)) == 0:
            continue
        blob_path = f"simulations/{user_id}/{project_id}/{run_id}_{key}.csv"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(
            csv_str,
            content_type="text/csv; charset=utf-8",
        )
        paths[key] = f"gs://{bucket_name}/{blob_path}"
    print("[upload_csv_bundle] Uploaded", len(paths), "files")
    return paths


def download_csv(gs_url: str) -> str:
    """Download a single CSV from GCS by gs:// URL; return content as string."""
    if not gs_url.startswith("gs://"):
        raise ValueError("Invalid gs URL: " + gs_url)
    from google.cloud import storage as gcs_storage

    parts = gs_url.removeprefix("gs://").split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1] if len(parts) > 1 else ""
    client = gcs_storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    return blob.download_as_string().decode("utf-8")
