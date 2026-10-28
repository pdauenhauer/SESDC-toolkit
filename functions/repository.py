"""Repository & Adapter implementations for simulation persistence (offline & GCP)."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from contracts import is_on_demand_key
from firestore_helpers import get_last_simulation_run, save_last_simulation_run
from storage import download_csv, upload_csv_bundle


def _select_paths(paths: dict[str, str], keys: list[str] | None) -> dict[str, str]:
    """The stored paths to return: `keys` if given, else all but the per-year hourly tables."""
    if keys:
        return {k: v for k, v in paths.items() if k in keys}
    return {k: v for k, v in paths.items() if not is_on_demand_key(k)}


class InMemorySimulationRepository:
    """Offline in-memory repository implementing `SimulationRepositoryProtocol` for unit tests."""

    def __init__(self) -> None:
        self._runs: dict[tuple[str, str], dict[str, Any]] = {}
        self._blobs: dict[str, str] = {}

    def save_run(
        self,
        user_id: str,
        project_id: str,
        run_id: int,
        csv_bundle: dict[str, str | None],
        summary_kpis: dict[str, Any] | None = None,
        tier1_summaries: dict[str, Any] | None = None,
    ) -> str | None:
        paths: dict[str, str] = {}
        for key, csv_str in csv_bundle.items():
            if csv_str is not None and len(str(csv_str)) > 0:
                gs_url = f"gs://memory-bucket/simulations/{user_id}/{project_id}/{run_id}_{key}.csv.gz"
                self._blobs[gs_url] = csv_str
                paths[key] = gs_url

        storage_url = paths.get("hourly_simulation") or (next(iter(paths.values()), None) if paths else None)
        record: dict[str, Any] = {
            "runId": run_id,
            "paths": paths,
            "storageUrl": storage_url,
        }
        if summary_kpis is not None:
            record["summaryKpis"] = summary_kpis
        if tier1_summaries is not None:
            record["tier1Summaries"] = tier1_summaries

        self._runs[(user_id, project_id)] = record
        return storage_url

    def get_last_run_metadata(self, user_id: str, project_id: str) -> dict[str, Any] | None:
        return self._runs.get((user_id, project_id))

    def get_stored_csv_bundle(
        self, user_id: str, project_id: str, keys: list[str] | None = None
    ) -> dict[str, str]:
        record = self._runs.get((user_id, project_id))
        if not record or not record.get("paths"):
            return {}
        paths = _select_paths(record["paths"], keys)
        return {key: self._blobs[gs_url] for key, gs_url in paths.items() if gs_url in self._blobs}


class GcpSimulationRepository:
    """Production GCP repository delegating to Cloud Firestore and Cloud Storage."""

    def save_run(
        self,
        user_id: str,
        project_id: str,
        run_id: int,
        csv_bundle: dict[str, str | None],
        summary_kpis: dict[str, Any] | None = None,
        tier1_summaries: dict[str, Any] | None = None,
    ) -> str | None:
        paths = upload_csv_bundle(user_id, project_id, run_id, csv_bundle)
        save_last_simulation_run(
            user_id,
            project_id,
            run_id,
            paths,
            summary_kpis=summary_kpis,
            tier1_summaries=tier1_summaries,
        )
        return paths.get("hourly_simulation")

    def get_stored_csv_bundle(
        self, user_id: str, project_id: str, keys: list[str] | None = None
    ) -> dict[str, str]:
        last_run = get_last_simulation_run(user_id, project_id)
        if not last_run or not last_run.get("paths"):
            return {}

        paths = _select_paths(last_run["paths"], keys)
        if not paths:
            return {}

        def _fetch_one(key: str, gs_url: str) -> tuple[str, str | None]:
            try:
                return key, download_csv(gs_url)
            except Exception as e:
                print("[GcpSimulationRepository] Failed to download", key, str(e))
                return key, None

        csv_bundle: dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=min(len(paths), 8)) as executor:
            futures = {executor.submit(_fetch_one, key, gs_url): key for key, gs_url in paths.items()}
            for future in as_completed(futures):
                key, csv_str = future.result()
                if csv_str is not None:
                    csv_bundle[key] = csv_str
        return csv_bundle
