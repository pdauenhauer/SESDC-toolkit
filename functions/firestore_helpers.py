"""Firestore read/write for project lastSimulationRun and storage URL (lazy import)."""

from __future__ import annotations

from typing import Any


def save_last_simulation_run(
    user_id: str,
    project_id: str,
    run_id: int,
    paths: dict,
    summary_kpis: dict[str, Any] | None = None,
    tier1_summaries: dict[str, Any] | None = None,
) -> None:
    """Update project doc with lastSimulationRun and lastSimulationStorageUrl (users/{uid}/projects/{pid})."""
    from google.cloud import firestore

    db = firestore.Client()
    ref = db.collection("users").document(user_id).collection("projects").document(project_id)
    storage_url = paths.get("hourly_simulation") or (next(iter(paths.values()), None) if paths else None)

    run_record: dict[str, Any] = {"runId": run_id, "paths": paths}
    if summary_kpis is not None:
        run_record["summaryKpis"] = summary_kpis
    if tier1_summaries is not None:
        run_record["tier1Summaries"] = tier1_summaries

    ref.set(
        {
            "lastSimulationRun": run_record,
            "lastSimulationStorageUrl": storage_url,
        },
        merge=True,
    )
    print("[save_last_simulation_run] Saved runId=", run_id, "storageUrl=", storage_url)


def get_last_simulation_run(user_id: str, project_id: str) -> dict | None:
    """Read lastSimulationRun from project doc; return { runId, paths, ... } or None."""
    from google.cloud import firestore

    db = firestore.Client()
    ref = db.collection("users").document(user_id).collection("projects").document(project_id)
    doc = ref.get()
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    return data.get("lastSimulationRun")
