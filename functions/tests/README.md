# Functions unit tests

Unit tests for the Cloud Functions helpers: `utils`, `storage`, and `firestore_helpers`.

## Run

From repo root:

```bash
npm run test:functions
```

Or from `functions/`:

```bash
cd functions
pip install -r requirements.txt 
python -m pytest tests/ -v
```

## What’s tested

- **utils** — `safe_float`, `safe_int` (defaults, valid/invalid input).
- **storage** — `get_storage_bucket_name()` (env `GCS_BUCKET` / `GOOGLE_CLOUD_PROJECT`); `download_csv()` raises `ValueError` for non-`gs://` URLs.
- **firestore_helpers** — `save_last_simulation_run` and `get_last_simulation_run` with mocked Firestore (skipped if `google-cloud-firestore` is not installed).

## Note

Firestore tests are skipped when `google.cloud.firestore` cannot be imported (e.g. running without the functions venv). Install `functions/requirements.txt` to run them.
