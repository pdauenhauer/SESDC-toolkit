"""Upload and download simulation CSVs in Google Cloud Storage (gzip-compressed)."""

import gzip
import os
import time


def get_storage_bucket_name():
    """Default GCS bucket for uploads (Firebase project bucket)."""
    bucket = os.environ.get("GCS_BUCKET")
    if bucket:
        return bucket
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "sesdc-toolkit2")
    return f"{project}.appspot.com"


def _compress(csv_str: str) -> bytes:
    return gzip.compress(csv_str.encode("utf-8"))


def _decompress(data: bytes) -> str:
    # Handle both compressed and legacy uncompressed blobs gracefully.
    try:
        return gzip.decompress(data).decode("utf-8")
    except gzip.BadGzipFile:
        return data.decode("utf-8")


def upload_csv(user_id: str, project_id: str, csv_str: str, suffix: str = "hourly") -> str:
    """Upload a gzip-compressed CSV string to GCS; return gs://bucket/path."""
    from google.cloud import storage

    bucket_name = get_storage_bucket_name()
    ts = int(time.time())
    blob_path = f"simulations/{user_id}/{project_id}/{ts}_{suffix}.csv.gz"
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.content_encoding = "gzip"
    blob.upload_from_string(
        _compress(csv_str),
        content_type="text/csv; charset=utf-8",
    )
    gs_url = f"gs://{bucket_name}/{blob_path}"
    print("[upload_csv] Uploaded", gs_url)
    return gs_url


def upload_csv_bundle(
    user_id: str, project_id: str, run_id: int, csv_dict: dict
) -> dict[str, str]:
    """Upload all CSVs in csv_dict to GCS (gzip-compressed) under the same run_id; return key -> gs:// path."""
    from google.cloud import storage

    bucket_name = get_storage_bucket_name()
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    paths = {}
    for key, csv_str in csv_dict.items():
        if csv_str is None or len(str(csv_str)) == 0:
            continue
        blob_path = f"simulations/{user_id}/{project_id}/{run_id}_{key}.csv.gz"
        blob = bucket.blob(blob_path)
        blob.content_encoding = "gzip"
        blob.upload_from_string(
            _compress(csv_str),
            content_type="text/csv; charset=utf-8",
        )
        paths[key] = f"gs://{bucket_name}/{blob_path}"
    print("[upload_csv_bundle] Uploaded", len(paths), "files")
    return paths


def download_csv(gs_url: str) -> str:
    """Download a CSV from GCS by gs:// URL; handles both gzip and plain blobs."""
    from google.cloud import storage

    if not gs_url.startswith("gs://"):
        raise ValueError("Invalid gs URL: " + gs_url)
    parts = gs_url.removeprefix("gs://").split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1] if len(parts) > 1 else ""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    # Download raw bytes so we control decompression regardless of content_encoding.
    raw = blob.download_as_bytes()
    return _decompress(raw)
