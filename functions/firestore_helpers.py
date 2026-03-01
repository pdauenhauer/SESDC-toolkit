"""Firestore read/write for project lastSimulationRun and storage URL (lazy import)."""


def save_last_simulation_run(user_id: str, project_id: str, run_id: int, paths: dict) -> None:
    """Update project doc with lastSimulationRun and lastSimulationStorageUrl (users/{uid}/projects/{pid})."""
    from google.cloud import firestore

    db = firestore.Client()
    ref = db.collection("users").document(user_id).collection("projects").document(project_id)
    storage_url = paths.get("hourly_simulation") or (next(iter(paths.values()), None) if paths else None)
    ref.set(
        {
            "lastSimulationRun": {"runId": run_id, "paths": paths},
            "lastSimulationStorageUrl": storage_url,
        },
        merge=True,
    )
    print("[save_last_simulation_run] Saved runId=", run_id, "storageUrl=", storage_url)


def get_last_simulation_run(user_id: str, project_id: str) -> dict | None:
    """Read lastSimulationRun from project doc; return { runId, paths } or None."""
    from google.cloud import firestore

    db = firestore.Client()
    ref = db.collection("users").document(user_id).collection("projects").document(project_id)
    doc = ref.get()
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    return data.get("lastSimulationRun")
