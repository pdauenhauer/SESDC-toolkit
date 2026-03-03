"""Unit tests for firestore_helpers (mocked Firestore)."""

from unittest.mock import MagicMock, patch

import pytest

try:
    import google.cloud.firestore as _firestore_module
except ImportError:
    _firestore_module = None

import firestore_helpers


def _make_db_with_ref(mock_ref):
    mock_db = MagicMock()
    mock_db.collection.return_value.document.return_value.collection.return_value.document.return_value = mock_ref
    return mock_db


@pytest.mark.skipif(_firestore_module is None, reason="google-cloud-firestore not installed")
class TestSaveLastSimulationRun:
    @patch("google.cloud.firestore.Client")
    def test_writes_last_simulation_run_and_storage_url(self, mock_client):
        mock_ref = MagicMock()
        mock_client.return_value = _make_db_with_ref(mock_ref)

        firestore_helpers.save_last_simulation_run(
            "user1", "proj1", run_id=12345,
            paths={"hourly_simulation": "gs://b/path/hourly.csv", "daily_averages": "gs://b/path/daily.csv"},
        )

        mock_ref.set.assert_called_once()
        call_kw = mock_ref.set.call_args
        assert call_kw[1].get("merge") is True
        data = call_kw[0][0]
        assert data["lastSimulationRun"]["runId"] == 12345
        assert data["lastSimulationRun"]["paths"] == {
            "hourly_simulation": "gs://b/path/hourly.csv",
            "daily_averages": "gs://b/path/daily.csv",
        }
        assert data["lastSimulationStorageUrl"] == "gs://b/path/hourly.csv"

    @patch("google.cloud.firestore.Client")
    def test_storage_url_fallback_when_no_hourly(self, mock_client):
        mock_ref = MagicMock()
        mock_client.return_value = _make_db_with_ref(mock_ref)

        firestore_helpers.save_last_simulation_run(
            "u", "p", run_id=1,
            paths={"daily_averages": "gs://b/daily.csv"},
        )

        data = mock_ref.set.call_args[0][0]
        assert data["lastSimulationStorageUrl"] == "gs://b/daily.csv"

    @patch("google.cloud.firestore.Client")
    def test_storage_url_none_when_paths_empty(self, mock_client):
        mock_ref = MagicMock()
        mock_client.return_value = _make_db_with_ref(mock_ref)

        firestore_helpers.save_last_simulation_run("u", "p", run_id=1, paths={})

        data = mock_ref.set.call_args[0][0]
        assert data["lastSimulationStorageUrl"] is None


@pytest.mark.skipif(_firestore_module is None, reason="google-cloud-firestore not installed")
class TestGetLastSimulationRun:
    @patch("google.cloud.firestore.Client")
    def test_returns_none_when_doc_missing(self, mock_client):
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_doc
        mock_client.return_value = _make_db_with_ref(mock_ref)

        result = firestore_helpers.get_last_simulation_run("user1", "proj1")

        assert result is None

    @patch("google.cloud.firestore.Client")
    def test_returns_last_run_when_present(self, mock_client):
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "lastSimulationRun": {"runId": 99, "paths": {"hourly_simulation": "gs://b/h.csv"}},
        }
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_doc
        mock_client.return_value = _make_db_with_ref(mock_ref)

        result = firestore_helpers.get_last_simulation_run("user1", "proj1")

        assert result == {"runId": 99, "paths": {"hourly_simulation": "gs://b/h.csv"}}

    @patch("google.cloud.firestore.Client")
    def test_returns_none_when_doc_has_no_last_simulation_run(self, mock_client):
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {}
        mock_ref = MagicMock()
        mock_ref.get.return_value = mock_doc
        mock_client.return_value = _make_db_with_ref(mock_ref)

        result = firestore_helpers.get_last_simulation_run("user1", "proj1")

        assert result is None
