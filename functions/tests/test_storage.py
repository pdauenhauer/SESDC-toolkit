"""Unit tests for storage helpers (bucket name and URL validation; no real GCS)."""

import pytest

import storage


class TestGetStorageBucketName:
    def test_uses_gcs_bucket_env_when_set(self, monkeypatch):
        monkeypatch.setenv("GCS_BUCKET", "my-custom-bucket")
        monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
        assert storage.get_storage_bucket_name() == "my-custom-bucket"

    def test_falls_back_to_project_appspot(self, monkeypatch):
        monkeypatch.delenv("GCS_BUCKET", raising=False)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "my-project")
        assert storage.get_storage_bucket_name() == "my-project.appspot.com"

    def test_default_project_when_no_env(self, monkeypatch):
        monkeypatch.delenv("GCS_BUCKET", raising=False)
        monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
        assert storage.get_storage_bucket_name() == "sesdc-toolkit2.appspot.com"


class TestDownloadCsv:
    def test_invalid_gs_url_raises(self):
        with pytest.raises(ValueError, match="Invalid gs URL"):
            storage.download_csv("https://example.com/file.csv")
        with pytest.raises(ValueError, match="Invalid gs URL"):
            storage.download_csv("not-a-url")
