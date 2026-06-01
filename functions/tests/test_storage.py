"""Unit tests for storage helpers (bucket name, URL validation, compression)."""

import gzip

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


class TestCompressDecompress:
    def test_roundtrip(self):
        original = "a,b,c\n1,2,3\n4,5,6\n"
        compressed = storage._compress(original)
        assert isinstance(compressed, bytes)
        assert compressed != original.encode()
        assert storage._decompress(compressed) == original

    def test_compress_produces_valid_gzip(self):
        data = "col1,col2\nfoo,bar\n"
        compressed = storage._compress(data)
        assert gzip.decompress(compressed).decode() == data

    def test_decompress_plain_bytes_fallback(self):
        plain = "col1,col2\nfoo,bar\n".encode("utf-8")
        assert storage._decompress(plain) == plain.decode("utf-8")

    def test_compression_reduces_size_for_repetitive_data(self):
        repetitive = ("timestamp,value\n" + "2024-01-01,100.0\n" * 500)
        compressed = storage._compress(repetitive)
        assert len(compressed) < len(repetitive.encode("utf-8"))
